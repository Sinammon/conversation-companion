import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanBookmarks, passageIndices } from '../src/capture/bookmarks';
import { decodeSessions } from '../src/storage/decode-sessions';

test('bookmarks retain valid unique positions and a passage stays inside its transcript', () => {
  assert.deepEqual(cleanBookmarks([4, 0, 0, '1', -2, 2.5, 99], 5), [0, 4]);
  assert.deepEqual(passageIndices(4, 5), [2, 3, 4]);
  assert.deepEqual(passageIndices(2, 5), [0, 1, 2, 3, 4]);
});
test('legacy sessions and sessions with invalid bookmarks remain readable', () => {
  const session = { id: 's', title: 'Session', mode: 'Lecture', startedAt: 1, durationMs: 2000, captions: [{text:'Saved', at:0}] };
  for (const metadata of [{}, { bookmarks: ['bad', 10] }]) {
    const result = decodeSessions([{ id:'s', data: JSON.stringify({...session, ...metadata}) }]);
    assert.deepEqual(result.sessions[0].bookmarks ?? [], []);
  }
});
