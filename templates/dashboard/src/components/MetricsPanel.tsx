import { useState, useEffect } from 'react';
import { jxrRuntime } from '@jxrstudios/jxr';
import type { JXRRuntimeMetrics } from '@jxrstudios/jxr';

function StatCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div style={{
      background: '#111',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: '10px',
      padding: '1.25rem',
    }}>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fff' }}>
        {value}
        {unit && <span style={{ fontSize: '0.85rem', color: '#6b7280', marginLeft: '0.25rem' }}>{unit}</span>}
      </div>
    </div>
  );
}

export function MetricsPanel() {
  const [metrics, setMetrics] = useState<JXRRuntimeMetrics | null>(null);

  useEffect(() => {
    jxrRuntime.init();
    const unsub = jxrRuntime.onMetrics(setMetrics);
    return () => {
      unsub();
      jxrRuntime.dispose();
    };
  }, []);

  if (!metrics) {
    return <p style={{ color: '#6b7280' }}>Initializing runtime...</p>;
  }

  const pool = metrics.workerPool;

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#9ca3af' }}>Worker Pool Metrics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
        <StatCard label="Workers" value={pool.totalWorkers} />
        <StatCard label="Idle" value={pool.idleWorkers} />
        <StatCard label="Busy" value={pool.busyWorkers} />
        <StatCard label="Queue Depth" value={pool.queueDepth} />
        <StatCard label="Throughput" value={pool.throughputPerSec} unit="/s" />
        <StatCard label="Avg Latency" value={pool.avgLatencyMs.toFixed(1)} unit="ms" />
        <StatCard label="Completed" value={pool.totalTasksCompleted} />
        <StatCard label="Uptime" value={Math.floor(metrics.uptime / 1000)} unit="s" />
      </div>
    </div>
  );
}
