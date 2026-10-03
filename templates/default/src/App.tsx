import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#ffffff',
        display: 'grid',
        placeItems: 'center',
        margin: 0,
      }}
    >
      <main style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ color: '#ea580c', fontSize: '2.75rem', margin: 0 }}>JXR.js</h1>
        <p style={{ color: '#9ca3af', marginTop: '0.5rem' }}>
          Zero-build React — edit <code style={{ color: '#4ade80' }}>src/App.tsx</code> and save
        </p>
        <button
          onClick={() => setCount((c) => c + 1)}
          style={{
            marginTop: '1.5rem',
            background: '#ea580c',
            color: '#ffffff',
            border: 'none',
            padding: '0.75rem 2rem',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
          }}
        >
          Count: {count}
        </button>
      </main>
    </div>
  );
}
