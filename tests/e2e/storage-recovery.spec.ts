import { expect, test } from '@playwright/test';

test('a damaged record and invalid notes leave valid transcripts accessible', async ({ page }) => {
  await page.addInitScript(() => {
    const prefix = 'conversation-companion.session.';
    const session = { id: 'valid', title: 'Healthy session', startedAt: 1, mode: 'Lecture',
      durationMs: 2000, allowAI: false, captions: [{ text: 'Healthy caption.', at: 0 }] };
    localStorage.setItem(prefix + session.id, JSON.stringify(session));
    localStorage.setItem(prefix + 'unreadable', '{invalid');
    localStorage.setItem(prefix + 'invalid-shape', JSON.stringify({ ...session, id: 'invalid-shape', captions: null }));
    localStorage.setItem(prefix + 'recoverable', JSON.stringify({
      ...session, id: 'recoverable', title: 'Recovered session', notes: { summary: 'Broken' },
    }));
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('Some saved sessions or notes could not be read');
  await expect(page.getByRole('button', { name: /Healthy session/ })).toBeVisible();
  await page.getByRole('button', { name: /Recovered session/ }).click();
  await expect(page.getByText('Healthy caption.', { exact: true })).toBeVisible();
  await page.getByRole('radio', { name: 'Notes' }).click();
  await expect(page.getByRole('heading', { name: 'Summary' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('conversation-companion.session.unreadable'))).toBe('{invalid');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('conversation-companion.session.recoverable')!).notes))
    .toEqual({ summary: 'Broken' });
});
