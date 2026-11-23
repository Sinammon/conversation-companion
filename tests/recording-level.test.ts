import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRecordingLevel } from '../src/capture/recording-level.ts';

test('microphone levels map silence and invalid readings to zero and clamp peaks', () => {
  assert.equal(normalizeRecordingLevel(-2), 0);
  assert.equal(normalizeRecordingLevel(Number.NaN), 0);
  assert.equal(normalizeRecordingLevel(5), 0.5);
  assert.equal(normalizeRecordingLevel(15), 1);
});
