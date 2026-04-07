import { useState } from 'react';
import { MoQTransport } from '@jxrstudios/jxr';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [transport] = useState(() => new MoQTransport());

  const publish = async () => {
    if (transport.getState() !== 'connected') {
      await transport.connect('local://demo');
    }

    const track = { namespace: 'chat', trackName: 'main' };
    const text = `msg-${Date.now()}`;
    await transport.publish(track, text);
    setMessages((prev) => [...prev, text]);
  };

  return (
    <div style={{ fontFamily: 'system-ui', padding: '2rem', maxWidth: 480 }}>
      <h1 style={{ color: '#ea580c' }}>MoQ Chat</h1>
      <button onClick={publish} style={{ background: '#ea580c', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: 6, cursor: 'pointer' }}>
        Send Message
      </button>
      <ul style={{ marginTop: '1rem', listStyle: 'none', padding: 0 }}>
        {messages.map((m, i) => (
          <li key={i} style={{ padding: '0.4rem 0', borderBottom: '1px solid #222', color: '#ccc', fontFamily: 'monospace', fontSize: '0.85rem' }}>{m}</li>
        ))}
      </ul>
    </div>
  );
}
