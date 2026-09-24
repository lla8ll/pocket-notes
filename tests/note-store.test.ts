import test from 'node:test';
import assert from 'node:assert/strict';
import { NoteStoreService } from '../src/application/notes/NoteStoreService.ts';
import type { NoteRepository } from '../src/domain/notes/NoteRepository.ts';
import type { Note } from '../src/utils/notes.ts';

const note: Note = { id: '1', content: 'Architecture', createdAt: '2026-09-24T00:00:00Z', updatedAt: '2026-09-24T00:00:00Z', deletedAt: null, isPinned: false };

class MemoryRepo implements NoteRepository {
  notes: Note[] = [];
  async load() { return this.notes; }
  async save(notes: Note[]) { this.notes = notes; }
  async clear() { this.notes = []; }
}

class LegacyRepo implements NoteRepository {
  constructor(private notes: Note[]) {}
  async load() { return this.notes; }
  async save(notes: Note[]) { this.notes = notes; }
  async clear() { this.notes = []; }
}

class FailingRepo implements NoteRepository {
  async load(): Promise<Note[]> { throw new Error('IDB failed'); }
  async save(): Promise<void> { throw new Error('IDB failed'); }
  async clear(): Promise<void> { throw new Error('IDB failed'); }
}

test('service migrates legacy notes into the primary repository when it is empty', async () => {
  const primary = new MemoryRepo();
  const service = new NoteStoreService(primary, new LegacyRepo([note]));
  assert.deepEqual(await service.load(), [note]);
  assert.deepEqual(primary.notes, [note]);
});

test('service prefers the primary repository after migration', async () => {
  const primary = new MemoryRepo();
  primary.notes = [note];
  const service = new NoteStoreService(primary, new LegacyRepo([]));
  assert.deepEqual(await service.load(), [note]);
});

test('service falls back to legacy storage when the primary repository fails', async () => {
  const service = new NoteStoreService(new FailingRepo(), new LegacyRepo([note]));
  assert.deepEqual(await service.load(), [note]);
});

test('service falls back to legacy storage when a primary save fails', async () => {
  const legacy = new LegacyRepo([]);
  const service = new NoteStoreService(new FailingRepo(), legacy);
  await service.save([note]);
  assert.deepEqual(await legacy.load(), [note]);
});
