import { useState } from 'react';
import { NoteEditor } from './components/NoteEditor';
import { NoteList } from './components/NoteList';
import { useCryptoNotes } from './components/useCryptoNotes';

export default function App() {
  const { notes, activeId, setActiveId, addNote, updateNote, deleteNote, ready } = useCryptoNotes();
  const [composing, setComposing] = useState(false);

  const activeNote = notes.find((n) => n.id === activeId);

  if (!ready) {
    return (
      <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#0a0a0a', color: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6b7280' }}>Generating encryption keys...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: '#0a0a0a', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ea580c', margin: 0 }}>Crypto Notes</h1>
          <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '100px', color: '#4ade80', fontFamily: 'monospace' }}>
            AES-GCM-256
          </span>
        </div>
        <button
          onClick={() => { addNote(); setComposing(true); }}
          style={{ background: '#ea580c', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          + New Note
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <NoteList
          notes={notes}
          activeId={activeId}
          onSelect={(id) => { setActiveId(id); setComposing(false); }}
          onDelete={deleteNote}
        />
        <NoteEditor
          note={activeNote}
          composing={composing}
          onUpdate={updateNote}
        />
      </div>
    </div>
  );
}
