import { Route, Switch, Link, useLocation } from 'wouter';
import Home from './pages/Home';
import About from './pages/About';
import NotFound from './pages/NotFound';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
];

export default function App() {
  const [location] = useLocation();

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#0a0a0a', color: '#fff', minHeight: '100vh' }}>
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '1rem 2rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{ fontWeight: 700, color: '#ea580c', fontSize: '1.1rem', marginRight: '1rem' }}>JXR</span>
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              color: location === link.href ? '#ea580c' : '#9ca3af',
              textDecoration: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              transition: 'color 0.15s',
            }}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <main style={{ padding: '2rem' }}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={About} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}
