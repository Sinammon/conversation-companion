import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createNotesServer } from '../server/service.mjs';

const desktopOrigin = 'http://localhost:8081';
const phoneOrigin = 'http://10.0.0.207:8081';
const body = {
  approvedProvider: 'gemini',
  demoId: 'meeting',
  mode: 'Meeting',
  transcript: 'The lab meets Thursday.\nMaya will bring the notebook.',
  question: 'When does the lab meet?',
};
const quote = 'The lab meets Thursday.';
const answer = { answer: 'Thursday.', quote };
const modelReply = text => Response.json({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text }] } }] });

async function open(t, options = {}) {
  const calls = [];
  const server = createNotesServer({
    key: 'test-only-key', model: 'gemini-3.1-flash-lite', origins: [desktopOrigin, phoneOrigin],
    ...options,
    fetchModel: async (...args) => {
      calls.push(args);
      return options.fetchModel ? options.fetchModel(...args) : modelReply(JSON.stringify(answer));
    },
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  const url = 'http://127.0.0.1:' + server.address().port;
  const post = (override = {}, origin = phoneOrigin, path = '/ask') => fetch(url + path, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ ...body, ...override }),
  });
  return { calls, post, url };
}

test('pilot needs the server switch and explicit live consent, and returns batch-grounded drafts', async t => {
  const disabled = await open(t);
  assert.equal((await disabled.post({liveConsent:true}, phoneOrigin, '/live-notes')).status, 404);
  const items = [{text:'Meet Thursday.', quote}];
  const pilot = await open(t, {liveNotesEnabled:true, fetchModel:() => modelReply(JSON.stringify({items}))});
  assert.equal((await pilot.post({}, phoneOrigin, '/live-notes')).status, 409);
  assert.equal(pilot.calls.length, 0);
  const post = () => pilot.post({liveConsent:true}, phoneOrigin, '/live-notes');
  const response = await post();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {items});
  items[0].quote = 'Made up';
  assert.equal((await post()).status, 502);
  assert.equal(disabled.calls.length, 0);
});

test('both configured browser origins can preflight and ask Gemini for a cited answer', async t => {
  const { calls, post, url } = await open(t);
  for (const origin of [desktopOrigin, phoneOrigin]) {
    const preflight = await fetch(url + '/ask', { method: 'OPTIONS', headers: {
      Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type',
    } });
    assert.equal(preflight.status, 200);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    assert.equal(preflight.headers.get('vary'), 'Origin');
    const response = await post({}, origin);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.deepEqual(await response.json(), answer);
  }
  const [endpoint, request] = calls[0];
  assert.equal(String(endpoint), 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent');
  assert.equal(request.headers['x-goog-api-key'], 'test-only-key');
  const input = JSON.parse(request.body);
  assert.equal(input.generationConfig.responseMimeType, 'application/json');
  assert.equal(input.generationConfig.responseJsonSchema.type, 'object');
  assert.deepEqual(JSON.parse(input.contents[0].parts[0].text), { transcript: body.transcript, question: body.question });
});

test('Gemini notes preserve the Meeting action and supporting quote', async t => {
  const quote = 'Maya will bring the notebook.';
  const { post } = await open(t, { fetchModel: () => modelReply(JSON.stringify({
    items: [{ section: 'Action items', text: quote, quote }],
  })) });
  const response = await post({ question: undefined }, phoneOrigin, '/notes');
  assert.equal(response.status, 200);
  const notes = await response.json();
  assert.equal(notes.summary, quote);
  assert.deepEqual(notes.sections[2], { heading: 'Action items', items: [{ text: quote, quote }] });
});

test('foreign origins, legacy approvals and invalid inputs never reach Gemini', async t => {
  const { calls, post, url } = await open(t);
  const foreign = 'https://unrelated.example';
  assert.equal((await fetch(url + '/ask', { method: 'OPTIONS', headers: { Origin: foreign } })).status, 403);
  assert.equal((await post({}, foreign)).status, 403);
  assert.equal((await post({ approvedProvider: undefined })).status, 409);
  assert.equal((await post({ approvedProvider: 'ollama' })).status, 409);
  for (const invalid of [{ transcript: ' ' }, { transcript: 'x'.repeat(200001) },
    { question: ' ' }, { question: 'x'.repeat(1001) }, { mode: 'Other' }]) {
    assert.equal((await post(invalid)).status, 400);
  }
  assert.equal((await post({ transcript: 'x'.repeat(2 * 1024 * 1024 + 1) })).status, 413);
  assert.equal(calls.length, 0);
});

test('an approved saved transcript and a typed question reach Gemini without session metadata', async t => {
  const { calls, post } = await open(t);
  const transcript = 'Background. '.repeat(1000) + '\n' + quote;
  const question = 'Can you tell me what day the lab meets?';
  const res = await post({ demoId: undefined, transcript, question, title: 'private title' });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), answer);
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(JSON.parse(calls[0][1].body).contents[0].parts[0].text), { transcript, question });
});

test('missing key, quota, timeout and invalid output return useful errors', async t => {
  for (const scenario of [
    { options: { key: '' }, status: 503, message: /GEMINI_API_KEY/, calls: 0 },
    { options: { fetchModel: () => Response.json({ error: { details: [{ reason: 'API_KEY_INVALID' }] } }, { status: 400 }) },
      status: 503, message: /GEMINI_API_KEY/, calls: 1 },
    { options: { fetchModel: () => new Response(null, { status: 429 }) }, status: 429, message: /quota/i, calls: 1 },
    { options: { timeoutMs: 5, fetchModel: async (_url, init) => {
      await once(init.signal, 'abort');
      throw init.signal.reason;
    } }, status: 504, message: /too long/i, calls: 1 },
    { options: { fetchModel: () => modelReply('not JSON') }, status: 502, message: /unreadable/i, calls: 1 },
  ]) {
    const { post, calls } = await open(t, scenario.options);
    const response = await post();
    assert.equal(response.status, scenario.status);
    assert.match((await response.json()).error, scenario.message);
    assert.equal(calls.length, scenario.calls);
  }
});
