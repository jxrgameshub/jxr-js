/**
 * JXR.js — Performance Dashboard
 * Design: LavaFlow OS — Thermal Precision + Edge Command
 * Real-time metrics: Worker pool, MoQ transport, module cache
 */

import { useState, useEffect, useRef } from 'react';
import { useJXR } from '@/contexts/JXRContext';
import type { JXRRuntimeMetrics } from '@/lib/jxr-runtime';
import {
  Cpu,
  Zap,
  Activity,
  Shield,
  Database,
  Radio,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

// ─── Mini sparkline chart ─────────────────────────────────────────────────────

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
}

function Sparkline({ data, color, height = 32 }: SparklineProps) {
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#grad-${color.replace('#', '')})`}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{ display: 'none' }}
          cursor={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: 'lava' | 'cyan' | 'green' | 'yellow';
  sparkData?: number[];
  trend?: 'up' | 'down' | 'stable';
}

const COLOR_MAP = {
  lava: { text: 'text-lava', bg: 'bg-lava/10', border: 'border-lava/20', hex: '#e8650a' },
  cyan: { text: 'text-cyan-accent', bg: 'bg-cyan-accent/10', border: 'border-cyan-accent/20', hex: '#22d3ee' },
  green: { text: 'text-success', bg: 'bg-success/10', border: 'border-success/20', hex: '#4ade80' },
  yellow: { text: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20', hex: '#facc15' },
};

function MetricCard({ label, value, sub, icon, color, sparkData, trend }: MetricCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className={cn(
      'rounded-lg border p-3 bg-card',
      c.border
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className={cn('p-1.5 rounded', c.bg)}>
          <div className={c.text}>{icon}</div>
        </div>
        {trend && (
          <TrendingUp className={cn(
            'w-3 h-3',
            trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground'
          )} />
        )}
      </div>
      <div className={cn('text-xl font-bold font-mono', c.text)}>{value}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      {sparkData && sparkData.length > 0 && (
        <div className="mt-2">
          <Sparkline data={sparkData} color={c.hex} />
        </div>
      )}
    </div>
  );
}

// ─── Worker node visualization ────────────────────────────────────────────────

function WorkerNodes({ total, busy }: { total: number; busy: number }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-5 h-5 rounded-sm transition-all duration-300',
            i < busy
              ? 'bg-lava glow-lava animate-pulse'
              : 'bg-muted border border-border'
          )}
          title={i < busy ? 'Busy' : 'Idle'}
        />
      ))}
    </div>
  );
}

// ─── MoQ stream visualizer ────────────────────────────────────────────────────

function MoQStreamBar({ bandwidth }: { bandwidth: number }) {
  const maxBw = 1_000_000_000; // 1 Gbps
  const pct = Math.min(100, (bandwidth / maxBw) * 100);
  const mbps = (bandwidth / 1_000_000).toFixed(0);

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>MoQ Bandwidth</span>
        <span className="font-mono text-cyan-accent">{mbps} Mbps</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, var(--cyan-accent), var(--lava))',
          }}
        />
      </div>
    </div>
  );
}

// ─── Terminal / Log stream ────────────────────────────────────────────────────

export function TerminalPane() {
  const { terminalLines, clearTerminal } = useJXR();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalLines]);

  const colorMap = {
    command: 'text-lava',
    info: 'text-muted-foreground',
    success: 'text-success',
    error: 'text-destructive',
    warn: 'text-warning',
    output: 'text-foreground/70',
  };

  return (
    <div className="flex flex-col h-full bg-[oklch(0.09_0.005_260)] font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Terminal</span>
          <span className="text-[10px] text-success">● connected</span>
        </div>
        <button
          className="text-[10px] text-muted-foreground hover:text-foreground"
          onClick={clearTerminal}
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {terminalLines.map((line) => (
          <div key={line.id} className={cn('leading-relaxed', colorMap[line.type])}>
            {line.type === 'command' ? (
              <span>{line.text}</span>
            ) : (
              <span className="opacity-90">{line.text}</span>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 px-3 py-1.5 border-t border-border/50">
        <span className="text-lava">›</span>
        <span className="text-muted-foreground text-[10px]">jxr@edge:~$</span>
        <span className="w-2 h-3.5 bg-lava/70 animate-pulse" />
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function PerformanceDashboard() {
  const { metrics, isInitialized } = useJXR();
  const [latencyHistory, setLatencyHistory] = useState<number[]>([]);
  const [throughputHistory, setThroughputHistory] = useState<number[]>([]);
  const [rttHistory, setRttHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!metrics) return;
    setLatencyHistory((h) => [...h.slice(-30), metrics.workerPool.avgLatencyMs]);
    setThroughputHistory((h) => [...h.slice(-30), metrics.workerPool.throughputPerSec]);
    setRttHistory((h) => [...h.slice(-30), metrics.moq.rttMs]);
  }, [metrics]);

  const formatUptime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  if (!isInitialized || !metrics) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-2">
          <Activity className="w-8 h-8 text-lava animate-pulse mx-auto" />
          <p className="text-xs text-muted-foreground">Initializing runtime...</p>
        </div>
      </div>
    );
  }

  const { workerPool, moq, moduleCache, uptime } = metrics;

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Runtime Metrics
        </span>
        <div className="flex items-center gap-1.5 text-[10px] text-success">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span>Live</span>
        </div>
      </div>

      {/* Metric cards grid */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Task Throughput"
          value={`${workerPool.throughputPerSec}/s`}
          sub={`${workerPool.totalTasksCompleted} total`}
          icon={<Zap className="w-3.5 h-3.5" />}
          color="lava"
          sparkData={throughputHistory}
          trend="up"
        />
        <MetricCard
          label="Avg Latency"
          value={`${workerPool.avgLatencyMs.toFixed(1)}ms`}
          sub="worker dispatch"
          icon={<Clock className="w-3.5 h-3.5" />}
          color="cyan"
          sparkData={latencyHistory}
          trend="stable"
        />
        <MetricCard
          label="MoQ RTT"
          value={`${moq.rttMs.toFixed(1)}ms`}
          sub={`${(moq.lossRate * 100).toFixed(3)}% loss`}
          icon={<Radio className="w-3.5 h-3.5" />}
          color="green"
          sparkData={rttHistory}
          trend="stable"
        />
        <MetricCard
          label="Module Cache"
          value={`${moduleCache.size}`}
          sub="modules cached"
          icon={<Database className="w-3.5 h-3.5" />}
          color="yellow"
        />
      </div>

      {/* Worker pool */}
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-lava" />
            <span className="text-xs font-semibold">Worker Pool</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {workerPool.busyWorkers}/{workerPool.totalWorkers} active
          </span>
        </div>
        <WorkerNodes total={workerPool.totalWorkers} busy={workerPool.busyWorkers} />
        {workerPool.queueDepth > 0 && (
          <div className="mt-2 text-[10px] text-warning">
            Queue depth: {workerPool.queueDepth}
          </div>
        )}
      </div>

      {/* MoQ transport */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-2">
        <div className="flex items-center gap-1.5 mb-1">
          <Radio className="w-3.5 h-3.5 text-cyan-accent" />
          <span className="text-xs font-semibold">MoQ Transport</span>
          <span className={cn(
            'ml-auto text-[10px] px-1.5 py-0.5 rounded',
            moq.connectionState === 'connected'
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive'
          )}>
            {moq.connectionState}
          </span>
        </div>
        <MoQStreamBar bandwidth={moq.bandwidthBps} />
        <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
          <div>
            <span className="text-foreground font-mono">{(moq.bytesReceived / 1024).toFixed(1)} KB</span>
            <span className="ml-1">received</span>
          </div>
          <div>
            <span className="text-foreground font-mono">{(moq.bytesSent / 1024).toFixed(1)} KB</span>
            <span className="ml-1">sent</span>
          </div>
        </div>
      </div>

      {/* Crypto status */}
      <div className="rounded-lg border border-cyan-accent/20 bg-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Shield className="w-3.5 h-3.5 text-cyan-accent" />
          <span className="text-xs font-semibold">Web Crypto</span>
          <span className="ml-auto text-[10px] text-success">✓ Active</span>
        </div>
        <div className="space-y-1 text-[10px] text-muted-foreground">
          <div className="flex justify-between">
            <span>Algorithm</span>
            <span className="font-mono text-foreground">AES-GCM-256</span>
          </div>
          <div className="flex justify-between">
            <span>Signing</span>
            <span className="font-mono text-foreground">ECDSA P-256</span>
          </div>
          <div className="flex justify-between">
            <span>KDF</span>
            <span className="font-mono text-foreground">HKDF-SHA256</span>
          </div>
          <div className="flex justify-between">
            <span>Runtime</span>
            <span className="font-mono text-foreground">SubtleCrypto</span>
          </div>
        </div>
      </div>

      {/* Uptime */}
      <div className="text-center text-[10px] text-muted-foreground pb-1">
        Uptime: <span className="font-mono text-foreground">{formatUptime(uptime)}</span>
        {' · '}
        v{metrics.version}
      </div>
    </div>
  );
}
