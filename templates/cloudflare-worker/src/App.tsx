import { useState, useEffect } from 'react';

interface DeployInfo {
  status: 'idle' | 'building' | 'deployed';
  url: string | null;
}

export default function App() {
  const [info, setInfo] = useState<DeployInfo>({ status: 'idle', url: null });
  const [buildTime, setBuildTime] = useState<string | null>(null);

  useEffect(() => {
    // Detect if running on Cloudflare Pages
    const cfUrl = (globalThis as Record<string, unknown>).CF_PAGES_URL as string | undefined;
    if (cfUrl) {
      setInfo({ status: 'deployed', url: cfUrl });
    }
    setBuildTime(new Date().toISOString());
  }, []);

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#0a0a0a', color: '#fff', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          <span style={{ color: '#ea580c' }}>JXR</span> Edge Worker
        </h1>
        <p style={{ color: '#9ca3af', marginBottom: '2rem', lineHeight: 1.6 }}>
          Deploy this app to Cloudflare with a single command — no wrangler config needed.
        </p>

        <div style={{
          background: '#111',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '12px',
          overflow: 'hidden',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: '#161616', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ marginLeft: '8px', fontFamily: 'monospace', fontSize: '0.72rem', color: '#4b5563' }}>terminal</span>
          </div>
          <div style={{ padding: '1.25rem 1.5rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.82rem', lineHeight: 1.85, color: '#d1d5db' }}>
            <div><span style={{ color: '#22c55e' }}>$</span> jxr build --platform=cloudflare-worker</div>
            <div style={{ color: '#4b5563' }}># Bundles with esbuild, signs manifest with ECDSA-P256</div>
            <div style={{ marginTop: '0.5rem' }}><span style={{ color: '#22c55e' }}>$</span> jxr deploy --target=cloudflare</div>
            <div style={{ color: '#22c55e' }}>Deployed to https://your-app.app.jxrstudios.online</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <InfoCard label="Status" value={info.status === 'deployed' ? 'Live on Edge' : 'Local Dev'} color={info.status === 'deployed' ? '#22c55e' : '#f97316'} />
          <InfoCard label="Platform" value="Cloudflare Workers" color="#f97316" />
          <InfoCard label="Build Target" value="ES2022" color="#9ca3af" />
          <InfoCard label="Built At" value={buildTime ? new Date(buildTime).toLocaleTimeString() : '—'} color="#9ca3af" />
        </div>

        <div style={{ marginTop: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.75rem' }}>Deploy Steps</h2>
          <ol style={{ color: '#9ca3af', lineHeight: 2.2, paddingLeft: '1.25rem', fontSize: '0.9rem' }}>
            <li>Set <code style={{ color: '#ea580c' }}>JXR_API_KEY</code> — get one at <a href="https://jxrstudios.online" style={{ color: '#ea580c' }}>jxrstudios.online</a></li>
            <li>Run <code style={{ color: '#ea580c' }}>jxr build --platform=cloudflare-worker</code></li>
            <li>Run <code style={{ color: '#ea580c' }}>jxr deploy --target=cloudflare</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1rem' }}>
      <div style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.35rem' }}>{label}</div>
      <div style={{ fontSize: '0.95rem', fontWeight: 600, color }}>{value}</div>
    </div>
  );
}
