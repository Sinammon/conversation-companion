import { expect, test } from '@playwright/test';

test('a long caption feed stays put while paused and follows again on request', async ({ page }) => {
  await page.addInitScript(() => {
    class FixtureSpeech extends EventTarget {
      start() {
        Reflect.set(window, 'addCaptions', (from: number, to: number) => {
          for (let i = from; i <= to; i++) {
            const result = Object.assign([{ transcript: 'Caption ' + i + '. ' + 'A longer caption wraps across several lines. '.repeat(3), confidence: 1 }], { isFinal: true });
            this.dispatchEvent(Object.assign(new Event('result'), { resultIndex: 0, results: [result] }));
          }
        });
        this.dispatchEvent(new Event('start'));
      }
      stop() { this.dispatchEvent(new Event('end')); }
      abort() { this.stop(); }
    }
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: FixtureSpeech, configurable: true });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'New session' }).click();
  await page.getByRole('checkbox', { name: /Everyone agrees/ }).check();
  await page.getByRole('button', { name: 'Start live captions' }).click();
  await page.evaluate(() => Reflect.get(window, 'addCaptions')(1, 80));
  const feed = page.getByTestId('caption-feed');
  await expect(page.getByText(/^Caption 80\./)).toBeInViewport();
  await page.getByRole('button', { name: 'Pause auto-scroll' }).click();
  await feed.evaluate(el => { el.scrollTop = 0; });
  await expect(page.getByText(/^Caption 1\./)).toBeInViewport();
  await page.evaluate(() => Reflect.get(window, 'addCaptions')(81, 100));
  await expect(page.getByText(/^Caption 100\./)).toBeAttached();
  await expect(page.getByText(/^Caption 1\./)).toBeInViewport();
  await expect(page.getByText(/^Caption 100\./)).not.toBeInViewport();
  await page.getByRole('button', { name: 'Follow live captions' }).click();
  await expect(page.getByText(/^Caption 100\./)).toBeInViewport();
});
