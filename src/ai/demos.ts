import data from './demos.json';
import type { DemoId, Mode, Session } from '../types';

export const demos = data as Record<DemoId, { title: string; mode: Mode; lines: string[]; questions: string[] }>;
export const demoIds = ['lecture', 'meeting'] as const;
export const demoSessionId = (id: DemoId) => 'gemini-demo-' + id;
export const transcriptOf = (session: Session) => session.captions.map(caption => caption.text).join('\n');

export function demoForSession(session: Session) {
  const demo = session.demoId && Object.hasOwn(demos, session.demoId) ? demos[session.demoId] : undefined;
  if (demo && session.mode === demo.mode && transcriptOf(session) === demo.lines.join('\n')) return demo;
}

export function createDemoSession(id: DemoId): Session {
  const demo = demos[id];
  return {
    id: demoSessionId(id), demoId: id, title: demo.title, mode: demo.mode,
    startedAt: Date.now(), durationMs: demo.lines.length * 3500, allowAI: false,
    captions: demo.lines.map((text, index) => ({ text, at: index * 3500 })),
  };
}
