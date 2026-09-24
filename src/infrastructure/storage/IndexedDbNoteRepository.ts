import type { Note } from '../../utils/notes';
import { decodeNotes, encodeNotes, purgeExpired } from '../../utils/notes';
import type { NoteRepository } from '../../domain/notes/NoteRepository';

const DB_NAME = 'pocket-notes';
const DB_VERSION = 1;
const STORE = 'notebook';
const KEY = 'notes';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB unavailable'));
  });
}

export class IndexedDbNoteRepository implements NoteRepository {
  async load(): Promise<Note[]> {
    const db = await openDb();
    try {
      const raw = await new Promise<unknown>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const request = tx.objectStore(STORE).get(KEY);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
      if (raw === null) return [];
      if (typeof raw !== 'string') throw new Error('Invalid IndexedDB notebook.');
      return purgeExpired(decodeNotes(raw));
    } finally { db.close(); }
  }

  async save(notes: Note[]): Promise<void> {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(encodeNotes(notes), KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Could not save notes.'));
        tx.onabort = () => reject(tx.error ?? new Error('Could not save notes.'));
      });
    } finally { db.close(); }
  }

  async clear(): Promise<void> {
    const db = await openDb();
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error('Could not clear notes.'));
      });
    } finally { db.close(); }
  }
}
