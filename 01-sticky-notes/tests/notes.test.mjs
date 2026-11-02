import test from 'node:test';
import assert from 'node:assert/strict';
import { notesReducer } from '../src/model/notesReducer.ts';
import { loadNotes, saveNotes } from '../src/persistence/localNotes.ts';

const note = (id, overrides = {}) => ({
  id, text: '', x: 0, y: 0, width: 200, height: 160, color: 'butter', z: 1, ...overrides,
});
const state = (...notes) => ({ notes, recentlyDeleted: null });

test('create adds a unique note above existing notes', () => {
  const result = notesReducer(state(note('a', { z: 7 })), {
    type: 'created', id: 'b', rect: { x: 3, y: 4, width: 210, height: 170 }, color: 'mint',
  });
  assert.equal(result.notes.length, 2);
  assert.equal(result.notes[1].z, 8);
  assert.equal(result.notes[1].x, 3);
});
test('editing one note leaves unrelated note object unchanged', () => {
  const other = note('other');
  const result = notesReducer(state(note('a'), other), { type: 'textChanged', id: 'a', text: 'Hello' });
  assert.equal(result.notes[0].text, 'Hello');
  assert.equal(result.notes[1], other);
});
test('unchanged edits do not create a new state', () => {
  const original = state(note('a'));
  assert.equal(notesReducer(original, { type: 'textChanged', id: 'a', text: '' }), original);
  assert.equal(notesReducer(original, { type: 'deleted', id: 'missing' }), original);
});
test('bring to front resolves overlapping notes', () => {
  const result = notesReducer(state(note('a'), note('b', { z: 2 })), { type: 'broughtToFront', id: 'a' });
  assert.equal(result.notes[0].z, 3);
});
test('drag deletion can be undone without losing text or position', () => {
  const original = note('a', { text: 'important', x: 70, y: 80 });
  const deleted = notesReducer(state(original, note('b')), { type: 'deleted', id: 'a' });
  assert.equal(deleted.notes.length, 1);
  const restored = notesReducer(deleted, { type: 'deletionUndone' });
  assert.equal(restored.notes[1], original);
});
test('undo expiration removes the ability to restore', () => {
  const deleted = notesReducer(state(note('a')), { type: 'deleted', id: 'a' });
  assert.equal(notesReducer(deleted, { type: 'undoExpired' }).recentlyDeleted, null);
});
test('storage restores valid notes, ignoring malformed and duplicate entries', () => {
  const valid = note('a');
  const storage = { getItem: () => JSON.stringify([valid, { id: 'bad' }, { ...valid, text: 'duplicate' }]) };
  assert.deepEqual(loadNotes(storage), [valid]);
});
test('storage load handles invalid JSON and blocked storage', () => {
  assert.deepEqual(loadNotes({ getItem: () => 'broken-json' }), []);
  assert.deepEqual(loadNotes({ getItem: () => { throw new Error('blocked'); } }), []);
});
test('save detects unavailable storage without throwing', () => {
  assert.equal(saveNotes([note('a')], { setItem: () => { throw new Error('quota'); } }), false);
  let written = '';
  assert.equal(saveNotes([note('a')], { setItem: (_, value) => { written = value; } }), true);
  assert.equal(JSON.parse(written).length, 1);
});
