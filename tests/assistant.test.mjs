import test from 'node:test';
import assert from 'node:assert/strict';
import { assist, headings, splitText } from '../server/assistant.mjs';

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
test('chunks keep the end of long input and split very long utterances', () => {
  const source = 'A'.repeat(17000) + ' LAST';
  const parts = splitText(source);
  assert.ok(parts.length > 1);
  assert.ok(parts.every(part => part.length <= 6000));
  assert.match(parts.at(-1), /LAST/);
});
test('rejects empty transcripts before contacting the model', async () => {
  await assert.rejects(assist('notes', { transcript: ' ', mode: 'Lecture' }, () => assert.fail()), /transcript/i);
});
