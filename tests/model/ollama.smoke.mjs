import test from 'node:test';
import assert from 'node:assert/strict';

// Synthetic development fixture for the opt-in model test. Requires a running service.
const transcript = 'The team decided to hold the next meeting on Friday. Maya will reserve the classroom.';
async function query(path, extra = {}) {
  const res = await fetch('http://127.0.0.1:8787/' + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, mode: 'Meeting', ...extra }),
  });
  const data = await res.json();
  assert.equal(res.status, 200, JSON.stringify(data));
  return data;
}
test('real model produces supported meeting notes and answers a date question', async () => {
  const notes = await query('notes');
  assert.ok(notes.summary);
  const items = notes.sections.flatMap(s => s.items);
  assert.ok(items.length);
  assert.ok(items.every(i => i.quote && transcript.includes(i.quote)));
  const answer = await query('ask', { question: 'On which day is the next meeting?' });
  assert.match(answer.answer, /Friday/i);
  assert.ok(answer.quote && transcript.includes(answer.quote));
});
