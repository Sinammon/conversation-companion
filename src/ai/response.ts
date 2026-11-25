import type { Answer, Notes } from '../types';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isNotes(value: unknown): value is Notes {
  return isRecord(value) && hasText(value.summary) && Array.isArray(value.sections)
    && value.sections.every(section => isRecord(section) && hasText(section.heading)
      && Array.isArray(section.items) && section.items.every(item => isRecord(item)
        && hasText(item.text) && hasText(item.quote)));
}

export function isAnswer(value: unknown): value is Answer {
  return isRecord(value) && hasText(value.answer)
    && (hasText(value.quote) || value.quote === null);
}
