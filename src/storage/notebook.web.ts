import type { Notes, Session } from '../types';
import { isApproved } from '../ai/consent';
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
  localStorage.setItem(prefix + session.id, JSON.stringify(session));
}
export async function deleteSession(id: string) { localStorage.removeItem(prefix + id); }
export async function saveNotes(id: string, notes: Notes, url: string) {
  const raw = localStorage.getItem(prefix + id);
  if (!raw) return false;
  const session: Session = JSON.parse(raw);
  if (!isApproved(session, url)) return false;
  localStorage.setItem(prefix + id, JSON.stringify({ ...session, notes }));
  return true;
}
export async function loadSize() { return Number(localStorage.getItem('conversation-companion.size')) || 26; }
export async function saveSize(size: number) { localStorage.setItem('conversation-companion.size', String(size)); }
