import { decodeNotes, encodeNotes, purgeExpired, STORAGE_KEY } from './notes.ts';
import type { Note } from './notes.ts';

export type NoteStorage = Pick<Storage, 'getItem' | 'setItem'>;
export interface NotebookSnapshot {
  notes: Note[];
  raw: string | null;
  needsWrite: boolean;
}

export function readNotebook(storage: NoteStorage, now = Date.now()): NotebookSnapshot {
  const raw = storage.getItem(STORAGE_KEY);
  const notes = purgeExpired(decodeNotes(raw), now);
  return { notes, raw, needsWrite: raw !== null && raw !== encodeNotes(notes) };
}

export function writeNotebook(storage: NoteStorage, notes: Note[], expectedRaw: string | null): string {
  // Never replace another tab's newer data with this tab's stale snapshot.
  if (storage.getItem(STORAGE_KEY) !== expectedRaw) throw new Error('storage-conflict');
  const raw = encodeNotes(notes);
  storage.setItem(STORAGE_KEY, raw); // One atomic replacement; no clearing or duplicate backup notes.
  return raw;
}
