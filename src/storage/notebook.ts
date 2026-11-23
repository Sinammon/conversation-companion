import { openDatabaseAsync } from 'expo-sqlite';
import type { Session } from '../types';
import { schema, listSessions, writeSession, removeSession } from './sql';

async function open() {
  const db = await openDatabaseAsync('companion.db');
  await db.execAsync(schema);
  return db;
}
let connection: ReturnType<typeof open> | undefined;
function database() {
  return connection ??= open().catch(error => { connection = undefined; throw error; });
}
export async function loadSessions(): Promise<Session[]> {
  const rows = await (await database()).getAllAsync<{ data: string }>(listSessions);
  return rows.map(row => JSON.parse(row.data));
}
export async function saveSession(session: Session) {
  await (await database()).runAsync(writeSession, session.id, session.startedAt, JSON.stringify(session));
}
export async function deleteSession(id: string) {
  await (await database()).runAsync(removeSession, id);
}
export async function loadSize() {
  return (await (await database()).getFirstAsync<{ size: number }>('SELECT size FROM preferences WHERE id=1'))?.size ?? 26;
}
export async function saveSize(size: number) {
  await (await database()).runAsync('INSERT OR REPLACE INTO preferences(id,size) VALUES(1,?)', size);
}
