import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSpeech, recordingPreviewMessage } from '../src/capture/speech-availability.ts';

test('missing speech leaves a sample-transcript preview without loading native bindings', () => {
  const speech = resolveSpeech(() => null, () => assert.fail('Loading the native package here would crash Expo Go.'));
  assert.equal(speech, null);
  assert.match(recordingPreviewMessage(speech), /development build.*sample transcript/i);
});

test('installed native bindings keep live recording available', () => {
  const installed = { start() {} };
  const speech = resolveSpeech(() => ({}), () => installed);
  assert.equal(speech, installed);
  assert.equal(recordingPreviewMessage(speech), '');
});
