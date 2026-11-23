import test from 'node:test';
import assert from 'node:assert/strict';
import { isApproved } from '../src/ai/consent.ts';

test('sharing consent belongs to the exact configured service', () => {
  assert.equal(isApproved({ allowAI: true, approvedUrl: 'http://one.local' }, 'http://two.local'), false);
  assert.equal(isApproved({ allowAI: true }, 'http://one.local'), false);
  assert.equal(isApproved({ allowAI: false, approvedUrl: 'http://one.local' }, 'http://one.local'), false);
  assert.equal(isApproved({ allowAI: true, approvedUrl: 'http://one.local' }, 'http://one.local'), true);
});
