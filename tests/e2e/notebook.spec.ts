import { test, expect } from '@playwright/test';

test('consent, live captions, local save, reopen and deletion', async ({ page }) => {
  // Development fixture at the browser speech boundary. No microphone or sample data in the app.
  await page.addInitScript(() => {
    class FixtureSpeech extends EventTarget {
      start() {
        this.dispatchEvent(new Event('start'));
        const result = Object.assign([{ transcript: 'Thursday lab.', confidence: 1 }], { isFinal: true });
        this.dispatchEvent(Object.assign(new Event('result'), { resultIndex: 0, results: [result] }));
      }
      stop() { this.dispatchEvent(new Event('end')); }
      abort() { this.stop(); }
    }
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: FixtureSpeech, configurable: true });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'New session' }).click();
  const start = page.getByRole('button', { name: 'Start live captions' });
  await expect(start).toBeDisabled();
  await page.getByLabel('Session title', { exact: true }).fill('Development fixture');
  await page.getByRole('radio', { name: 'Meeting' }).click();
  await page.getByRole('checkbox', { name: /Everyone agrees/ }).check();
  await start.click();
  await expect(page.getByText('Thursday lab.', { exact: true })).toBeVisible();
  await expect(page.getByText('Listening', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Caption size' }).click();
  await page.getByRole('radio', { name: 'Largest' }).click();
  await expect(page.getByText('Thursday lab.', { exact: true })).toHaveCSS('font-size', '34px');
  await page.getByRole('button', { name: 'Caption size' }).click();
  await page.getByRole('button', { name: 'Stop microphone' }).click();
  await expect(page.getByText('Microphone off', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save session' }).click();
  await expect(page.getByRole('heading', { name: 'Development fixture' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Development fixture/ }).click();
  await expect(page.getByText('Thursday lab.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete session' }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.getByText('Your notebook is empty')).toBeVisible();
});

test('caption size persists and the empty notebook fits a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 650 });
  await page.goto('/');
  const dock = page.getByRole('tablist', { name: 'Main navigation' });
  await expect(dock.getByRole('tab', { name: 'Notebook', selected: true })).toBeVisible();
  await dock.getByRole('tab', { name: 'Preferences' }).click();
  await expect(dock.getByRole('tab', { name: 'Preferences', selected: true })).toBeVisible();
  await page.getByRole('radio', { name: 'Largest' }).click();
  await expect(page.getByText('This is your caption size.')).toHaveCSS('font-size', '34px');
  await page.reload();
  await page.getByRole('tab', { name: 'Preferences' }).click();
  await expect(page.getByRole('radio', { name: 'Largest' })).toBeChecked();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
