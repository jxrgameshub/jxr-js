import type { Note } from './useCryptoNotes';

interface NoteListProps {
  notes: Note[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export function NoteList({ notes, activeId, onSelect, onDelete }: NoteListProps) {
  return (
    <aside style={{
      width: '260px',
      borderRight: '1px solid rgba(255,255,255,0.07)',
      overflowY: 'auto',
      flexShrink: 0,
    }}>
      {notes.length === 0 && (
        <p style={{ padding: '2rem 1rem', color: '#4b5563', fontSize: '0.85rem', textAlign: 'center' }}>
          No notes yet. Click &quot;+ New Note&quot; to start.
        </p>
      )}
      {notes.map((note) => (
        <div
          key={note.id}
          onClick={() => onSelect(note.id)}
          style={{
            padding: '0.75rem 1rem',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            background: note.id === activeId ? 'rgba(234,88,12,0.1)' : 'transparent',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: note.id === activeId ? '#ea580c' : '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {note.title || 'Untitled'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#4b5563', fontFamily: 'monospace', marginTop: '0.2rem' }}>
              {note.hash ? note.hash.slice(0, 16) + '...' : 'no hash'}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '1rem', padding: '0.25rem' }}
            title="Delete note"
          >
            x
          </button>
        </div>
      ))}
    </aside>
  );
}
