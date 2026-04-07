import { useState, useEffect } from 'react';
import { jxrRuntime } from '@jxrstudios/jxr';
import type { JXRRuntimeMetrics } from '@jxrstudios/jxr';

export default function App() {
  const [metrics, setMetrics] = useState<JXRRuntimeMetrics | null>(null);

  useEffect(() => {
    jxrRuntime.init();
    const unsub = jxrRuntime.onMetrics(setMetrics);
    return () => { unsub(); jxrRuntime.dispose(); };
  }, []);

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#0a0a0a', color: '#fff', minHeight: '100vh', padding: '2rem' }}>
      <h1 style={{ color: '#ea580c', marginBottom: '0.25rem' }}>JXR Runtime</h1>
      <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
        Live metrics from the edge runtime — v{metrics?.version ?? '...'}
      </p>

      {metrics ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
          <Card label="Workers" value={metrics.workerPool.totalWorkers} />
          <Card label="Idle" value={metrics.workerPool.idleWorkers} />
          <Card label="Throughput" value={`${metrics.workerPool.throughputPerSec}/s`} />
          <Card label="Latency" value={`${metrics.workerPool.avgLatencyMs.toFixed(1)} ms`} />
          <Card label="Cache" value={`${metrics.moduleCache.size} modules`} />
          <Card label="Uptime" value={`${Math.floor(metrics.uptime / 1000)}s`} />
        </div>
      ) : (
        <p style={{ color: '#4b5563' }}>Initializing...</p>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem' }}>
      <div style={{ fontSize: '0.65rem', color: '#6b7280', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.3rem' }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{value}</div>
    </div>
  );
}
