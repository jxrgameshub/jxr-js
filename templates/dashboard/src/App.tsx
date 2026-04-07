import { useState } from 'react';
import { MetricsPanel } from './components/MetricsPanel';
import { ModuleList } from './components/ModuleList';
import { TransportStatus } from './components/TransportStatus';

export default function App() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'modules' | 'transport'>('metrics');

  const tabs = [
    { id: 'metrics' as const, label: 'Worker Pool' },
    { id: 'modules' as const, label: 'Modules' },
    { id: 'transport' as const, label: 'MoQ Transport' },
  ];

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#0a0a0a', color: '#fff', minHeight: '100vh' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ea580c', margin: 0 }}>JXR Dashboard</h1>
        <span style={{ fontSize: '0.75rem', color: '#4b5563', fontFamily: 'monospace' }}>v1.0.0-edge</span>
      </header>

      <nav style={{ display: 'flex', gap: '0.25rem', padding: '1rem 2rem 0', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.5rem 1rem',
              background: activeTab === tab.id ? 'rgba(234,88,12,0.15)' : 'transparent',
              color: activeTab === tab.id ? '#ea580c' : '#9ca3af',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #ea580c' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.85rem',
              fontFamily: 'inherit',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main style={{ padding: '2rem' }}>
        {activeTab === 'metrics' && <MetricsPanel />}
        {activeTab === 'modules' && <ModuleList />}
        {activeTab === 'transport' && <TransportStatus />}
      </main>
    </div>
  );
}
