import type { Note } from '../../utils/notes.ts';

export interface NoteRepository {
  load(): Promise<Note[]>;
  save(notes: Note[]): Promise<void>;
  clear(): Promise<void>;
}
