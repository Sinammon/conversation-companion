import http from 'node:http';
import { assist, InputError } from './assistant.mjs';
import { createGenerator, GeminiError } from './gemini.mjs';

const maxBodyBytes = 2 * 1024 * 1024;
class BodyTooLarge extends Error {}

async function readBody(request) {
  const chunks = [];
  let bytes = 0;
  // Continue draining oversized requests so the client can receive the error.
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes <= maxBodyBytes) chunks.push(chunk);
  }
  if (bytes > maxBodyBytes) throw new BodyTooLarge('The notes request is too large.');
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw new InputError('Expected a JSON request.'); }
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
    if (Number(req.headers['content-length']) > maxBodyBytes) {
      req.resume();
      return send(413, { error: 'The notes request is too large.' });
    }
    if (!key) return send(503, { error: 'Add GEMINI_API_KEY to the notes server’s .env file and restart the server.' });
    if (active >= 2) return send(429, { error: 'The notes service is busy. Try again shortly.' });
    active++;
    const controller = new AbortController();
    res.once('close', () => controller.abort());
    try {
      const body = await readBody(req);
      if (body?.approvedProvider !== 'gemini') {
        return send(409, { error: 'Approve sharing this session with Google Gemini before trying again.' });
      }
      send(200, await assist(task, body, (system, data, format) => generate(system, data, format, controller.signal)));
    } catch (error) {
      if (res.destroyed) return;
      if (error instanceof BodyTooLarge) return send(413, { error: error.message });
      if (error instanceof InputError) return send(400, { error: error.message });
      if (error instanceof GeminiError) return send(error.status, { error: error.message });
      send(502, { error: 'Gemini returned notes that could not be verified against the transcript. Try again.' });
    } finally { active--; }
  });
}
