import { expect, test } from '@playwright/test';

test('invalid notes and answer responses show retry errors and preserve the last saved notes', async ({ page }) => {
  const url = process.env.EXPO_PUBLIC_AI_URL?.replace(/\/+$/, '');
  test.skip(!url, 'Export with EXPO_PUBLIC_AI_URL set for the mock notes service.');
  const summary = 'Previously saved summary';
  await page.addInitScript(({ url, summary }) => {
    localStorage.setItem('conversation-companion.session.existing', JSON.stringify({
      id: 'existing', title: 'Existing session', startedAt: 1, mode: 'Lecture', durationMs: 2000,
      allowAI: true, approvedUrl: url, approvedProvider: 'gemini', captions: [{ text: 'Existing caption.', at: 0 }],
      notes: { summary, sections: [] },
    }));
  }, { url, summary });
  let notePayload: unknown = { summary: 'Invalid notes', sections: [null] };
  await page.route(url + '/notes', route => route.fulfill({ json: notePayload }));
  const askRoute = url + '/ask';
  let answerPayload: unknown = { answer: 1, quote: null };
  await page.route(askRoute, route => route.fulfill({ json: answerPayload }));
  await page.goto('/');
  await page.getByRole('button', { name: /Existing session/ }).click();
  for (const payload of [notePayload, { summary: ' ', sections: [] }]) {
    notePayload = payload;
    const response = page.waitForResponse(url + '/notes');
    await page.getByRole('button', { name: 'Regenerate notes' }).click();
    await response;
    await expect(page.getByRole('alert')).toContainText('unreadable response');
    await expect(page.getByText(summary, { exact: true })).toBeVisible();
  }
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('conversation-companion.session.existing')!).notes.summary))
    .toBe(summary);
  await page.getByRole('radio', { name: 'Ask' }).click();
  await page.getByLabel('Question about this transcript').fill('What does it say?');
  for (const payload of [answerPayload, { answer: ' ', quote: null }]) {
    answerPayload = payload;
    const response = page.waitForResponse(askRoute);
    await page.getByRole('button', { name: 'Ask question' }).click();
    await response;
    await expect(page.getByRole('alert')).toContainText('unreadable response');
  }
  answerPayload = { answer: 'No supported answer.', quote: null };
  await page.getByRole('button', { name: 'Ask question' }).click();
  await expect(page.getByText('No supported answer.', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
