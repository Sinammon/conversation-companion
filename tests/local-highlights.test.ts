import assert from 'node:assert/strict';
import test from 'node:test';
import { localHighlights } from '../src/ai/local-highlights';

test('on-device highlights select distinct key sentences verbatim in speaking order', () => {
  const text = 'Okay.\nThe spring workshop will cover color theory.\nThe spring workshop will cover color theory.\nWe decided to meet Friday at five.\nBring your sketchbook before the workshop.\nSure.';
  const items = localHighlights(text);
  assert.ok(items.length > 0 && items.length <= 3);
  assert.ok(items.some(item => item.text.includes('Friday')));
  assert.ok(items.every(item => text.includes(item.quote) && item.text === item.quote));
  assert.deepEqual(items.map(item => text.indexOf(item.quote)), [...new Set(items.map(item => text.indexOf(item.quote)))].sort((a,b) => a-b));
  assert.deepEqual(localHighlights('Okay. Uh. Hmm.'), []);
});
