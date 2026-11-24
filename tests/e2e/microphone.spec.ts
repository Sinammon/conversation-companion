import { expect, test } from '@playwright/test';

test('desktop capture uses the selected track and pauses if it disconnects', async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as typeof window & { selectedTrack?: EventTarget; stopped?: number; usedExactDevice?: boolean; forwarded?: boolean };
    const devices = navigator.mediaDevices;
    Object.defineProperty(devices, 'enumerateDevices', { value: async () => [
      { kind: 'audioinput', deviceId: 'default', label: 'Default' },
      { kind: 'audioinput', deviceId: 'external', label: 'USB microphone' },
    ] });
    Object.defineProperty(devices, 'getUserMedia', { value: async (constraints: MediaStreamConstraints) => {
      const exact = typeof constraints.audio === 'object' && constraints.audio.deviceId;
      state.usedExactDevice = typeof exact === 'object' && 'exact' in exact && exact.exact === 'external';
      const track = Object.assign(new EventTarget(), { label: 'USB microphone', readyState: 'live',
        getSettings: () => ({ deviceId: 'external' }), stop: () => { state.stopped = (state.stopped ?? 0) + 1; } });
      if (state.usedExactDevice) state.selectedTrack = track;
      return { getAudioTracks: () => [track], getTracks: () => [track] };
    } });
    class FixtureSpeech extends EventTarget {
      start(track: EventTarget) {
        state.forwarded = !!track && track === state.selectedTrack;
        this.dispatchEvent(new Event('start'));
        const result = Object.assign([{ transcript: 'Caption from the external microphone.', confidence: 1 }], { isFinal: true });
        this.dispatchEvent(Object.assign(new Event('result'), { resultIndex: 0, results: [result] }));
      }
      stop() { this.dispatchEvent(new Event('end')); }
      abort() { this.stop(); }
    }
    Object.defineProperty(window, 'webkitSpeechRecognition', { value: FixtureSpeech, configurable: true });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'New session' }).click();
  await page.getByRole('checkbox', { name: /Everyone agrees/ }).check();
  await page.getByRole('button', { name: 'Choose microphone' }).click();
  await page.getByRole('radio', { name: 'USB microphone' }).click();
  await page.getByRole('button', { name: 'Start live captions' }).click();
  await expect(page.getByText('Microphone in use: USB microphone')).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, 'forwarded'))).toBe(true);
  await page.evaluate(() => Reflect.get(window, 'selectedTrack').dispatchEvent(new Event('ended')));
  await expect(page.getByRole('alert')).toContainText('disconnected');
  await expect(page.getByText('Caption from the external microphone.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Resume captions' })).toBeDisabled();
  expect(await page.evaluate(() => Reflect.get(window, 'stopped'))).toBe(2);
  await page.getByRole('button', { name: 'Choose microphone' }).click();
  await page.getByRole('radio', { name: 'System default' }).click();
  await expect(page.getByRole('button', { name: 'Resume captions' })).toBeEnabled();
});
