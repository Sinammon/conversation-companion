import { createNotesServer } from './service.mjs';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8787);
const origins = (process.env.WEB_ORIGINS || process.env.WEB_ORIGIN || 'http://localhost:8081')
  .split(',').map(origin => origin.trim()).filter(Boolean);
const key = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite';
const server = createNotesServer({ key, model, origins });
server.listen(port, host, () => console.log('Companion notes service listening on http://' + host + ':' + server.address().port));
