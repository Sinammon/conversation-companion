import http from 'node:http';
import demos from '../src/ai/demos.json' with { type: 'json' };
import { assist, InputError } from './assistant.mjs';
import { createGenerator, GeminiError } from './gemini.mjs';

async function readBody(request) {
  const chunks = [];
  let bytes = 0;
  // Continue draining oversized requests so the client can receive the error.
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes <= 8192) chunks.push(chunk);
  }
  if (bytes > 8192) throw new InputError('Only the bundled demo transcript is accepted.');
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw new InputError('Expected a JSON request.'); }
}

function demoInput(input, task) {
  const id = input?.demoId;
  const demo = typeof id === 'string' && Object.hasOwn(demos, id) ? demos[id] : undefined;
  const transcript = demo?.lines.join('\n');
  if (!demo || input.mode !== demo.mode || input.transcript !== transcript) {
    throw new InputError('Gemini is limited to the bundled demo sessions during this pilot.');
  }
  if (task === 'ask' && !demo.questions.includes(input.question)) {
    throw new InputError('Choose one of the demo questions.');
  }
  return { mode: demo.mode, transcript, question: task === 'ask' ? input.question : undefined };
}

export function createNotesServer({ key = '', model, origins, fetchModel, timeoutMs }) {
  const allowedOrigins = new Set(origins);
  const generate = createGenerator({ key, model, fetchModel, timeoutMs });
  let active = 0;
  return http.createServer(async (req, res) => {
    function send(status, body) {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(body));
    }
    const origin = req.headers.origin;
    res.setHeader('Vary', 'Origin');
    if (origin) {
      if (!allowedOrigins.has(origin)) return send(403, { error: 'Browser address is not enabled. Check WEB_ORIGINS on the notes server.' });
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      return send(200, {});
    }
    if (req.method === 'GET' && req.url === '/health') {
      return send(200, { status: key ? 'ready' : 'missing-key', provider: 'gemini', model });
    }
    const task = req.url === '/notes' ? 'notes' : req.url === '/ask' ? 'ask' : null;
    if (!task || req.method !== 'POST') return send(404, { error: 'Unknown endpoint.' });
    if (!key) return send(503, { error: 'Add GEMINI_API_KEY to the notes server’s .env file and restart the server.' });
    if (active >= 2) return send(429, { error: 'The notes service is busy. Try again shortly.' });
    active++;
    const controller = new AbortController();
    res.once('close', () => controller.abort());
    try {
      const body = await readBody(req);
      if (body?.approvedProvider !== 'gemini') {
        return send(409, { error: 'Approve sharing this demo with Google Gemini before trying again.' });
      }
      const input = demoInput(body, task);
      send(200, await assist(task, input, (system, data, format) => generate(system, data, format, controller.signal)));
    } catch (error) {
      if (res.destroyed) return;
      if (error instanceof InputError) return send(400, { error: error.message });
      if (error instanceof GeminiError) return send(error.status, { error: error.message });
      send(502, { error: 'Gemini returned notes that could not be verified against the transcript. Try again.' });
    } finally { active--; }
  });
}
