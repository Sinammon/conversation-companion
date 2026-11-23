import { expect, test } from '@playwright/test';

test('opt-in, note persistence after navigation, and a cited transcript answer', async ({ page }) => {
  const url = process.env.EXPO_PUBLIC_AI_URL?.replace(/\/+$/, '');
  test.skip(!url, 'Export with EXPO_PUBLIC_AI_URL set to exercise the AI screen with a development fixture.');
  const title = 'Development fixture meeting';
  const quote = 'The lab meets Thursday.';
  const record = { id: 'fixture', title, startedAt: 1, mode: 'Meeting', durationMs: 2000,
    allowAI: false, captions: [{ text: quote, at: 200 }] };
  await page.addInitScript(session => {
    const key = 'conversation-companion.session.fixture';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(session));
  }, record);
  const source = { text: 'Meet Thursday.', quote };
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(url + '/notes', async route => {
    await gate;
    await route.fulfill({ json: { summary: 'Meet Thursday.', sections: [{ heading: 'Decisions', items: [source] }] } });
  });
  await page.route(url + '/ask', route => route.fulfill({ json: { answer: 'Thursday.', quote } }));
  await page.goto('/');
  await page.getByRole('button', { name: new RegExp(title) }).click();
  await page.getByRole('radio', { name: 'Notes' }).click();
  await expect(page.getByText('Use AI for this session?')).toBeVisible();
  await page.getByRole('button', { name: 'Allow transcript sharing' }).click();
  const request = page.waitForRequest(url + '/notes');
  await page.getByRole('button', { name: 'Generate notes' }).click();
  expect((await request).postDataJSON()).toMatchObject({ mode: 'Meeting', transcript: quote });
  await page.getByRole('button', { name: 'Notebook' }).click();
  release();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('conversation-companion.session.fixture')!).notes?.summary)).toBe('Meet Thursday.');
  await page.reload();
  await page.getByRole('button', { name: new RegExp(title) }).click();
  await expect(page.getByRole('heading', { name: 'Decisions' })).toBeVisible();
  await page.getByRole('radio', { name: 'Ask' }).click();
  await page.getByLabel('Your question about the transcript').fill('When is the lab?');
  await page.getByRole('button', { name: 'Ask question' }).click();
  await expect(page.getByText('Thursday.', { exact: true })).toBeVisible();
  await expect(page.getByText('“' + quote + '”')).toBeVisible();
});
