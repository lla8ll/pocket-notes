import type { Note } from '../utils/notes';

// Last-write-wins by updatedAt. Pure and dependency-free so it can run in the
// Node test runner and in the browser alike. On equal timestamps the local
// copy is kept, avoiding a needless overwrite.
export function mergeNotes(local: Note[], remote: Note[]): Note[] {
  const byId = new Map<string, Note>();
  for (const note of local) byId.set(note.id, note);
  for (const note of remote) {
    const current = byId.get(note.id);
    if (!current || Date.parse(note.updatedAt) > Date.parse(current.updatedAt)) {
      byId.set(note.id, note);
    }
  }
  return [...byId.values()];
}
