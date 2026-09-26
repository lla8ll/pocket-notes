import type { Note } from '../../utils/notes.ts';
import { decodeNotes, encodeNotes, purgeExpired, STORAGE_KEY } from '../../utils/notes.ts';
import type { NoteRepository } from '../../domain/notes/NoteRepository.ts';

export class LocalStorageNoteRepository implements NoteRepository {
  async load(): Promise<Note[]> {
    const raw = localStorage.getItem(STORAGE_KEY);
    return purgeExpired(decodeNotes(raw));
  }
  async save(notes: Note[]): Promise<void> {
    localStorage.setItem(STORAGE_KEY, encodeNotes(notes));
  }
  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
  }
}
