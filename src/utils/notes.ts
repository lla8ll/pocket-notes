export interface AttachmentMeta {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

export interface Note {
  [metadata: string]: unknown;
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isPinned: boolean;
  isFavorite: boolean;
  folder: string;
  tags: string[];
  attachments: AttachmentMeta[];
}

export const STORAGE_KEY = 'classic-pocket-notes:v1';
export const DAY_MS = 24 * 60 * 60 * 1000;
export const RETENTION_MS = 30 * DAY_MS;

export function getTitle(content: string): string {
  return content.split(/\r?\n/).find((line) => line.trim())?.trim() || 'New Note';
}
export function getPreview(content: string): string {
  return content.split(/\r?\n/).filter((line) => line.trim()).slice(1).join(' ').trim();
}
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => Number(b.isPinned) - Number(a.isPinned) ||
    Number(b.isFavorite) - Number(a.isFavorite) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}
export function isExpired(note: Note, now = Date.now()): boolean {
  return note.deletedAt !== null && now - Date.parse(note.deletedAt) >= RETENTION_MS;
}
export function remainingDays(note: Note, now = Date.now()): number {
  if (note.deletedAt === null) return 0;
  return Math.max(0, Math.min(30, Math.ceil((Date.parse(note.deletedAt) + RETENTION_MS - now) / DAY_MS)));
}
export function remainingLabel(note: Note, now = Date.now()): string {
  const days = remainingDays(note, now);
  return `${days} ${days === 1 ? 'day' : 'days'} remaining`;
}
export function purgeExpired(notes: Note[], now = Date.now()): Note[] {
  const kept = notes.filter((note) => !isExpired(note, now));
  return kept.length === notes.length ? notes : kept;
}
export function activeNotes(notes: Note[], query = '', folder = '', tag = '', favorite = false): Note[] {
  const search = query.trim().toLowerCase();
  const normalizedTag = tag.trim().toLowerCase();
  return sortNotes(notes.filter((note) => note.deletedAt === null &&
    (!folder || note.folder === folder) &&
    (!normalizedTag || note.tags.some((item) => item.toLowerCase() === normalizedTag)) &&
    (!favorite || note.isFavorite) &&
    (!search || getTitle(note.content).toLowerCase().includes(search) ||
      note.content.toLowerCase().includes(search) || note.folder.toLowerCase().includes(search) ||
      note.tags.some((item) => item.toLowerCase().includes(search)))));
}
export function deletedNotes(notes: Note[], now = Date.now()): Note[] {
  return notes.filter((note) => note.deletedAt !== null && !isExpired(note, now))
    .sort((a, b) => Date.parse(b.deletedAt!) - Date.parse(a.deletedAt!));
}

export type NoteAction =
  | { type: 'create'; note: Note }
  | { type: 'edit'; id: string; content: string }
  | { type: 'metadata'; id: string; folder: string; tags: string[]; isFavorite: boolean }
  | { type: 'pin' | 'delete' | 'recover' | 'destroy'; id: string };

export function applyNoteAction(notes: Note[], action: NoteAction, now = Date.now()): Note[] {
  const current = purgeExpired(notes, now);
  if (action.type === 'create') return current.some((note) => note.id === action.note.id) ? current : [action.note, ...current];
  const note = current.find((item) => item.id === action.id);
  if (!note) return current;
  if (action.type === 'destroy') return note.deletedAt !== null ? current.filter((item) => item.id !== note.id) : current;
  if (action.type === 'recover') {
    if (note.deletedAt === null) return current;
    return current.map((item) => item.id === note.id ? { ...note, deletedAt: null } : item);
  }
  if (note.deletedAt !== null) return current;
  let updated: Note;
  if (action.type === 'edit') {
    if (note.content === action.content) return current;
    updated = { ...note, content: action.content, updatedAt: new Date(now).toISOString() };
  } else if (action.type === 'metadata') {
    updated = { ...note, folder: action.folder.trim(), tags: [...new Set(action.tags.map((tag) => tag.trim()).filter(Boolean))], isFavorite: action.isFavorite };
  } else if (action.type === 'pin') {
    updated = { ...note, isPinned: !note.isPinned };
  } else {
    updated = { ...note, deletedAt: new Date(now).toISOString() };
  }
  return current.map((item) => item.id === note.id ? updated : item);
}

export function decodeNotes(raw: string | null): Note[] {
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!data || typeof data !== 'object' || !('version' in data) ||
      (data.version !== 1 && data.version !== 2 && data.version !== 3) ||
      !('notes' in data) || !Array.isArray(data.notes)) throw new Error('Unrecognized saved notes.');
  const ids = new Set<string>();
  const notes: Note[] = data.notes.map((value: unknown) => {
    if (!value || typeof value !== 'object') throw new Error('Invalid note.');
    const n = value as Record<string, unknown>;
    if (typeof n.id !== 'string' || !n.id || ids.has(n.id) || typeof n.content !== 'string' ||
      typeof n.createdAt !== 'string' || !Number.isFinite(Date.parse(n.createdAt)) ||
      typeof n.updatedAt !== 'string' || !Number.isFinite(Date.parse(n.updatedAt)) ||
      (n.deletedAt !== undefined && n.deletedAt !== null &&
        (typeof n.deletedAt !== 'string' || !Number.isFinite(Date.parse(n.deletedAt)))) ||
      (n.isPinned !== undefined && typeof n.isPinned !== 'boolean') ||
      (n.isFavorite !== undefined && typeof n.isFavorite !== 'boolean') ||
      (n.folder !== undefined && typeof n.folder !== 'string') ||
      (n.tags !== undefined && (!Array.isArray(n.tags) || n.tags.some((tag) => typeof tag !== 'string')))) {
      throw new Error('Invalid note.');
    }
    ids.add(n.id);
    return { ...n, id: n.id, content: n.content, createdAt: n.createdAt, updatedAt: n.updatedAt,
      deletedAt: (n.deletedAt as string | null | undefined) ?? null,
      isPinned: (n.isPinned as boolean | undefined) ?? false,
      isFavorite: (n.isFavorite as boolean | undefined) ?? false,
      folder: (n.folder as string | undefined) ?? '',
      tags: (n.tags as string[] | undefined) ?? [],
      attachments: Array.isArray(n.attachments) ? n.attachments as AttachmentMeta[] : [] };
  });
  return sortNotes(notes);
}
export function encodeNotes(notes: Note[]): string { return JSON.stringify({ version: 3, notes }); }
export function formatListDate(iso: string): string {
  const date = new Date(iso), now = new Date();
  if (date.toDateString() === now.toDateString()) return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(date);
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}) }).format(date);
}
export function formatNoteDate(iso: string): string {
  return new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}
