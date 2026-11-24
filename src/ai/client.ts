import type { Answer, Notes, Session } from '../types';
import { isApproved } from './consent';
import { transcriptOf } from './demos';

export const serviceUrl = (process.env.EXPO_PUBLIC_AI_URL ?? '').trim().replace(/\/+$/, '');

async function request<T>(path: 'notes' | 'ask', session: Session, question?: string): Promise<T> {
  if (!isApproved(session, serviceUrl)) throw new Error('Approve sharing this session with Google Gemini first.');
  const transcript = transcriptOf(session);
  if (!transcript.trim() || transcript.length > 200000) throw new Error('Use a transcript between 1 and 200,000 characters.');
  if (path === 'ask' && (!question?.trim() || question.length > 1000)) throw new Error('Enter a question of up to 1,000 characters.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75000);
  try {
    const response = await fetch(serviceUrl + '/' + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({ mode: session.mode, transcript, question: question?.trim(), approvedProvider: session.approvedProvider }),
    });
    const data = await response.json().catch(() => {
      if (controller.signal.aborted) throw new Error('The notes request timed out. Try again.');
      throw new Error('The notes server returned an unreadable response. Check its address and try again.');
    });
    if (!response.ok) throw new Error(data.error || 'The notes service could not finish. Try again.');
    return data;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The notes request timed out. Try again.');
    if (error instanceof TypeError) throw new Error('Could not reach the notes service. Keep the PC server running and check that both devices are on the same Wi-Fi.');
    throw error;
  } finally { clearTimeout(timeout); }
}
export const makeNotes = (s: Session) => request<Notes>('notes', s);
export const ask = (s: Session, question: string) => request<Answer>('ask', s, question);
