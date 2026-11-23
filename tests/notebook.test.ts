import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { schema, writeSession, listSessions, removeSession } from '../src/storage/sql.ts';

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
