import type { Note } from '../../utils/notes';
import type { NoteRepository } from '../../domain/notes/NoteRepository';
import { IndexedDbNoteRepository } from '../../infrastructure/storage/IndexedDbNoteRepository';
import { LocalStorageNoteRepository } from '../../infrastructure/storage/LocalStorageNoteRepository';

export class NoteStoreService {
  constructor(private readonly repository: NoteRepository, private readonly legacy = new LocalStorageNoteRepository()) {}

  async load(): Promise<Note[]> {
    try {
      return await this.repository.load();
    } catch {
      const legacyNotes = await this.legacy.load();
      if (legacyNotes.length) {
        await this.repository.save(legacyNotes);
        return legacyNotes;
      }
      throw new Error('note-storage-unavailable');
    }
  }

  save(notes: Note[]): Promise<void> { return this.repository.save(notes); }
}

export function createNoteStoreService(): NoteStoreService {
  if (typeof indexedDB === 'undefined') throw new Error('indexeddb-unavailable');
  return new NoteStoreService(new IndexedDbNoteRepository());
}
