export class GeminiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function createGenerator({ key, model, fetchModel = fetch, timeoutMs = 60000 }) {
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent';
  return async function generate(system, data, schema, signal) {
    const timeout = AbortSignal.timeout(timeoutMs);
    let payload;
    try {
      const reply = await fetchModel(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        signal: AbortSignal.any([timeout, signal]),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: JSON.stringify(data) }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseJsonSchema: schema },
        }),
      });
      if (reply.status === 429) throw new GeminiError(429, 'Gemini’s quota is temporarily exhausted. Wait and try again.');
      const failure = reply.status === 400 ? await reply.json().catch(() => null) : null;
      const invalidKey = Array.isArray(failure?.error?.details) &&
        failure.error.details.some(detail => detail?.reason === 'API_KEY_INVALID');
      if (reply.status === 401 || reply.status === 403 || invalidKey) {
        throw new GeminiError(503, 'Gemini rejected the credentials. Check GEMINI_API_KEY and restart the notes server.');
      }
      if (!reply.ok) throw new GeminiError(502, 'Gemini could not complete the request. Check the configured model and try again.');
      const result = await reply.json().catch(error => {
        if (timeout.aborted || signal.aborted) throw error;
        throw new GeminiError(502, 'Gemini returned unreadable output. Try again.');
      });
      payload = result?.candidates?.[0];
    } catch (error) {
      if (timeout.aborted) throw new GeminiError(504, 'Gemini took too long. Try again.');
      if (error instanceof GeminiError) throw error;
      throw new GeminiError(502, 'Could not reach Gemini. Check the PC’s internet connection and try again.');
    }
    try {
      if (payload?.finishReason !== 'STOP') throw new Error();
      const text = payload.content.parts.filter(part => !part.thought).map(part => part.text ?? '').join('');
      const parsed = JSON.parse(text);
      const valid = Object.hasOwn(schema.properties, 'items')
        ? Array.isArray(parsed?.items)
        : typeof parsed?.answer === 'string' && typeof parsed?.quote === 'string';
      if (!valid) throw new Error();
      return parsed;
    } catch {
      throw new GeminiError(502, 'Gemini returned unreadable output. Try again.');
    }
  };
}
