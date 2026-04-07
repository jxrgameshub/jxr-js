export default function About() {
  return (
    <div style={{ maxWidth: '600px' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>About</h1>
      <p style={{ color: '#9ca3af', lineHeight: 1.6 }}>
        This template demonstrates multi-page routing with JXR.js.
        All pages are served through the JXR dev server with zero-build JSX transformation
        and instant HMR.
      </p>
      <ul style={{ color: '#9ca3af', lineHeight: 2, marginTop: '1rem', paddingLeft: '1.25rem' }}>
        <li>Client-side routing with <code style={{ color: '#ea580c' }}>wouter</code></li>
        <li>Zero-build JSX transform via JXR runtime</li>
        <li>HMR with sub-millisecond updates</li>
      </ul>
    </div>
  );
}
