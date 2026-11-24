import { expect, test } from '@playwright/test';

test('demo opt-in, note persistence after navigation, and cited and unanswered questions', async ({ page }) => {
  const url = process.env.EXPO_PUBLIC_AI_URL?.replace(/\/+$/, '');
  test.skip(!url, 'Export with EXPO_PUBLIC_AI_URL set to exercise the AI screen with a development fixture.');
  const quote = 'The lab meets Thursday.';
  const summary = 'Maya will bring the notebook.';
  const transcript = quote + '\n' + summary;
  const cannedNotes = { summary, sections: [{ heading: 'Action items', items: [{ text: summary, quote: summary }] }] };
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(url + '/notes', async route => {
    await gate;
    await route.fulfill({ json: cannedNotes });
  });
  await page.route(url + '/ask', route => {
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({ approvedProvider: 'gemini', transcript });
    return route.fulfill({ json: body.question === 'When does the lab meet?'
      ? { answer: 'Thursday.', quote }
      : { answer: 'There is not enough information in this transcript to answer that question.', quote: null } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Meeting demo' }).click();
  await page.getByRole('radio', { name: 'Notes' }).click();
  await expect(page.getByText(/Google may use free-tier content/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate notes' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Allow sharing with Google Gemini' }).click();
  const request = page.waitForRequest(url + '/notes');
  await page.getByRole('button', { name: 'Generate notes' }).click();
  expect((await request).postDataJSON()).toMatchObject({ approvedProvider: 'gemini', mode: 'Meeting', transcript });
  await page.getByRole('button', { name: 'Notebook' }).click();
  release();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('conversation-companion.session.gemini-demo-meeting')!).notes?.summary)).toBe(summary);
  await page.reload();
  await page.getByRole('button', { name: 'Meeting demo' }).click();
  await expect(page.getByRole('heading', { name: 'Action items' })).toBeVisible();
  await page.getByRole('radio', { name: 'Ask' }).click();
  await page.getByRole('button', { name: 'When does the lab meet?' }).click();
  await expect(page.getByText('Thursday.', { exact: true })).toBeVisible();
  await expect(page.getByText('“' + quote + '”')).toBeVisible();
  await page.getByRole('button', { name: 'Where is the lab meeting?' }).click();
  await expect(page.getByText(/There is not enough information/)).toBeVisible();
  await expect(page.getByText('“' + quote + '”')).toHaveCount(0);
});

test('a regular saved session keeps old notes and sends a typed question only after fresh approval', async ({ page }) => {
  const url = process.env.EXPO_PUBLIC_AI_URL?.replace(/\/+$/, '');
  test.skip(!url, 'Export with EXPO_PUBLIC_AI_URL set to exercise the AI screen.');
  let calls = 0;
  await page.route(url + '/ask', route => {
    calls++;
    expect(route.request().postDataJSON()).toMatchObject({
      transcript: 'An existing transcript stays on the device.', question: 'Where does the transcript stay?',
    });
    return route.fulfill({ json: { answer: 'On the device.', quote: 'An existing transcript stays on the device.' } });
  });
  await page.addInitScript(() => {
    const quote = 'An existing transcript stays on the device.';
    localStorage.setItem('conversation-companion.session.existing', JSON.stringify({
      id: 'existing', title: 'Existing session', startedAt: 1, mode: 'Lecture', durationMs: 2000,
      allowAI: true, approvedUrl: 'http://127.0.0.1:8787', captions: [{ text: quote, at: 0 }],
      notes: { summary: quote, sections: [] },
    }));
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Existing session/ }).click();
  await expect(page.getByText('An existing transcript stays on the device.')).toBeVisible();
  await page.getByRole('radio', { name: 'Ask' }).click();
  await expect(page.getByText(/participants agreed/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ask question' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Allow sharing with Google Gemini' }).click();
  const question = page.getByRole('textbox', { name: 'Question about this transcript' });
  await question.fill('Where does the transcript stay?');
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'Ask question' }).click();
  await expect(page.getByText('On the device.', { exact: true })).toBeVisible();
  expect(calls).toBe(1);
});
