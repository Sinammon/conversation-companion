import { expect, test } from '@playwright/test';

for (const duration of ['short session', 'full interval']) {
test('student live notes save offline highlights · ' + duration, async ({page}) => {
  test.skip(process.env.EXPO_PUBLIC_LIVE_NOTES === '1' && !!process.env.EXPO_PUBLIC_AI_URL, 'Use the student build.');
  const requests: string[] = [];
  page.on('request', request => { if (request.url().endsWith('/live-notes')) requests.push(request.url()); });
  await page.addInitScript(() => {
    class Fixture extends EventTarget {
      start() {
        this.dispatchEvent(new Event('start'));
        const result = Object.assign([{transcript:'The workshop meets Friday.',confidence:1}],{isFinal:true});
        this.dispatchEvent(Object.assign(new Event('result'),{resultIndex:0,results:[result]}));
      }
      stop() { this.dispatchEvent(new Event('end')); }
      abort() { this.stop(); }
    }
    Object.defineProperty(window,'webkitSpeechRecognition',{value:Fixture,configurable:true});
  });
  await page.goto('/');
  await page.getByRole('button',{name:'New session'}).click();
  await page.getByRole('checkbox',{name:/Everyone agrees/}).check();
  await page.getByRole('button',{name:'Live notes',exact:true}).click();
  await page.clock.install();
  await page.getByRole('button',{name:'Start with on-device highlights'}).click();
  await expect(page.getByText('Listening',{exact:true})).toBeVisible();
  if (duration === 'full interval') {
    await page.clock.fastForward(45000);
    await expect(page.getByText('• The workshop meets Friday.',{exact:true})).toBeVisible();
  }
  await page.getByRole('button',{name:'Stop microphone'}).click();
  await page.getByRole('button',{name:'Save session'}).click();
  await page.context().setOffline(true);
  await page.getByRole('radio',{name:'Notes'}).click();
  await expect(page.getByText('• The workshop meets Friday.',{exact:true})).toBeVisible();
  expect(requests).toEqual([]);
});
}

test('starting a fresh session with live notes opens the draft reader', async ({page}) => {
  test.skip(!process.env.EXPO_PUBLIC_AI_URL || process.env.EXPO_PUBLIC_LIVE_NOTES !== '1', 'Requires the private pilot build.');
  await page.addInitScript(() => {
    class SpeechFixture extends EventTarget { start() { this.dispatchEvent(new Event('start')); } stop() { this.dispatchEvent(new Event('end')); } abort() { this.stop(); } }
    Object.defineProperty(window, 'webkitSpeechRecognition', {value:SpeechFixture, configurable:true});
  });
  await page.goto('/');
  await page.getByRole('button',{name:'New session'}).click();
  await page.getByRole('checkbox',{name:/Everyone agrees/}).check();
  await page.getByRole('button',{name:'Live notes', exact:true}).click();
  await page.getByRole('button',{name:'Agree and start with live notes'}).click();
  await expect(page.getByText('Waiting for new captions')).toBeVisible();
  await expect(page.getByRole('button',{name:'Stop microphone'})).toBeInViewport();
});

test('live drafts opt in during capture, survive a restart and open offline', async ({page}) => {
  const url = process.env.EXPO_PUBLIC_AI_URL?.replace(/\/+$/, '');
  test.skip(!url || process.env.EXPO_PUBLIC_LIVE_NOTES !== '1', 'Requires the private pilot build.');
  await page.addInitScript(() => {
    class SpeechFixture extends EventTarget {
      start() {
        Reflect.set(window, 'speak', (text: string) => {
          const result = Object.assign([{transcript:text,confidence:1}], {isFinal:true});
          this.dispatchEvent(Object.assign(new Event('result'), {resultIndex:0, results:[result]}));
        });
        this.dispatchEvent(new Event('start'));
      }
      stop() {
        // A recognizer may return speech for the first time while draining.
        Reflect.get(window,'speak')('Delayed final from the earlier microphone run.');
        this.dispatchEvent(new Event('end'));
      }
      abort() { this.stop(); }
    }
    Object.defineProperty(window, 'webkitSpeechRecognition', {value:SpeechFixture, configurable:true});
  });
  const requests: string[] = [];
  const quote = 'The invented workshop starts Friday.';
  await page.route(url + '/live-notes', route => {
    requests.push(route.request().postDataJSON().transcript);
    return route.fulfill({json:{items:[{text:'Workshop on Friday.', quote}]}});
  });
  await page.goto('/');
  await page.getByRole('button',{name:'New session'}).click();
  await page.getByLabel('Session title',{exact:true}).fill('Draft exercise');
  await page.getByRole('checkbox',{name:/Everyone agrees/}).check();
  await page.getByRole('button',{name:'Start live captions'}).click();
  await expect(page.getByText('Listening',{exact:true})).toBeVisible();
  await page.clock.install();
  await page.evaluate(() => Reflect.get(window,'speak')('Before opting in.'));
  await page.getByRole('button',{name:'Live notes',exact:true}).click();
  await page.getByRole('button',{name:'Stop to set up live notes'}).click();
  await expect(page.getByText('Microphone off', {exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Agree and start with live notes'}).click();
  await page.clock.fastForward(45000);
  expect(requests).toEqual([]);
  await page.evaluate(text => Reflect.get(window,'speak')(text), quote);
  await page.clock.fastForward(45000);
  await expect(page.getByText('Latest draft')).toBeVisible();
  expect(requests).toEqual([quote]);
  await page.getByRole('button',{name:'Bookmark latest caption'}).click();
  await page.getByRole('button',{name:'Stop microphone'}).click();
  await page.getByRole('button',{name:'Save session'}).click();
  await page.reload();
  await page.getByRole('button',{name:/Draft exercise/}).click();
  await expect(page.getByRole('button',{name:/Open bookmark/})).toBeVisible();
  await page.context().setOffline(true);
  await page.getByRole('radio',{name:'Notes'}).click();
  await expect(page.getByRole('heading',{name:'Live drafts'})).toBeVisible();
  await expect(page.getByText('• Workshop on Friday.')).toBeVisible();
  await expect(page.getByText('“' + quote + '”')).toBeVisible();
});
