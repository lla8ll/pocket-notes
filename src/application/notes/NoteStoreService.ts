import type { Note } from '../../utils/notes.ts';
import type { NoteRepository } from '../../domain/notes/NoteRepository.ts';
import { IndexedDbNoteRepository } from '../../infrastructure/storage/IndexedDbNoteRepository.ts';
import { LocalStorageNoteRepository } from '../../infrastructure/storage/LocalStorageNoteRepository.ts';

export class NoteStoreService {
  private readonly repository: NoteRepository;
  private readonly legacy: NoteRepository;
  constructor(repository: NoteRepository, legacy: NoteRepository = new LocalStorageNoteRepository()) {
    this.repository = repository;
    this.legacy = legacy;
  }

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
