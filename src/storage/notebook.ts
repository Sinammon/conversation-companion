import { openDatabaseAsync } from 'expo-sqlite';
import type { Notes, Session } from '../types';
import { decodeSessions } from './decode-sessions';
import { editBookmark } from '../capture/bookmarks';
import { approveSharing, schema, listSessions, writeSession, removeSession, writeNotes, writeBookmarks } from './sql';

async function open() {
  const db = await openDatabaseAsync('companion.db');
  await db.execAsync(schema);
  return db;
}
let connection: ReturnType<typeof open> | undefined;
function database() {
  return connection ??= open().catch(error => { connection = undefined; throw error; });
}
export async function loadSessions() {
  const rows = await (await database()).getAllAsync<{ id: string; data: string }>(listSessions);
  return decodeSessions(rows);
}
export async function saveSession(session: Session) {
  await (await database()).runAsync(writeSession, session.id, session.startedAt, JSON.stringify(session));
}
export async function deleteSession(id: string) {
  await (await database()).runAsync(removeSession, id);
}
export async function saveBookmark(id: string, index: number, marked: boolean) {
  const db = await database();
  let bookmarks: number[] = [];
  await db.withExclusiveTransactionAsync(async tx => {
    const row = await tx.getFirstAsync<{ data: string }>('SELECT data FROM sessions WHERE id=?', id);
    if (!row) throw new Error('This session could not be found.');
    const session: Session = JSON.parse(row.data);
    bookmarks = editBookmark(session.bookmarks, session.captions.length, index, marked);
    await tx.runAsync(writeBookmarks, JSON.stringify(bookmarks), id);
  });
  return bookmarks;
}
export async function approveSession(id: string, url: string) {
  if (!(await (await database()).runAsync(approveSharing, url, id)).changes) throw new Error('This session could not be found.');
}
export async function saveNotes(id: string, notes: Notes, url: string) {
  return (await (await database()).runAsync(writeNotes, JSON.stringify(notes), id, url)).changes > 0;
}
export async function loadSize() {
  return (await (await database()).getFirstAsync<{ size: number }>('SELECT size FROM preferences WHERE id=1'))?.size ?? 26;
}
export async function saveSize(size: number) {
  await (await database()).runAsync('INSERT OR REPLACE INTO preferences(id,size) VALUES(1,?)', size);
}
