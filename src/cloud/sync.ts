import { supabase } from './supabaseClient';
import type { Note } from '../utils/notes';

// Shape of a row in the Supabase `notes` table.
interface NoteRow {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_pinned: boolean;
  synced_at: string;
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    isPinned: row.is_pinned,
  };
}

function noteToRow(note: Note, userId: string): Omit<NoteRow, 'synced_at'> {
  return {
    id: note.id,
    user_id: userId,
    content: note.content,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
    deleted_at: note.deletedAt,
    is_pinned: note.isPinned,
  };
}

// Re-exported from the pure merge module so existing imports keep working.
export { mergeNotes } from './merge';

export async function pullNotes(): Promise<Note[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('notes').select('*');
  if (error) throw error;
  return (data as NoteRow[]).map(rowToNote);
}

// Upsert the full local set for the signed-in user. Batched to stay within
// request limits; each note carries its own id so upsert is idempotent.
export async function pushNotes(notes: Note[], userId: string): Promise<void> {
  if (!supabase || notes.length === 0) return;
  const rows = notes.map((note) => noteToRow(note, userId));
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('notes').upsert(rows.slice(i, i + 500), { onConflict: 'id' });
    if (error) throw error;
  }
}

// Subscribe to realtime changes for this user's notes. Returns an unsubscribe.
export function subscribeNotes(userId: string, onChange: (note: Note) => void): () => void {
  const client = supabase;
  if (!client) return () => {};
  const channel = client
    .channel('notes-sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as NoteRow | undefined;
        if (row && row.id) onChange(rowToNote(row));
      },
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
