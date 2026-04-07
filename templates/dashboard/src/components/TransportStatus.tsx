import { useState, useEffect } from 'react';
import { MoQTransport } from '@jxrstudios/jxr';
import type { MoQStreamMetrics } from '@jxrstudios/jxr';

export function TransportStatus() {
  const [transport] = useState(() => new MoQTransport());
  const [metrics, setMetrics] = useState<MoQStreamMetrics | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsub = transport.onMetrics(setMetrics);

    transport.connect('local://jxr-edge').then(() => {
      setConnected(true);
    });

    return () => {
      unsub();
      transport.disconnect();
    };
  }, [transport]);

  const stateColor = connected ? '#22c55e' : '#ef4444';

  return (
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#9ca3af' }}>MoQ Transport</h2>

      <div style={{
        background: '#111',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '10px',
        padding: '1.25rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: stateColor }} />
        <span style={{ fontWeight: 600 }}>{connected ? 'Connected' : 'Connecting...'}</span>
        <span style={{ fontSize: '0.75rem', color: '#4b5563', fontFamily: 'monospace' }}>local://jxr-edge</span>
      </div>

      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
          <Stat label="RTT" value={`${metrics.rttMs.toFixed(1)} ms`} />
          <Stat label="Bandwidth" value={`${(metrics.bandwidthBps / 1_000_000).toFixed(0)} Mbps`} />
          <Stat label="Packets Sent" value={metrics.packetsSent} />
          <Stat label="Packets Received" value={metrics.packetsReceived} />
          <Stat label="Bytes Sent" value={formatBytes(metrics.bytesSent)} />
          <Stat label="Bytes Received" value={formatBytes(metrics.bytesReceived)} />
          <Stat label="Subscriptions" value={metrics.activeSubscriptions} />
          <Stat label="Loss Rate" value={`${(metrics.lossRate * 100).toFixed(3)}%`} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem' }}>
      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{value}</div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
