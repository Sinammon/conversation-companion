import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import demos from '../../src/ai/demos.json' with { type: 'json' };
import { createNotesServer } from '../../server/service.mjs';

test('Gemini generates grounded notes in both modes and answers only supported demo questions', async t => {
  const key = process.env.GEMINI_API_KEY?.trim();
  assert.ok(key, 'Set GEMINI_API_KEY on the PC or in the workflow secret.');
  const server = createNotesServer({ key, model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite', origins: [] });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  async function query(path, demoId, question) {
    const demo = demos[demoId];
    const transcript = demo.lines.join('\n');
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demoId, mode: demo.mode, transcript, question, approvedProvider: 'gemini' }),
    });
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    return data;
  }

  for (const demoId of ['lecture', 'meeting']) {
    const notes = await query('notes', demoId);
    assert.ok(notes.summary);
    const items = notes.sections.flatMap(section => section.items);
    assert.ok(items.length);
    assert.ok(items.every(item => item.quote && demos[demoId].lines.join('\n').includes(item.quote)));
    if (demoId === 'meeting') {
      const actions = notes.sections.find(section => section.heading === 'Action items').items;
      assert.ok(actions.some(item => /Maya/i.test(item.text) && /notebook/i.test(item.text) && item.quote === demos.meeting.lines[1]));
    }
  }
  const supported = await query('ask', 'meeting', demos.meeting.questions[0]);
  assert.match(supported.answer, /Thursday/i);
  assert.equal(supported.quote, demos.meeting.lines[0]);
  const unsupported = await query('ask', 'meeting', demos.meeting.questions[1]);
  assert.equal(unsupported.quote, null);
  assert.match(unsupported.answer, /not enough information/i);
});
