import http from 'node:http';
import { assist, InputError } from './assistant.mjs';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8787);
const model = process.env.OLLAMA_MODEL || 'qwen2.5:3b';
const ollama = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:8081';
let active = 0;

async function readBody(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 900000) throw new InputError('The transcript is too large.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw new InputError('Expected a JSON request.'); }
}

http.createServer(async (req, res) => {
  function send(status, body) {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(body));
  }
  if (req.headers.origin && req.headers.origin !== webOrigin) return send(403, { error: 'Browser origin is not enabled.' });
  if (req.headers.origin) res.setHeader('Access-Control-Allow-Origin', webOrigin);
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    return send(200, {});
  }
  if (req.method === 'GET' && req.url === '/health') return send(200, { status: 'ready', model });
  const task = req.url === '/notes' ? 'notes' : req.url === '/ask' ? 'ask' : null;
  if (!task || req.method !== 'POST') return send(404, { error: 'Unknown endpoint.' });
  if (active >= 2) return send(429, { error: 'The notes service is busy. Try again shortly.' });
  active++;
  const controller = new AbortController();
  res.once('close', () => controller.abort());
  try {
    const input = await readBody(req);
    const generate = async (system, data, format) => {
      const reply = await fetch(new URL('/api/chat', ollama), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(120000)]),
        body: JSON.stringify({ model, format, stream: false, options: { temperature: 0, num_ctx: 8192 },
          messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(data) }] }),
      });
      if (!reply.ok) throw new Error('Model unavailable');
      return JSON.parse((await reply.json()).message.content);
    };
    send(200, await assist(task, input, generate));
  } catch (error) {
    if (res.destroyed) return;
    send(error instanceof InputError ? 400 : 503, { error: error instanceof InputError ? error.message :
      'AI notes are unavailable. Check that Ollama is running with the configured model, then retry.' });
  } finally { active--; }
}).listen(port, host, () => console.log('Companion notes service listening on http://' + host + ':' + port));
