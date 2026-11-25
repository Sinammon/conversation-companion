export function readNotesConfig(env) {
  const host = env.HOST?.trim() || '127.0.0.1';
  const portSetting = env.PORT?.trim() || '8787';
  const port = Number(portSetting);
  if (!/^\d+$/.test(portSetting) || port > 65535) {
    throw new Error('Set PORT in .env to a whole number between 0 and 65535. The default is 8787.');
  }
  return {
    host, port,
    origins: (env.WEB_ORIGINS || env.WEB_ORIGIN || 'http://localhost:8081')
      .split(',').map(origin => origin.trim()).filter(Boolean),
    key: env.GEMINI_API_KEY?.trim(),
    model: env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite',
  };
}
