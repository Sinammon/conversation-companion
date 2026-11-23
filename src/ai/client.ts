import type { Answer, Notes, Session } from '../types';
import { isApproved } from './consent';

export const serviceUrl = (process.env.EXPO_PUBLIC_AI_URL ?? '').trim().replace(/\/+$/, '');

async function request<T>(path: string, session: Session, question?: string): Promise<T> {
  if (!isApproved(session, serviceUrl)) throw new Error('Approve this notes service for the session first.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 600000);
  try {
    const response = await fetch(serviceUrl + '/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ mode: session.mode, transcript: session.captions.map(c => c.text).join('\n'), question }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'The notes service could not finish. Try again.');
    return data;
  } catch (error) {
    if (error instanceof TypeError || controller.signal.aborted) throw new Error('Could not reach the notes service. Check the connection and try again.');
    throw error;
  } finally { clearTimeout(timeout); }
}
export const makeNotes = (s: Session) => request<Notes>('notes', s);
export const ask = (s: Session, question: string) => request<Answer>('ask', s, question);
