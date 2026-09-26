import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeNotes } from '../src/cloud/merge.ts';
import type { Note } from '../src/utils/notes.ts';

function note(id: string, updatedAt: string, extra: Partial<Note> = {}): Note {
  return {
    id, content: `content-${id}`, createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt, deletedAt: null, isPinned: false, ...extra,
  };
}

test('merge keeps local note when there is no remote counterpart', () => {
  const local = [note('a', '2026-01-02T00:00:00.000Z')];
  const merged = mergeNotes(local, []);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'a');
});

test('merge adds remote note absent locally', () => {
  const merged = mergeNotes([], [note('b', '2026-01-02T00:00:00.000Z')]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'b');
});

test('last-write-wins: newer remote replaces older local', () => {
  const local = [note('a', '2026-01-01T00:00:00.000Z', { content: 'old' })];
  const remote = [note('a', '2026-01-05T00:00:00.000Z', { content: 'new' })];
  const merged = mergeNotes(local, remote);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].content, 'new');
});

test('last-write-wins: newer local is kept over older remote', () => {
  const local = [note('a', '2026-01-05T00:00:00.000Z', { content: 'local-new' })];
  const remote = [note('a', '2026-01-01T00:00:00.000Z', { content: 'remote-old' })];
  const merged = mergeNotes(local, remote);
  assert.equal(merged[0].content, 'local-new');
});

test('merge preserves a remote deletion that is newer', () => {
  const local = [note('a', '2026-01-01T00:00:00.000Z')];
  const remote = [note('a', '2026-01-05T00:00:00.000Z', { deletedAt: '2026-01-05T00:00:00.000Z' })];
  const merged = mergeNotes(local, remote);
  assert.equal(merged[0].deletedAt, '2026-01-05T00:00:00.000Z');
});

test('merge unions distinct notes from both sides', () => {
  const local = [note('a', '2026-01-02T00:00:00.000Z')];
  const remote = [note('b', '2026-01-02T00:00:00.000Z')];
  const merged = mergeNotes(local, remote);
  assert.deepEqual(merged.map((n) => n.id).sort(), ['a', 'b']);
});

test('equal timestamps keep the local copy (no needless overwrite)', () => {
  const ts = '2026-01-02T00:00:00.000Z';
  const local = [note('a', ts, { content: 'local' })];
  const remote = [note('a', ts, { content: 'remote' })];
  const merged = mergeNotes(local, remote);
  assert.equal(merged[0].content, 'local');
});
