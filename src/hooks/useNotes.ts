import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { activeNotes, applyNoteAction, deletedNotes, purgeExpired } from '../utils/notes';
import type { Note, NoteAction } from '../utils/notes';
import { createNoteStoreService } from '../application/notes/NoteStoreService';
import { mergeNotes } from '../cloud/merge';

const store = createNoteStoreService();

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [now, setNow] = useState(Date.now);
  const [storageError, setStorageError] = useState('');
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const current = useRef<Note[]>([]);
  const saveChain = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    store.load().then((loaded) => {
      if (cancelled) return;
      const cleaned = purgeExpired(loaded);
      current.current = cleaned;
      setNotes(cleaned);
      setLoading(false);
      setStorageBlocked(false);
      setStorageError('');
      if (cleaned.length !== loaded.length) void store.save(cleaned);
    }).catch(() => {
      if (cancelled) return;
      setLoading(false);
      setStorageBlocked(true);
      setStorageError('Saved notes could not be opened. Your original data was left untouched.');
    });
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((next: Note[]) => {
    saveChain.current = saveChain.current.then(() => store.save(next)).catch(() => {
      setStorageBlocked(true);
      setStorageError('Could not save on this device. Your latest changes remain in memory; retry when storage is available.');
    });
  }, []);

  const commit = useCallback((next: Note[]) => {
    const cleaned = purgeExpired(next);
    current.current = cleaned;
    setNotes(cleaned);
    setStorageBlocked(false);
    setStorageError('');
    persist(cleaned);
  }, [persist]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const time = Date.now();
      setNow(time);
      const cleaned = purgeExpired(current.current, time);
      if (cleaned.length !== current.current.length) commit(cleaned);
    }, 60_000);
    return () => clearInterval(timer);
  }, [commit]);

  const act = useCallback((action: NoteAction) => {
    if (loading || storageBlocked) return;
    const next = applyNoteAction(current.current, action);
    if (next !== current.current) commit(next);
  }, [commit, loading, storageBlocked]);

  const createNote = useCallback((): Note | null => {
    if (loading || storageBlocked) return null;
    const timestamp = new Date().toISOString();
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() :
      Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const note: Note = { id, content: '', createdAt: timestamp, updatedAt: timestamp, deletedAt: null, isPinned: false };
    act({ type: 'create', note });
    return note;
  }, [act, loading, storageBlocked]);

  const updateNote = useCallback((id: string, content: string) => act({ type: 'edit', id, content }), [act]);
  const deleteNote = useCallback((id: string) => act({ type: 'delete', id }), [act]);
  const recoverNote = useCallback((id: string) => act({ type: 'recover', id }), [act]);
  const permanentlyDeleteNote = useCallback((id: string) => act({ type: 'destroy', id }), [act]);
  const togglePin = useCallback((id: string) => act({ type: 'pin', id }), [act]);
  const retrySave = useCallback(() => {
    setStorageBlocked(false);
    setStorageError('');
    persist(current.current);
  }, [persist]);

  const mergeExternal = useCallback((incoming: Note[]) => {
    if (loading || storageBlocked || incoming.length === 0) return;
    const merged = mergeNotes(current.current, incoming);
    const changed = merged.length !== current.current.length ||
      merged.some((note) => note !== current.current.find((local) => local.id === note.id));
    if (changed) commit(merged);
  }, [commit, loading, storageBlocked]);

  const getCurrent = useCallback(() => current.current, []);
  const active = useMemo(() => activeNotes(notes), [notes]);
  const deleted = useMemo(() => deletedNotes(notes, now), [notes, now]);
  return { notes, active, deleted, now, createNote, updateNote, deleteNote, recoverNote,
    permanentlyDeleteNote, togglePin, storageError, retrySave,
    storageBlocked: storageBlocked || loading, mergeExternal, getCurrent };
}
