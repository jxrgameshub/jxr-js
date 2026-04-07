import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 800, color: '#ea580c', marginBottom: '0.5rem' }}>404</h1>
      <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>Page not found.</p>
      <Link
        href="/"
        style={{
          color: '#ea580c',
          textDecoration: 'none',
          fontWeight: 600,
          borderBottom: '1px solid #ea580c',
          paddingBottom: '2px',
        }}
      >
        Back to Home
      </Link>
    </div>
  );
}
