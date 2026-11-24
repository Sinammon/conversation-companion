import test from 'node:test';
import assert from 'node:assert/strict';
import { assist, headings } from '../server/assistant.mjs';

// Synthetic development fixture. Never bundled in the app or shown as a real session.
const transcript = 'The lab meets on Thursday. Bring your notebook.';
test('rejects an invented source quote and abstains when the transcript cannot answer', async () => {
  const answer = await assist('ask', { transcript, mode: 'Lecture', question: 'Who leads?' },
    async () => ({ answer: 'Alex.', quote: 'Alex leads the lab.' }));
  assert.equal(answer.quote, null);
  assert.match(answer.answer, /transcript/i);
});
test('returns a grounded answer with its exact source', async () => {
  const answer = await assist('ask', { transcript, mode: 'Meeting', question: 'When?' },
    async () => ({ answer: 'Thursday.', quote: 'The lab meets on Thursday.' }));
  assert.equal(answer.quote, 'The lab meets on Thursday.');
});
for (const mode of ['Lecture', 'Meeting']) {
  test(mode + ' notes use mode-specific headings and discard unsupported facts', async () => {
    const notes = await assist('notes', { transcript, mode }, async () => ({
      items: [
        { section: headings[mode][0], text: 'The lab meets Thursday.', quote: 'The lab meets on Thursday.' },
        { section: headings[mode][1], text: 'Meet Friday.', quote: 'Friday.' },
      ],
    }));
    assert.deepEqual(notes.sections.map(s => s.heading), headings[mode]);
    assert.equal(notes.sections[1].items.length, 0);
    assert.equal(notes.summary, 'The lab meets Thursday.');
  });
}
test('one request includes a later correction in a long transcript', async () => {
  const old = 'Our first plan was Tuesday.';
  const change = 'Correction, the meeting is Friday.';
  const long = old + '\n' + 'Background. '.repeat(560) + '\n' + change;
  let calls = 0;
  const result = await assist('ask', { transcript: long, mode: 'Meeting', question: 'When is the meeting?' },
    async (_rules, data) => {
      calls++;
      assert.equal(data.transcript, long);
      return { answer: 'Friday.', quote: change };
    });
  assert.equal(calls, 1);
  assert.equal(result.quote, change);
});
test('rejects empty transcripts before contacting the model', async () => {
  await assert.rejects(assist('notes', { transcript: ' ', mode: 'Lecture' }, () => assert.fail()), /transcript/i);
});
