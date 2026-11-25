import test from 'node:test';
import assert from 'node:assert/strict';
import { findSessions, matchingIndices } from '../src/storage/search';
import type { Session } from '../src/types';

const example: Session = {id:'a', title:'First lesson', mode:'Lecture', startedAt:0, durationMs:0,
  allowAI:false, captions:[{at:0,text:'First line.'},{at:2,text:'An EXAMPLE to remember.'}]};
test('search matches titles and caption passages without changing notebook order', () => {
  const second = {...example, id:'b', title:'Example lecture', captions:[]};
  const results = findSessions([second, example], '  example ');
  assert.deepEqual(results.map(item => item.session.id), ['b','a']);
  assert.equal(results[0].excerpt, undefined);
  assert.match(results[1].excerpt!, /EXAMPLE/);
  assert.deepEqual(matchingIndices(example.captions, 'EXample'), [1]);
  assert.deepEqual(findSessions([example], 'missing'), []);
});
