import test from 'node:test';
import assert from 'node:assert/strict';
import { activeNotes, applyNoteAction, DAY_MS, decodeNotes, deletedNotes, encodeNotes, getPreview,
  getTitle, isExpired, purgeExpired, remainingDays, remainingLabel, RETENTION_MS, sortNotes, STORAGE_KEY } from '../src/utils/notes.ts';
import type { Note } from '../src/utils/notes.ts';
import { readNotebook, writeNotebook } from '../src/utils/storage.ts';
import { copyNote, shareNote } from '../src/utils/sharing.ts';

const first: Note = { id: 'a', content: 'First\nA second line', createdAt: '2026-09-09T09:00:00Z', updatedAt: '2026-09-09T09:00:00Z', deletedAt: null, isPinned: false };
const second: Note = { id: 'b', content: 'Second', createdAt: '2026-09-09T10:00:00Z', updatedAt: '2026-09-09T10:00:00Z', deletedAt: null, isPinned: false };

test('a first visit and a saved empty notebook are distinct valid states', () => {
  assert.deepEqual(decodeNotes(null), []);
  assert.deepEqual(decodeNotes(encodeNotes([])), []);
});
test('the first nonempty line supplies the title, including Arabic', () => {
  assert.equal(getTitle('\n  \n  أفكاري اليومية  \nنص الملاحظة'), 'أفكاري اليومية');
  assert.equal(getTitle('\r\n First line\r\nSecond'), 'First line');
  assert.equal(getTitle(' \n\t'), 'New Note');
});
test('preview omits the title and blank lines', () => {
  assert.equal(getPreview('\nTitle\n\nOne\nTwo'), 'One Two');
  assert.equal(getPreview('Title'), '');
});
test('saving preserves every character, whitespace and line ending', () => {
  const note = { ...first, content: '  Title\n\nالعربية and English 📝\n  indent\n' };
  assert.deepEqual(decodeNotes(encodeNotes([note])), [note]);
});
test('latest edit sorts first without mutating the supplied array', () => {
  const source = [first, second];
  assert.deepEqual(sortNotes(source).map((note) => note.id), ['b', 'a']);
  assert.deepEqual(source.map((note) => note.id), ['a', 'b']);
  assert.equal(sortNotes([{ ...first, updatedAt: '2026-09-10T01:00:00Z' }, second])[0].id, 'a');
});
test('malformed storage is rejected instead of silently replacing user notes', () => {
  for (const raw of ['{', 'null', '[]', '{"version":3,"notes":[]}']) {
    assert.throws(() => decodeNotes(raw));
  }
});
test('duplicate identifiers, invalid dates and non-text content are rejected', () => {
  assert.throws(() => decodeNotes(encodeNotes([first, first])));
  assert.throws(() => decodeNotes(encodeNotes([{ ...first, updatedAt: 'invalid' }])));
  assert.throws(() => decodeNotes(JSON.stringify({ version: 1, notes: [{ ...first, content: 42 }] })));
});
test('deleting the last note survives the storage round trip', () => {
  const remaining = [first].filter((note) => note.id !== first.id);
  assert.deepEqual(decodeNotes(encodeNotes(remaining)), []);
});

const now = Date.parse('2026-09-09T12:00:00Z');
const deletedAt = new Date(now).toISOString();

class MemoryStorage {
  value: string | null;
  writes = 0;
  failRead = false;
  failWrite = false;
  constructor(value: string | null = null) { this.value = value; }
  getItem(key: string) {
    assert.equal(key, STORAGE_KEY);
    if (this.failRead) throw new Error('Storage denied');
    return this.value;
  }
  setItem(key: string, value: string) {
    assert.equal(key, STORAGE_KEY);
    if (this.failWrite) throw new Error('Quota exceeded');
    this.writes += 1;
    this.value = value;
  }
}

test('v1 migration preserves every original field, unknown metadata and whitespace', () => {
  const legacy = { id: 'legacy', content: '  أفكاري\n\n  Text 📝\n', createdAt: first.createdAt,
    updatedAt: first.updatedAt, customMetadata: { color: 'yellow' } };
  const raw = JSON.stringify({ version: 1, notes: [legacy] });
  const storage = new MemoryStorage(raw);
  const loaded = readNotebook(storage, now);
  assert.equal(storage.value, raw);
  assert.equal(loaded.needsWrite, true);
  assert.deepEqual(loaded.notes, [{ ...legacy, deletedAt: null, isPinned: false }]);
  writeNotebook(storage, loaded.notes, loaded.raw);
  assert.equal(storage.writes, 1);
  const reloaded = readNotebook(storage, now);
  assert.deepEqual(reloaded.notes, loaded.notes);
  assert.equal(reloaded.needsWrite, false);
  assert.equal(JSON.parse(storage.value!).version, 2);
});

test('migration write failure leaves the entire original payload intact', () => {
  const raw = JSON.stringify({ version: 1, notes: [{ id: first.id, content: first.content,
    createdAt: first.createdAt, updatedAt: first.updatedAt }] });
  const storage = new MemoryStorage(raw);
  const loaded = readNotebook(storage, now);
  storage.failWrite = true;
  assert.throws(() => writeNotebook(storage, loaded.notes, loaded.raw));
  assert.equal(storage.value, raw);
  assert.equal(storage.writes, 0);
  storage.failWrite = false;
  writeNotebook(storage, loaded.notes, loaded.raw);
  assert.equal(readNotebook(storage, now).notes[0].content, first.content);
});

test('partly damaged data and unreadable storage are never overwritten', () => {
  const raw = JSON.stringify({ version: 1, notes: [first, { ...second, content: 42 }] });
  const storage = new MemoryStorage(raw);
  assert.throws(() => readNotebook(storage, now));
  assert.equal(storage.value, raw);
  assert.equal(storage.writes, 0);
  storage.failRead = true;
  assert.throws(() => readNotebook(storage, now));
  assert.equal(storage.value, raw);
});

test('newer storage from another tab cannot be replaced by a stale write', () => {
  const storage = new MemoryStorage(encodeNotes([first]));
  const previous = readNotebook(storage, now);
  storage.value = encodeNotes([first, second]);
  const newer = storage.value;
  assert.throws(() => writeNotebook(storage, [], previous.raw), /storage-conflict/);
  assert.equal(storage.value, newer);
});

test('missing new fields default safely and invalid explicit fields are rejected', () => {
  const old = { id: 'old', content: '', createdAt: first.createdAt, updatedAt: first.updatedAt };
  for (const version of [1, 2]) {
    const [note] = decodeNotes(JSON.stringify({ version, notes: [old] }));
    assert.equal(note.deletedAt, null);
    assert.equal(note.isPinned, false);
  }
  for (const extra of [{ deletedAt: 'invalid' }, { isPinned: 'false' }, { deletedAt: 123 }]) {
    assert.throws(() => decodeNotes(JSON.stringify({ version: 2, notes: [{ ...old, ...extra }] })));
  }
});

test('deleting moves a pinned note to trash and preserves all unrelated metadata', () => {
  const original = { ...first, isPinned: true, customMetadata: { important: true } };
  const moved = applyNoteAction([original, second], { type: 'delete', id: first.id }, now);
  assert.deepEqual(moved[0], { ...original, deletedAt });
  assert.deepEqual(activeNotes(moved).map((note) => note.id), ['b']);
  assert.deepEqual(deletedNotes(moved, now).map((note) => note.id), ['a']);
  const reloaded = decodeNotes(encodeNotes(moved));
  assert.equal(deletedNotes(reloaded, now)[0].isPinned, true);
  const recovered = applyNoteAction(reloaded, { type: 'recover', id: first.id }, now + DAY_MS);
  assert.deepEqual(recovered.find((note) => note.id === first.id), original);
  assert.deepEqual(activeNotes(recovered).map((note) => note.id), ['a', 'b']);
  assert.equal(deletedNotes(recovered, now).length, 0);
  assert.equal(recovered.filter((note) => note.id === first.id).length, 1);
});

test('pinning changes grouping without changing last-edit timestamps', () => {
  const pinned = applyNoteAction([first, second], { type: 'pin', id: first.id }, now);
  assert.deepEqual(activeNotes(pinned).map((note) => note.id), ['a', 'b']);
  assert.equal(pinned[0].updatedAt, first.updatedAt);
  assert.equal(decodeNotes(encodeNotes(pinned))[0].isPinned, true);
  const unpinned = applyNoteAction(pinned, { type: 'pin', id: first.id }, now);
  assert.deepEqual(activeNotes(unpinned).map((note) => note.id), ['b', 'a']);
  const both = [ { ...first, isPinned: true }, { ...second, isPinned: true } ];
  assert.deepEqual(activeNotes(both).map((note) => note.id), ['b', 'a']);
});

test('trash cannot be edited or pinned and repeated deletion does not reset its deadline', () => {
  const note = { ...first, deletedAt };
  const source = [note];
  assert.equal(applyNoteAction(source, { type: 'delete', id: note.id }, now + DAY_MS), source);
  assert.equal(applyNoteAction(source, { type: 'pin', id: note.id }, now + DAY_MS), source);
  assert.equal(applyNoteAction(source, { type: 'edit', id: note.id, content: 'changed' }, now + DAY_MS), source);
});

test('permanent deletion works only in trash and persists without orphaned notes', () => {
  assert.deepEqual(applyNoteAction([first], { type: 'destroy', id: first.id }, now), [first]);
  const result = applyNoteAction([{ ...first, deletedAt }], { type: 'destroy', id: first.id }, now);
  const storage = new MemoryStorage();
  writeNotebook(storage, result, null);
  assert.deepEqual(readNotebook(storage, now).notes, []);
  assert.equal(storage.value, '{"version":2,"notes":[]}');
});

test('30-day deadline uses elapsed time exactly, including the boundary millisecond', () => {
  const note = { ...first, deletedAt };
  assert.equal(isExpired(note, now + RETENTION_MS - 1), false);
  assert.equal(isExpired(note, now + RETENTION_MS), true);
  assert.equal(remainingDays(note, now), 30);
  assert.equal(remainingDays(note, now + 18 * DAY_MS), 12);
  assert.equal(remainingDays(note, now + 28 * DAY_MS), 2);
  assert.equal(remainingLabel(note, now + 29 * DAY_MS), '1 day remaining');
  assert.equal(remainingDays(note, now + RETENTION_MS - 1), 1);
  assert.equal(remainingDays(note, now + RETENTION_MS), 0);
  assert.equal(remainingDays(note, now + 35 * DAY_MS), 0);
  assert.equal(remainingDays(note, now - DAY_MS), 30);
  assert.equal(isExpired(first, now + 100 * DAY_MS), false);
});

test('reopening after 35 days cleans expired notes from persisted storage', () => {
  const storage = new MemoryStorage(encodeNotes([{ ...first, deletedAt }, second]));
  const loaded = readNotebook(storage, now + 35 * DAY_MS);
  assert.deepEqual(loaded.notes, [second]);
  assert.equal(loaded.needsWrite, true);
  writeNotebook(storage, loaded.notes, loaded.raw);
  assert.deepEqual(readNotebook(storage, now + 35 * DAY_MS).notes, [second]);
  assert.equal(storage.value!.includes('"id":"a"'), false);
});

test('an expired note cannot be recovered, including at the exact deadline', () => {
  const source = [{ ...first, deletedAt }];
  assert.deepEqual(applyNoteAction(source, { type: 'recover', id: first.id }, now + RETENTION_MS), []);
  assert.deepEqual(deletedNotes(source, now + RETENTION_MS), []);
  assert.equal(purgeExpired([first], now)[0], first);
});

test('search covers titles and body, ignores case and edge whitespace, excludes trash', () => {
  const source = [
    { ...first, content: 'Shopping List\nMilk' },
    { ...second, content: 'Weekend\nGo SHOPPING', isPinned: true },
    { ...first, id: 'trash', content: 'Shopping in trash', deletedAt },
    { ...first, id: 'arabic', content: 'أفكاري\nوقت القراءة' },
    { ...first, id: 'blank', content: '' },
  ];
  const before = encodeNotes(source);
  assert.deepEqual(activeNotes(source, '  sHoPpInG  ').map((note) => note.id), ['b', 'a']);
  assert.equal(activeNotes(source, 'القراءة')[0].id, 'arabic');
  assert.equal(activeNotes(source, 'new note')[0].id, 'blank');
  assert.equal(activeNotes(source, 'not present').length, 0);
  assert.equal(activeNotes(source, '  ').length, 4);
  assert.equal(encodeNotes(source), before);
});

test('creation and editing still preserve Unicode, save times and unique identifiers', () => {
  const source = applyNoteAction([], { type: 'create', note: first }, now);
  const result = applyNoteAction(source, { type: 'edit', id: first.id, content: 'تجربة\n  Second line 📝\n' }, now);
  assert.equal(result[0].content, 'تجربة\n  Second line 📝\n');
  assert.equal(result[0].createdAt, first.createdAt);
  assert.equal(result[0].updatedAt, new Date(now).toISOString());
  assert.equal(applyNoteAction(result, { type: 'create', note: first }, now).length, 1);
  assert.deepEqual(decodeNotes(encodeNotes(result)), result);
});

test('native sharing receives the derived title and the complete unchanged content', async () => {
  const content = '\n  My note\nالعربية 📝\n';
  let received: unknown;
  const result = await shareNote(content, { share: async (data) => { received = data; } });
  assert.equal(result, 'shared');
  assert.deepEqual(received, { title: 'My note', text: content });
});

test('native share cancellation is quiet and does not copy anything', async () => {
  const result = await shareNote('Text', {
    share: async () => { throw Object.assign(new Error('Cancelled'), { name: 'AbortError' }); },
    clipboard: { writeText: async () => { assert.fail('Cancellation must not copy'); } },
  });
  assert.equal(result, 'cancelled');
});

test('unsupported, disallowed or failing native sharing offers copy', async () => {
  assert.equal(await shareNote('Text', {}), 'copy');
  assert.equal(await shareNote('Text', { share: async () => {}, canShare: () => false }), 'copy');
  assert.equal(await shareNote('Text', { share: async () => { throw new Error('Denied'); } }), 'copy');
  assert.equal(await shareNote('', {}), 'copy');
});

test('clipboard success copies exact text and missing or denied clipboard offers manual selection', async () => {
  for (const content of ['العربية\n  Text\n', '']) {
    let copied: string | null = null;
    assert.equal(await copyNote(content, { clipboard: { writeText: async (text) => { copied = text; } } }), 'copied');
    assert.equal(copied, content);
  }
  assert.equal(await copyNote('Text', {}), 'manual');
  assert.equal(await copyNote('Text', { clipboard: { writeText: async () => { throw new Error('Denied'); } } }), 'manual');
});
