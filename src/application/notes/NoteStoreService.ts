import type { Note } from '../../utils/notes';
import type { NoteRepository } from '../../domain/notes/NoteRepository';
import { IndexedDbNoteRepository } from '../../infrastructure/storage/IndexedDbNoteRepository';
import { LocalStorageNoteRepository } from '../../infrastructure/storage/LocalStorageNoteRepository';

export class NoteStoreService {
  constructor(private readonly repository: NoteRepository, private readonly legacy = new LocalStorageNoteRepository()) {}

  async load(): Promise<Note[]> {
    try {
      const notes = await this.repository.load();
      if (notes.length === 0) {
        const legacyNotes = await this.legacy.load();
        if (legacyNotes.length) {
          await this.repository.save(legacyNotes);
          return legacyNotes;
        }
      }
      return notes;
    } catch {
      try { return await this.legacy.load(); }
      catch { throw new Error('note-storage-unavailable'); }
    }
  }

  async save(notes: Note[]): Promise<void> {
    try { await this.repository.save(notes); }
    catch { await this.legacy.save(notes); }
  }
}

export function createNoteStoreService(): NoteStoreService {
  if (typeof indexedDB === 'undefined') return new NoteStoreService(new LocalStorageNoteRepository());
  return new NoteStoreService(new IndexedDbNoteRepository());
}
