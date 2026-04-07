import { useState } from 'react';

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Home</h1>
      <p style={{ color: '#9ca3af', marginBottom: '2rem', lineHeight: 1.6 }}>
        Multi-page JXR app with client-side routing via wouter.
        Navigation is instant — no server round-trips.
      </p>
      <button
        onClick={() => setCount((c) => c + 1)}
        style={{
          background: '#ea580c',
          color: '#fff',
          border: 'none',
          padding: '0.6rem 1.5rem',
          borderRadius: '6px',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '0.9rem',
        }}
      >
        Clicked {count} times
      </button>
    </div>
  );
}
