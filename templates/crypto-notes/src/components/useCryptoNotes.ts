import { useState, useEffect, useCallback } from 'react';
import { jxrCrypto } from '@jxrstudios/jxr';

export interface Note {
  id: string;
  title: string;
  body: string;
  hash: string;
  createdAt: number;
}

export function useCryptoNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    jxrCrypto.generateSigningKeyPair().then(() => setReady(true));
  }, []);

  const addNote = useCallback(() => {
    const id = crypto.randomUUID();
    const note: Note = { id, title: 'Untitled', body: '', hash: '', createdAt: Date.now() };
    setNotes((prev) => [note, ...prev]);
    setActiveId(id);
  }, []);

  const updateNote = useCallback(async (id: string, title: string, body: string) => {
    const hashResult = await jxrCrypto.hashModule(body);
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, title, body, hash: hashResult.digest } : n)),
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setActiveId((prev) => (prev === id ? null : prev));
  }, []);

  return { notes, activeId, setActiveId, addNote, updateNote, deleteNote, ready };
}
