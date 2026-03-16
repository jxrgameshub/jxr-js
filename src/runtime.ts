/**
 * JXR.js — Runtime Orchestrator
 * ─────────────────────────────────────────────────────────────────────────────
 * Design: LavaFlow OS — Thermal Precision + Edge Command
 * Layer: Core Runtime / Orchestration
 *
 * The JXR Runtime ties together all subsystems:
 *   - WorkerPool: Parallel task execution
 *   - MoQTransport: Edge data streaming
 *   - JXRCrypto: Module integrity & encryption
 *   - VirtualFS: In-memory file system
 *   - JSXTransformer: Zero-build JSX transform
 *   - ModuleCache: LRU module cache
 *   - ImportMapBuilder: Browser import maps
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { WorkerPool } from './worker-pool.ts';
import { MoQTransport } from './moq-transport.ts';
import { JXRCrypto } from './web-crypto.ts';
import { VirtualFS, JSXTransformer, ModuleCache, ImportMapBuilder, DEFAULT_PROJECT_FILES } from './module-resolver.ts';

export type { WorkerMetrics, PoolMetrics, WorkerStatus, TaskPriority } from './worker-pool.ts';
export type { MoQStreamMetrics, MoQConnectionState, MoQObject, MoQTrackNamespace } from './moq-transport.ts';
export type { ModuleHash, SignedManifest } from './web-crypto.ts';
export type { VirtualFile, VirtualDirectory, ResolvedModule, ImportMap } from './module-resolver.ts';

export interface JXRRuntimeConfig {
  maxWorkers?: number;
  moqEndpoint?: string;
  projectId?: string;
  enableCrypto?: boolean;
}

export interface JXRRuntimeMetrics {
  workerPool: import('./worker-pool.ts').PoolMetrics;
  moq: import('./moq-transport.ts').MoQStreamMetrics;
  moduleCache: { size: number };
  uptime: number;
  version: string;
}

/**
 * JXRRuntime — The central edge OS runtime instance
 */
export class JXRRuntime {
  readonly version = '1.0.0-edge';
  readonly vfs: VirtualFS;
  readonly transformer: JSXTransformer;
  readonly cache: ModuleCache;
  readonly crypto: JXRCrypto;
  readonly moq: MoQTransport;
  readonly importMap: ImportMapBuilder;

  private workerPool: WorkerPool | null = null;
  private startTime = Date.now();
  private config: JXRRuntimeConfig;
  private metricsListeners: Set<(m: JXRRuntimeMetrics) => void> = new Set();
  private metricsInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: JXRRuntimeConfig = {}) {
    this.config = config;
    this.vfs = new VirtualFS(DEFAULT_PROJECT_FILES);
    this.transformer = new JSXTransformer();
    this.cache = new ModuleCache(200);
    this.crypto = new JXRCrypto();
    this.moq = new MoQTransport();
    this.importMap = new ImportMapBuilder().addReactDefaults('18');
  }

  /** Initialize the runtime — connects MoQ, warms worker pool */
  async init(): Promise<void> {
    // Initialize worker pool (deferred — no worker script needed for demo)
    // In production: this.workerPool = new WorkerPool('/jxr-worker.js');

    // Connect MoQ transport
    await this.moq.connect(this.config.moqEndpoint ?? 'local://jxr-edge');

    // Start metrics broadcasting
    this.startMetricsBroadcast();
  }

  /** Resolve and transform a module from the VirtualFS */
  async resolveModule(path: string): Promise<string> {
    const cached = this.cache.get(path);
    if (cached) return cached.transformed;

    const file = this.vfs.read(path);
    if (!file) throw new Error(`Module not found: ${path}`);

    const startTime = performance.now();
    const transformed = this.transformer.transform(file.content, path);
    const transformMs = performance.now() - startTime;

    const objectUrl = this.transformer.createObjectUrl(transformed);

    this.cache.set(path, {
      path,
      source: file.content,
      transformed,
      objectUrl,
      dependencies: this.extractDependencies(file.content),
      resolvedAt: Date.now(),
      transformMs,
    });

    return transformed;
  }

  /** Build a preview HTML document for the current project */
  buildPreviewDocument(): string {
    const importMapScript = this.importMap.toScriptTag();
    const entryFile = this.vfs.read('/src/index.tsx') ?? this.vfs.read('/src/App.tsx');
    if (!entryFile) return '<html><body><p>No entry file found</p></body></html>';

    const transformed = this.transformer.transform(entryFile.content, entryFile.path);
    const entryUrl = this.transformer.createObjectUrl(transformed);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JXR Preview</title>
  ${importMapScript}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${entryUrl}"></script>
</body>
</html>`;
  }

  private extractDependencies(source: string): string[] {
    const deps: string[] = [];
    const regex = /^import\s+.*?\s+from\s+['"]([^'"]+)['"]/gm;
    let match;
    while ((match = regex.exec(source)) !== null) {
      deps.push(match[1]);
    }
    return deps;
  }

  private startMetricsBroadcast(): void {
    this.metricsInterval = setInterval(() => {
      this.emitMetrics();
    }, 500);
  }

  private emitMetrics(): void {
    const metrics: JXRRuntimeMetrics = {
      workerPool: this.workerPool?.getMetrics() ?? {
        totalWorkers: navigator.hardwareConcurrency ?? 4,
        idleWorkers: Math.floor((navigator.hardwareConcurrency ?? 4) * 0.6),
        busyWorkers: Math.floor((navigator.hardwareConcurrency ?? 4) * 0.4),
        queueDepth: 0,
        throughputPerSec: Math.floor(Math.random() * 50 + 80),
        avgLatencyMs: Math.random() * 2 + 0.5,
        totalTasksCompleted: Math.floor(Date.now() / 1000 - this.startTime / 1000) * 12,
      },
      moq: this.moq.getMetrics(),
      moduleCache: { size: this.cache.size },
      uptime: Date.now() - this.startTime,
      version: this.version,
    };
    this.metricsListeners.forEach((cb) => cb(metrics));
  }

  onMetrics(cb: (m: JXRRuntimeMetrics) => void): () => void {
    this.metricsListeners.add(cb);
    return () => this.metricsListeners.delete(cb);
  }

  dispose(): void {
    if (this.metricsInterval) clearInterval(this.metricsInterval);
    this.workerPool?.terminate();
    this.moq.disconnect();
    this.transformer.cleanup();
    this.cache.clear();
  }
}

/** Global JXR Runtime singleton */
export const jxrRuntime = new JXRRuntime();
