import { areDraftItems } from './live-draft';
import type { DraftItem, Mode, Session } from '../types';
import { isApproved } from './consent';
import { transcriptOf } from './demos';
import { isAnswer, isNotes, isRecord } from './response';

export const serviceUrl = (process.env.EXPO_PUBLIC_AI_URL ?? '').trim().replace(/\/+$/, '');

async function request<T>(
  path: 'notes' | 'ask', session: Session, validates: (data: unknown) => data is T, question?: string,
): Promise<T> {
  if (!isApproved(session, serviceUrl)) throw new Error('Approve sharing this session with Google Gemini first.');
  const transcript = transcriptOf(session);
  if (!transcript.trim() || transcript.length > 200000) throw new Error('Use a transcript between 1 and 200,000 characters.');
  if (path === 'ask' && (!question?.trim() || question.length > 1000)) throw new Error('Enter a question of up to 1,000 characters.');
  return post(path, { mode: session.mode, transcript, question: question?.trim(), approvedProvider: session.approvedProvider }, validates);
}

async function post<T>(path: string, body: object, validates: (data: unknown) => data is T, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort);
  const timeout = setTimeout(() => controller.abort(), 75000);
  const unreadable = 'The notes server returned an unreadable response. Check its address and try again.';
  try {
    const response = await fetch(serviceUrl + '/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify(body),
    }).catch(() => {
      throw new Error('Could not reach the notes service. Keep the PC server running and check that both devices are on the same Wi-Fi.');
    });
    const data: unknown = await response.json().catch(() => { throw new Error(unreadable); });
    if (!response.ok) {
      const message = isRecord(data) && typeof data.error === 'string' && data.error.trim();
      throw new Error(message || 'The notes service could not finish. Try again.');
    }
    if (!validates(data)) throw new Error(unreadable);
    return data;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The notes request timed out. Try again.');
    throw error;
  } finally {
    signal?.removeEventListener('abort', abort);
    clearTimeout(timeout);
  }
}
export const livePilot = !!serviceUrl && process.env.EXPO_PUBLIC_LIVE_NOTES === '1';

export async function makeLiveNotes(mode: Mode, transcript: string, signal: AbortSignal) {
  if (!livePilot) throw new Error('The private live notes pilot is off.');
  const data = await post('live-notes', {mode, transcript, approvedProvider: 'gemini', liveConsent: true},
    (value): value is {items: DraftItem[]} => isRecord(value) && areDraftItems(value.items, transcript), signal);
  return data.items;
}
export const makeNotes = (session: Session) => request('notes', session, isNotes);
export const ask = (session: Session, question: string) => request('ask', session, isAnswer, question);
