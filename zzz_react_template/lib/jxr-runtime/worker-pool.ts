/**
 * JXR.js — Worker Pool Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Design: LavaFlow OS — Thermal Precision + Edge Command
 * Layer: Core Runtime / Worker Orchestration
 *
 * Architecture:
 *   WorkerPool manages a fleet of Web Workers for parallel task execution.
 *   Tasks are dispatched via a priority queue and results streamed back
 *   through a structured message protocol. Each worker is isolated with
 *   its own module scope, enabling true parallelism without shared state.
 *
 * Performance targets:
 *   - Task dispatch latency: <1ms
 *   - Worker spawn time: <5ms (pre-warmed pool)
 *   - Throughput: saturate all available CPU cores
 * ─────────────────────────────────────────────────────────────────────────────
 */

export type WorkerStatus = 'idle' | 'busy' | 'error' | 'terminated';
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

export interface WorkerTask<T = unknown, R = unknown> {
  id: string;
  type: string;
  payload: T;
  priority: TaskPriority;
  timestamp: number;
  resolve: (result: R) => void;
  reject: (error: Error) => void;
  timeoutMs?: number;
}

export interface WorkerMetrics {
  workerId: string;
  status: WorkerStatus;
  tasksCompleted: number;
  tasksFailed: number;
  avgLatencyMs: number;
  lastActiveAt: number;
  cpuLoad: number;
}

export interface PoolMetrics {
  totalWorkers: number;
  idleWorkers: number;
  busyWorkers: number;
  queueDepth: number;
  throughputPerSec: number;
  avgLatencyMs: number;
  totalTasksCompleted: number;
}

interface WorkerEntry {
  worker: Worker;
  status: WorkerStatus;
  currentTaskId: string | null;
  metrics: WorkerMetrics;
  latencyHistory: number[];
}

const PRIORITY_WEIGHTS: Record<TaskPriority, number> = {
  critical: 4,
  high: 3,
  normal: 2,
  low: 1,
};

/**
 * WorkerPool — Pre-warmed, priority-aware Web Worker fleet
 */
export class WorkerPool {
  private workers: Map<string, WorkerEntry> = new Map();
  private taskQueue: WorkerTask[] = [];
  private pendingTasks: Map<string, WorkerTask> = new Map();
  private metricsHistory: number[] = [];
  private throughputWindow: number[] = [];
  private readonly maxWorkers: number;
  private readonly workerScript: string;
  private taskCounter = 0;
  private listeners: Map<string, Set<(metrics: PoolMetrics) => void>> = new Map();

  constructor(workerScript: string, maxWorkers?: number) {
    this.workerScript = workerScript;
    this.maxWorkers = maxWorkers ?? Math.max(2, (navigator.hardwareConcurrency ?? 4) - 1);
    this.prewarm();
  }

  /** Pre-warm the pool to eliminate cold-start latency */
  private prewarm(): void {
    const initialCount = Math.min(2, this.maxWorkers);
    for (let i = 0; i < initialCount; i++) {
      this.spawnWorker();
    }
  }

  private spawnWorker(): string {
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const worker = new Worker(this.workerScript, { type: 'module' });

    const entry: WorkerEntry = {
      worker,
      status: 'idle',
      currentTaskId: null,
      latencyHistory: [],
      metrics: {
        workerId,
        status: 'idle',
        tasksCompleted: 0,
        tasksFailed: 0,
        avgLatencyMs: 0,
        lastActiveAt: Date.now(),
        cpuLoad: 0,
      },
    };

    worker.onmessage = (event) => this.handleWorkerMessage(workerId, event);
    worker.onerror = (error) => this.handleWorkerError(workerId, error);

    this.workers.set(workerId, entry);
    return workerId;
  }

  private handleWorkerMessage(workerId: string, event: MessageEvent): void {
    const { taskId, result, error, type } = event.data;
    const entry = this.workers.get(workerId);
    if (!entry) return;

    if (type === 'metrics') {
      entry.metrics.cpuLoad = event.data.cpuLoad ?? 0;
      return;
    }

    const task = this.pendingTasks.get(taskId);
    if (!task) return;

    const latency = Date.now() - task.timestamp;
    entry.latencyHistory.push(latency);
    if (entry.latencyHistory.length > 50) entry.latencyHistory.shift();

    entry.metrics.avgLatencyMs =
      entry.latencyHistory.reduce((a, b) => a + b, 0) / entry.latencyHistory.length;
    entry.metrics.lastActiveAt = Date.now();

    if (error) {
      entry.metrics.tasksFailed++;
      task.reject(new Error(error));
    } else {
      entry.metrics.tasksCompleted++;
      this.throughputWindow.push(Date.now());
      task.resolve(result);
    }

    this.pendingTasks.delete(taskId);
    entry.status = 'idle';
    entry.metrics.status = 'idle';
    entry.currentTaskId = null;

    this.emitMetrics();
    this.drainQueue();
  }

  private handleWorkerError(workerId: string, error: ErrorEvent): void {
    const entry = this.workers.get(workerId);
    if (!entry) return;

    entry.status = 'error';
    entry.metrics.status = 'error';

    if (entry.currentTaskId) {
      const task = this.pendingTasks.get(entry.currentTaskId);
      if (task) {
        task.reject(new Error(error.message));
        this.pendingTasks.delete(entry.currentTaskId);
      }
    }

    // Respawn worker
    entry.worker.terminate();
    this.workers.delete(workerId);
    this.spawnWorker();
    this.drainQueue();
  }

  private getIdleWorker(): WorkerEntry | null {
    for (const [, entry] of Array.from(this.workers.entries())) {
      if (entry.status === 'idle') return entry;
    }
    return null;
  }

  private drainQueue(): void {
    if (this.taskQueue.length === 0) return;

    // Sort by priority weight descending
    this.taskQueue.sort(
      (a, b) => PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority]
    );

    let idleWorker = this.getIdleWorker();

    // Scale up if needed and under cap
    if (!idleWorker && this.workers.size < this.maxWorkers) {
      const newId = this.spawnWorker();
      idleWorker = this.workers.get(newId) ?? null;
    }

    if (!idleWorker) return;

    const task = this.taskQueue.shift()!;
    this.dispatchToWorker(idleWorker, task);
  }

  private dispatchToWorker(entry: WorkerEntry, task: WorkerTask): void {
    entry.status = 'busy';
    entry.metrics.status = 'busy';
    entry.currentTaskId = task.id;
    this.pendingTasks.set(task.id, task);

    entry.worker.postMessage({
      taskId: task.id,
      type: task.type,
      payload: task.payload,
    });

    if (task.timeoutMs) {
      setTimeout(() => {
        if (this.pendingTasks.has(task.id)) {
          task.reject(new Error(`Task ${task.id} timed out after ${task.timeoutMs}ms`));
          this.pendingTasks.delete(task.id);
        }
      }, task.timeoutMs);
    }
  }

  /** Submit a task to the pool, returns a Promise */
  submit<T = unknown, R = unknown>(
    type: string,
    payload: T,
    options: { priority?: TaskPriority; timeoutMs?: number } = {}
  ): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      const task: WorkerTask<T, R> = {
        id: `task-${++this.taskCounter}-${Date.now()}`,
        type,
        payload,
        priority: options.priority ?? 'normal',
        timestamp: Date.now(),
        timeoutMs: options.timeoutMs,
        resolve,
        reject,
      };

      const idleWorker = this.getIdleWorker();
      if (idleWorker) {
        this.dispatchToWorker(idleWorker, task as WorkerTask);
      } else {
        this.taskQueue.push(task as WorkerTask);
        // Scale up if under cap
        if (this.workers.size < this.maxWorkers) {
          this.spawnWorker();
          this.drainQueue();
        }
      }
    });
  }

  /** Get current pool metrics */
  getMetrics(): PoolMetrics {
    const now = Date.now();
    // Clean throughput window to last 1 second
    this.throughputWindow = this.throughputWindow.filter((t) => now - t < 1000);

    const allLatencies = Array.from(this.workers.values() as Iterable<WorkerEntry>).flatMap(
      (e) => e.latencyHistory
    );
    const avgLatency =
      allLatencies.length > 0
        ? allLatencies.reduce((a, b) => a + b, 0) / allLatencies.length
        : 0;

    const totalCompleted = Array.from(this.workers.values() as Iterable<WorkerEntry>).reduce(
      (sum, e) => sum + e.metrics.tasksCompleted,
      0
    );

    return {
      totalWorkers: this.workers.size,
      idleWorkers: Array.from(this.workers.values() as Iterable<WorkerEntry>).filter((e) => e.status === 'idle').length,
      busyWorkers: Array.from(this.workers.values() as Iterable<WorkerEntry>).filter((e) => e.status === 'busy').length,
      queueDepth: this.taskQueue.length,
      throughputPerSec: this.throughputWindow.length,
      avgLatencyMs: Math.round(avgLatency * 10) / 10,
      totalTasksCompleted: totalCompleted,
    };
  }

  getWorkerMetrics(): WorkerMetrics[] {
    return Array.from(this.workers.values() as Iterable<WorkerEntry>).map((e) => ({ ...e.metrics }));
  }

  onMetrics(event: string, cb: (metrics: PoolMetrics) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
    return () => this.listeners.get(event)?.delete(cb);
  }

  private emitMetrics(): void {
    const metrics = this.getMetrics();
    this.listeners.get('metrics')?.forEach((cb) => cb(metrics));
  }

  terminate(): void {
    for (const [, entry] of Array.from(this.workers.entries())) {
      entry.worker.terminate();
    }
    this.workers.clear();
    this.taskQueue.length = 0;
    this.pendingTasks.clear();
  }
}
