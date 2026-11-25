import type { Caption, Session } from '../types';

export function matchingIndices(captions: Caption[], query: string): number[] {
  const term = query.trim().toLocaleLowerCase();
  return captions.flatMap((line, i) => !term || line.text.toLocaleLowerCase().includes(term) ? [i] : []);
}

export function findSessions(sessions: Session[], query: string) {
  const term = query.trim().toLocaleLowerCase();
  const results: { session: Session; excerpt?: string }[] = [];
  for (const session of sessions) {
    const match = term && session.captions.find(line => line.text.toLocaleLowerCase().includes(term));
    if (match) {
      const position = match.text.toLocaleLowerCase().indexOf(term);
      const start = Math.max(0, position - 35);
      const end = Math.min(match.text.length, position + term.length + 60);
      results.push({session, excerpt: (start ? '…' : '') + match.text.slice(start, end) + (end < match.text.length ? '…' : '')});
    } else if (session.title.toLocaleLowerCase().includes(term)) {
      results.push({session});
    }
  }
  return results;
}
