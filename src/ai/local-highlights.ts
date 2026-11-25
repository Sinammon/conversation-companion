import type { DraftItem } from '../types';

// Extractive highlights stay in speaking order and retain the recognizer's exact words.
const stopWords = new Set('a an and are as at be but by for from have in is it of on or that the this to we with you'.split(' '));
const timeReference = /\d|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|today)\b/i;
const cue = /\b(action|agree[d]?|bring|conclusion|deadline|decided|decision|due|important|means|must|next|remember|scheduled|will)\b/i;

export function localHighlights(transcript: string): DraftItem[] {
  const candidates: { quote: string; terms: Set<string>; order: number }[] = [];
  const frequencies = new Map<string, number>();
  const seen = new Set<string>();
  let start = 0;
  for (const boundary of transcript.matchAll(/[.!?]["”’)]*(?=\s|$)|\n+|$/g)) {
    const end = boundary.index + boundary[0].length;
    const quote = transcript.slice(start, end).trim();
    start = end;
    const normalized = quote.toLowerCase().replace(/[.!?]+$/, '');
    if (!quote || seen.has(normalized)) continue;
    const words = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
    if (words.length < 3 && !cue.test(quote)) continue;
    const terms = new Set(words.filter(word => !stopWords.has(word)));
    if (!terms.size) continue;
    seen.add(normalized);
    for (const word of terms) frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
    candidates.push({quote, terms, order: start});
  }
  const ranked = candidates.map(line => {
    let shared = 0;
    for (const word of line.terms) if ((frequencies.get(word) ?? 0) > 1) shared++;
    const score = shared / Math.sqrt(line.terms.size) + (cue.test(line.quote) ? 2 : 0) + (timeReference.test(line.quote) ? 1 : 0);
    return { ...line, score };
  });
  const count = Math.min(3, Math.ceil(ranked.length / 2));
  return ranked.sort((a,b) => b.score - a.score || a.order - b.order).slice(0,count)
    .sort((a,b) => a.order - b.order).map(({quote}) => ({text:quote, quote}));
}
