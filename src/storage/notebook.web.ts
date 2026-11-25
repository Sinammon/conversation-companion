import type { Notes, Session } from '../types';
import { isApproved } from '../ai/consent';
import { editBookmark } from '../capture/bookmarks';
import { withNotebookWriter } from './web-writer';
import { decodeSessions } from './decode-sessions';

const prefix = 'conversation-companion.session.';
export async function loadSessions() {
  const rows = [];
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(prefix)) continue;
    const data = localStorage.getItem(key);
    if (data !== null) rows.push({ id: key.slice(prefix.length), data });
  }
  return decodeSessions(rows);
}
export async function saveSession(session: Session) {
  await withNotebookWriter(() => localStorage.setItem(prefix + session.id, JSON.stringify(session)));
}
export async function deleteSession(id: string) {
  await withNotebookWriter(() => localStorage.removeItem(prefix + id));
}
function existing(id: string): Session {
  const raw = localStorage.getItem(prefix + id);
  if (!raw) throw new Error('This session could not be found.');
  return JSON.parse(raw);
}
export function saveBookmark(id: string, index: number, marked: boolean) {
  return withNotebookWriter(() => {
    const session = existing(id);
    const bookmarks = editBookmark(session.bookmarks, session.captions.length, index, marked);
    localStorage.setItem(prefix + id, JSON.stringify({ ...session, bookmarks }));
    return bookmarks;
  });
}
export function approveSession(id: string, url: string) {
  return withNotebookWriter(() => {
    const session = existing(id);
    localStorage.setItem(prefix + id, JSON.stringify({ ...session, allowAI: true, approvedProvider: 'gemini', approvedUrl: url }));
  });
}
export async function saveNotes(id: string, notes: Notes, url: string) {
  return withNotebookWriter(() => {
    const raw = localStorage.getItem(prefix + id);
    if (!raw) return false;
    const session: Session = JSON.parse(raw);
    if (!isApproved(session, url)) return false;
    localStorage.setItem(prefix + id, JSON.stringify({ ...session, notes }));
    return true;
  });
}
export async function loadSize() { return Number(localStorage.getItem('conversation-companion.size')) || 26; }
export async function saveSize(size: number) { localStorage.setItem('conversation-companion.size', String(size)); }
