import type { Session } from '../types';

const prefix = 'conversation-companion.session.';
export async function loadSessions(): Promise<Session[]> {
  return Object.keys(localStorage).filter(key => key.startsWith(prefix))
    .map(key => JSON.parse(localStorage.getItem(key)!))
    .sort((a, b) => b.startedAt - a.startedAt);
}
export async function saveSession(session: Session) {
  localStorage.setItem(prefix + session.id, JSON.stringify(session));
}
export async function deleteSession(id: string) { localStorage.removeItem(prefix + id); }
export async function loadSize() { return Number(localStorage.getItem('conversation-companion.size')) || 26; }
export async function saveSize(size: number) { localStorage.setItem('conversation-companion.size', String(size)); }
