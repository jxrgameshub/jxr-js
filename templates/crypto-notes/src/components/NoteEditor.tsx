import { useState, useEffect } from 'react';
import type { Note } from './useCryptoNotes';

interface NoteEditorProps {
  note: Note | undefined;
  composing: boolean;
  onUpdate: (id: string, title: string, body: string) => void;
}

export function NoteEditor({ note, composing, onUpdate }: NoteEditorProps) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body);
    }
  }, [note?.id]);

  if (!note) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563' }}>
        Select a note or create a new one
      </div>
    );
  }

  const handleBlur = () => {
    onUpdate(note.id, title, body);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem 2rem' }}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleBlur}
        autoFocus={composing}
        placeholder="Note title"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          fontSize: '1.5rem',
          fontWeight: 700,
          marginBottom: '1rem',
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={handleBlur}
        placeholder="Start writing..."
        style={{
          background: '#111',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '8px',
          color: '#d1d5db',
          padding: '1rem',
          flex: 1,
          resize: 'none',
          fontSize: '0.9rem',
          lineHeight: 1.7,
          outline: 'none',
          fontFamily: 'inherit',
        }}
      />
      {note.hash && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: '#4b5563', fontFamily: 'monospace' }}>
          SHA-256: {note.hash}
        </div>
      )}
    </div>
  );
}
