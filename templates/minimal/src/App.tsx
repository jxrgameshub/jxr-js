import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ color: '#ea580c', fontSize: '2.5rem', marginBottom: '0.5rem' }}>
        JXR.js
      </h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>
        Zero-build React — edit src/App.tsx and save
      </p>
      <button
        onClick={() => setCount((c) => c + 1)}
        style={{
          background: '#ea580c',
          color: 'white',
          border: 'none',
          padding: '0.75rem 2rem',
          borderRadius: '6px',
          fontSize: '1rem',
          cursor: 'pointer',
        }}
      >
        Count: {count}
      </button>
    </div>
  );
}
