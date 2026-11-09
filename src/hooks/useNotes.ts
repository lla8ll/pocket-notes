import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { activeNotes, applyNoteAction, deletedNotes, purgeExpired, STORAGE_KEY } from '../utils/notes';
import type { Note, NoteAction } from '../utils/notes';
import { readNotebook, writeNotebook } from '../utils/storage';
import type { NotebookSnapshot } from '../utils/storage';

function loadNotes(): NotebookSnapshot & { blocked: boolean; error: string } {
  try {
    return { ...readNotebook(localStorage), blocked: false, error: '' };
  } catch {
    return { notes: [], raw: null, needsWrite: false, blocked: true,
      error: 'Saved notes could not be opened. Your original data has been left untouched. Try again or reload.' };
  }
}

export function useNotes() {
  const [initial] = useState(loadNotes);
  const [notes, setNotes] = useState<Note[]>(initial.notes);
  const [now, setNow] = useState(Date.now);
  const [storageError, setStorageError] = useState(initial.error);
  const [storageBlocked, setStorageBlocked] = useState(initial.blocked);
  const current = useRef(notes);
  const lastRaw = useRef(initial.raw);
  const dirty = useRef(initial.needsWrite);
  const blocked = useRef(initial.blocked);

  const commit = useCallback((next: Note[]) => {
    if (blocked.current) return;
    const cleaned = purgeExpired(next);
    current.current = cleaned;
    setNotes(cleaned);
    dirty.current = true;
    // Save during the input event so a refresh cannot discard the last keystroke.
    try {
      lastRaw.current = writeNotebook(localStorage, cleaned, lastRaw.current);
      dirty.current = false;
      setStorageError('');
    } catch (error) {
      setStorageError(error instanceof Error && error.message === 'storage-conflict'
        ? 'Notes changed in another tab. Copy any unsaved text here before reloading; your saved notes are safe.'
        : 'Could not save on this device. Keep this page open and free some browser storage, then retry.');
    }
  }, []);

  const refresh = useCallback(() => {
    const time = Date.now();
    setNow(time);
    if (dirty.current) {
      const cleaned = purgeExpired(current.current, time);
      if (cleaned !== current.current) commit(cleaned);
      return;
    }
    try {
      const loaded = readNotebook(localStorage, time);
      blocked.current = false;
      setStorageBlocked(false);
      const changed = loaded.raw !== lastRaw.current;
      lastRaw.current = loaded.raw;
      if (changed || loaded.needsWrite) {
        current.current = loaded.notes;
        setNotes(loaded.notes);
      }
      if (loaded.needsWrite) commit(loaded.notes);
      else setStorageError('');
    } catch {
      blocked.current = true;
      setStorageBlocked(true);
      setStorageError('Saved notes could not be read. Your original data has been left untouched. Try again or reload.');
    }
  }, [commit]);

  useEffect(() => {
    // Failed saves stay in memory. Give the user a chance to keep that text
    // before a reload or closing the tab; successful autosaves need no prompt.
    if (!storageError || !dirty.current) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [storageError]);

  useEffect(() => {
    if (initial.needsWrite) commit(current.current);
    const visible = () => { if (document.visibilityState === 'visible') refresh(); };
    const changed = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) refresh(); };
    const interval = window.setInterval(visible, 60_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    window.addEventListener('storage', changed);
    document.addEventListener('visibilitychange', visible);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      window.removeEventListener('storage', changed);
      document.removeEventListener('visibilitychange', visible);
    };
  }, [commit, initial.needsWrite, refresh]);

  const act = useCallback((action: NoteAction) => {
    if (blocked.current) return;
    const next = applyNoteAction(current.current, action);
    if (next !== current.current) commit(next);
  }, [commit]);

  const createNote = useCallback((): Note | null => {
    if (blocked.current) return null;
    const timestamp = new Date().toISOString();
    const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() :
      Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const note: Note = { id, content: '', createdAt: timestamp, updatedAt: timestamp, deletedAt: null, isPinned: false };
    act({ type: 'create', note });
    return note;
  }, [act]);

  const updateNote = useCallback((id: string, content: string) => act({ type: 'edit', id, content }), [act]);
  const deleteNote = useCallback((id: string) => act({ type: 'delete', id }), [act]);
  const recoverNote = useCallback((id: string) => act({ type: 'recover', id }), [act]);
  const permanentlyDeleteNote = useCallback((id: string) => act({ type: 'destroy', id }), [act]);
  const togglePin = useCallback((id: string) => act({ type: 'pin', id }), [act]);
  const retrySave = useCallback(() => {
    if (blocked.current) refresh();
    else commit(current.current);
  }, [commit, refresh]);
  const active = useMemo(() => activeNotes(notes), [notes]);
  const deleted = useMemo(() => deletedNotes(notes, now), [notes, now]);

  return { notes, active, deleted, now, createNote, updateNote, deleteNote, recoverNote,
    permanentlyDeleteNote, togglePin, storageError, retrySave, storageBlocked };
}
