import type { Caption, DraftItem, LiveDraft } from '../types';
import { isRecord } from './response';

export function areDraftItems(value: unknown, transcript: string): value is DraftItem[] {
  return Array.isArray(value) && value.length <= 3 && value.every(item =>
    isRecord(item) && typeof item.text === 'string' && !!item.text.trim() &&
    typeof item.quote === 'string' && !!item.quote.trim() && transcript.includes(item.quote));
}

export function readDrafts(value: unknown, captions: Caption[]): LiveDraft[] {
  if (!Array.isArray(value)) return [];
  return value.filter((draft): draft is LiveDraft => {
    if (!isRecord(draft)) return false;
    const { start, end, items } = draft;
    if (typeof start !== 'number' || !Number.isInteger(start) || start < 0 ||
        typeof end !== 'number' || !Number.isInteger(end) || end <= start || end > captions.length) return false;
    const passage = captions.slice(start, end).map(line => line.text).join('\n');
    return areDraftItems(items, passage) && items.length > 0;
  });
}
