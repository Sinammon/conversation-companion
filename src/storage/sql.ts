export const schema = `
  CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, started INTEGER NOT NULL, data TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS preferences (id INTEGER PRIMARY KEY, size INTEGER NOT NULL);
`;
export const writeSession = 'INSERT INTO sessions(id,started,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data';
export const listSessions = 'SELECT data FROM sessions ORDER BY started DESC';
export const removeSession = 'DELETE FROM sessions WHERE id=?';
export const writeNotes = "UPDATE sessions SET data=json_set(data,'$.notes',json(?)) WHERE id=? AND json_extract(data,'$.allowAI')=1 AND json_extract(data,'$.approvedUrl')=?";
