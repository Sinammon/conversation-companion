import { expect, test } from '@playwright/test';

test('withdrawing consent cancels microphone setup and releases the late track', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Explicit microphone selection is a desktop Chrome feature.');
  await page.addInitScript(() => {
    const state = { starts: 0, selectedStops: 0, resolve: undefined as (() => void) | undefined };
    Reflect.set(window, 'micFixture', state);
    Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', { value: async () => [
      { kind: 'audioinput', deviceId: 'external', label: 'Fixture microphone' },
    ] });
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async (constraints: MediaStreamConstraints) => {
      const selected = constraints.audio !== true;
      if (selected && !state.resolve) await new Promise<void>(resolve => { state.resolve = resolve; });
      const track = Object.assign(new EventTarget(), {
        readyState: 'live', label: 'Fixture microphone',
        getSettings: () => ({ deviceId: 'external' }),
        stop: () => { if (selected) state.selectedStops++; },
      });
      return { getAudioTracks: () => [track], getTracks: () => [track] };
    } });
    class FixtureSpeech extends EventTarget {
      start() { state.starts++; this.dispatchEvent(new Event('start')); }
      stop() { this.dispatchEvent(new Event('end')); }
      abort() { this.stop(); }
    }
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: FixtureSpeech, configurable: true });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'New session' }).click();
  const consent = page.getByRole('checkbox', { name: /Everyone agrees/ });
  await consent.check();
  await page.getByRole('button', { name: 'Choose microphone' }).click();
  await page.getByRole('radio', { name: 'Fixture microphone' }).click();
  await page.getByRole('button', { name: 'Start live captions' }).click();
  await page.waitForFunction(() => !!Reflect.get(window, 'micFixture').resolve);
  await consent.uncheck();
  await page.evaluate(() => Reflect.get(window, 'micFixture').resolve());
  await expect.poll(() => page.evaluate(() => Reflect.get(window, 'micFixture').selectedStops)).toBe(1);
  expect(await page.evaluate(() => Reflect.get(window, 'micFixture').starts)).toBe(0);
  await expect(page.getByRole('button', { name: 'Start live captions' })).toBeDisabled();
  await consent.check();
  await page.getByRole('button', { name: 'Start live captions' }).click();
  await expect(page.getByText('Listening', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, 'micFixture').starts)).toBe(1);
});

test('withdrawing consent releases a microphone used to discover devices', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Explicit microphone selection is a desktop Chrome feature.');
  await page.addInitScript(() => {
    const state = { stops: 0, finishListing: undefined as (() => void) | undefined };
    Reflect.set(window, 'listingFixture', state);
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => ({
      getTracks: () => [{ stop: () => state.stops++ }],
    }) });
    Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', { value: async () => {
      await new Promise<void>(resolve => { state.finishListing = resolve; });
      return [];
    } });
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: class {}, configurable: true });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'New session' }).click();
  const consent = page.getByRole('checkbox', { name: /Everyone agrees/ });
  await consent.check();
  await page.getByRole('button', { name: 'Choose microphone' }).click();
  await page.waitForFunction(() => !!Reflect.get(window, 'listingFixture').finishListing);
  await consent.uncheck();
  await expect.poll(() => page.evaluate(() => Reflect.get(window, 'listingFixture').stops)).toBe(1);
  await page.evaluate(() => Reflect.get(window, 'listingFixture').finishListing());
  await consent.check();
  await expect(page.getByRole('button', { name: 'Choose microphone' })).toBeEnabled();
  expect(await page.evaluate(() => Reflect.get(window, 'listingFixture').stops)).toBe(1);
});
