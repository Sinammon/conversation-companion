import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { schema, writeSession, listSessions, removeSession, writeNotes, writeBookmarks } from '../src/storage/sql.ts';

test('a saved session reopens, updates by id, lists newest first, and can be deleted', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(schema);
  const save = db.prepare(writeSession);
  save.run('old', 1, '{"title":"A"}');
  save.run('recent', 2, '{"title":"B"}');
  save.run('old', 1, '{"title":"Updated"}');
  assert.deepEqual(db.prepare(listSessions).all().map(x => JSON.parse(x.data as string).title), ['B', 'Updated']);
  db.prepare(removeSession).run('recent');
  assert.equal(db.prepare(listSessions).all().length, 1);
  db.close();
});

test('a completed background notes job only updates a surviving session with matching consent', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(schema);
  const doc = { allowAI: true, approvedUrl: 'http://one.local', approvedProvider: 'gemini' };
  db.prepare(writeSession).run('chosen', 1, JSON.stringify(doc));
  const update = db.prepare(writeNotes);
  assert.equal(update.run('{}', 'chosen', 'http://two.local').changes, 0);
  db.prepare(writeSession).run('legacy', 0, JSON.stringify({ ...doc, approvedProvider: 'ollama' }));
  assert.equal(update.run('{}', 'legacy', doc.approvedUrl).changes, 0);
  assert.equal(update.run('{"summary":"Saved"}', 'chosen', doc.approvedUrl).changes, 1);
  assert.equal(JSON.parse(db.prepare(listSessions).get()!.data as string).notes.summary, 'Saved');
  db.prepare(writeBookmarks).run('[0]', 'chosen');
  const marked = JSON.parse(db.prepare(listSessions).get()!.data as string);
  assert.deepEqual(marked.bookmarks, [0]);
  assert.equal(marked.notes.summary, 'Saved');
  db.prepare(removeSession).run('chosen');
  assert.equal(update.run('{}', 'chosen', doc.approvedUrl).changes, 0);
  db.close();
});
