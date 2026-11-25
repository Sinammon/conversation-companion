import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import demos from '../../src/ai/demos.json' with { type: 'json' };
import { createNotesServer } from '../../server/service.mjs';

test('private live notes return a cited draft for an invented meeting passage', async t => {
  const key = process.env.GEMINI_API_KEY?.trim();
  assert.ok(key, 'Set GEMINI_API_KEY for the private test.');
  const server = createNotesServer({key, model:process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite', origins:[], liveNotesEnabled:true});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  const transcript = 'The imaginary workshop will meet on Friday. Bring a pencil for the drawing exercise.';
  const reply = await fetch('http://127.0.0.1:' + server.address().port + '/live-notes', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({approvedProvider:'gemini', liveConsent:true, mode:'Meeting', transcript}),
  });
  const data = await reply.json();
  assert.equal(reply.status, 200, data.error);
  assert.ok(data.items.length > 0 && data.items.length <= 3);
  assert.ok(data.items.every(item => item.text && item.quote && transcript.includes(item.quote)));
});

test('Gemini generates grounded notes in both modes and answers questions about a non-demo transcript', async t => {
  const key = process.env.GEMINI_API_KEY?.trim();
  assert.ok(key, 'Set GEMINI_API_KEY on the PC or in the workflow secret.');
  const server = createNotesServer({ key, model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite', origins: [] });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  async function query(path, { mode, lines }, question) {
    const transcript = lines.join('\n');
    const response = await fetch('http://127.0.0.1:' + server.address().port + '/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, transcript, question, approvedProvider: 'gemini' }),
    });
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    return data;
  }

  const recording = {
    mode: 'Meeting',
    lines: ['The field trip was on Tuesday. Correction: the trip is now Friday.', 'Tara will bring the maps.'],
  };
  for (const session of [demos.lecture, recording]) {
    const notes = await query('notes', session);
    assert.ok(notes.summary);
    const items = notes.sections.flatMap(section => section.items);
    assert.ok(items.length);
    assert.ok(items.every(item => item.quote && session.lines.join('\n').includes(item.quote)));
    if (session === recording) {
      const actions = notes.sections.find(section => section.heading === 'Action items').items;
      assert.ok(actions.some(item => /Tara/i.test(item.text) && /maps/i.test(item.text) && item.quote.includes(recording.lines[1])));
    }
  }
  const supported = await query('ask', recording, 'When is the field trip?');
  assert.match(supported.answer, /Friday/i);
  assert.match(supported.quote, /Friday/i);
  assert.ok(recording.lines[0].includes(supported.quote));
  const unsupported = await query('ask', recording, 'How much does the field trip cost?');
  assert.equal(unsupported.quote, null);
  assert.match(unsupported.answer, /not enough information/i);
});
