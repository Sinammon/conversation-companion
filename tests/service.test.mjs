import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';

test('HTTP service calls the Ollama chat contract, verifies evidence and handles model failure', async t => {
  // A local development fixture exercises the wire protocol without a model download.
  const quote = 'The next lab is Thursday.';
  let offline = false;
  let modelRequest;
  const fixture = http.createServer(async (req, res) => {
    const parts = [];
    for await (const chunk of req) parts.push(chunk);
    modelRequest = { path: req.url, body: JSON.parse(Buffer.concat(parts).toString()) };
    res.writeHead(offline ? 503 : 200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: { content: JSON.stringify({ answer: 'Thursday.', quote }) } }));
  });
  fixture.listen(0, '127.0.0.1');
  await once(fixture, 'listening');
  t.after(() => fixture.close());
  const service = spawn(process.execPath, ['server/index.mjs'], { env: { ...process.env, HOST: '127.0.0.1', PORT: '0',
    OLLAMA_URL: 'http://127.0.0.1:' + fixture.address().port, OLLAMA_MODEL: 'development-fixture' }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => service.kill());
  const [startup] = await once(service.stdout, 'data', { signal: AbortSignal.timeout(15000) });
  const url = startup.toString().match(/http:\/\/127\.0\.0\.1:\d+/)[0];
  const post = (headers = {}) => fetch(url + '/ask', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ transcript: quote, mode: 'Lecture', question: 'When is the lab?' }) });
  const response = await post();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { answer: 'Thursday.', quote });
  assert.equal(modelRequest.path, '/api/chat');
  assert.equal(modelRequest.body.stream, false);
  assert.equal(modelRequest.body.model, 'development-fixture');
  assert.equal(modelRequest.body.format.type, 'object');
  assert.equal((await post({ Origin: 'https://unrelated.example' })).status, 403);
  offline = true;
  assert.equal((await post()).status, 503);
});
