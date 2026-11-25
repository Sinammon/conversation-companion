import { readDrafts } from '../ai/live-draft';
import { cleanBookmarks } from '../capture/bookmarks';
import type { Caption, Session } from '../types';
import { isNotes, isRecord } from '../ai/response';

export type NotebookContents = { sessions: Session[]; hasUnreadableRecords: boolean };

function isCaption(value: unknown): value is Caption {
  return isRecord(value) && typeof value.text === 'string'
    && typeof value.at === 'number' && Number.isFinite(value.at);
}

function decodeSession(raw: string, id: string): { session?: Session; unreadable: boolean } {
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return { unreadable: true }; }
  if (!isRecord(data) || data.id !== id || typeof data.title !== 'string'
    || (data.mode !== 'Lecture' && data.mode !== 'Meeting')
    || typeof data.startedAt !== 'number' || !Number.isFinite(data.startedAt)
    || typeof data.durationMs !== 'number' || !Number.isFinite(data.durationMs)
    || !Array.isArray(data.captions) || !data.captions.every(isCaption)) {
    return { unreadable: true };
  }

  const notes = isNotes(data.notes) ? data.notes : undefined;
  const session: Session = {
    ...data,
    id,
    title: data.title,
    mode: data.mode,
    startedAt: data.startedAt,
    durationMs: data.durationMs,
    captions: data.captions,
    allowAI: data.allowAI === true,
    approvedUrl: typeof data.approvedUrl === 'string' ? data.approvedUrl : undefined,
    approvedProvider: data.approvedProvider === 'gemini' ? 'gemini' : undefined,
    demoId: data.demoId === 'lecture' || data.demoId === 'meeting' ? data.demoId : undefined,
    liveDrafts: readDrafts(data.liveDrafts, data.captions),
    bookmarks: cleanBookmarks(data.bookmarks, data.captions.length),
    notes,
  };
  return { session, unreadable: data.notes !== undefined && !notes };
}

export function decodeSessions(rows: Iterable<{ id: string; data: string }>): NotebookContents {
  const sessions: Session[] = [];
  let hasUnreadableRecords = false;
  for (const row of rows) {
    const decoded = decodeSession(row.data, row.id);
    if (decoded.session) sessions.push(decoded.session);
    hasUnreadableRecords ||= decoded.unreadable;
  }
  sessions.sort((a, b) => b.startedAt - a.startedAt);
  return { sessions, hasUnreadableRecords };
}
