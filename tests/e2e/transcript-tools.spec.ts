import { expect, test } from '@playwright/test';

test('two open copies can bookmark different captions and approve sharing without losing either mark', async ({page,context}) => {
  // Exercise the fallback used by phone browsers on a plain HTTP Wi-Fi address.
  await context.addInitScript(() => Object.defineProperty(navigator, 'locks', {value:undefined, configurable:true}));
  const key = 'conversation-companion.session.two-tabs';
  await page.goto('/');
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({id:'two-tabs',title:'Shared notebook',mode:'Lecture', startedAt:1,durationMs:2000,allowAI:false,captions:[{text:'First line',at:0},{text:'Second line',at:1000}]})), key);
  await page.reload();
  const other = await context.newPage();
  await other.goto('/');
  for (const tab of [page,other]) await tab.getByRole('button',{name:/Shared notebook/}).click();
  await page.getByRole('button',{name:'Bookmark · Caption 1',exact:true}).click();
  await other.getByRole('button',{name:'Bookmark · Caption 2',exact:true}).click();
  await page.getByRole('radio',{name:'Notes'}).click();
  if (process.env.EXPO_PUBLIC_AI_URL) await page.getByRole('button',{name:'Allow sharing with Google Gemini'}).click();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).bookmarks, key)).toEqual([0,1]);
});

test('a notebook match opens its transcript and a saved bookmark opens with context', async ({page}) => {
  await page.addInitScript(() => {
    const key = 'conversation-companion.session.read';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({id:'read', title:'Class review',
      startedAt:1, durationMs:8000, mode:'Lecture', allowAI:false,
      notes:{summary:'Earlier notes',sections:[]}, captions:Array.from({length:8}, (_,i) => ({
        text:i === 4 ? 'Meet at the north entrance.' : 'Line number ' + i, at:i*1000
      }))}));
  });
  await page.goto('/');
  await page.getByLabel('Search saved sessions').fill('NORTH');
  await page.getByRole('button',{name:/Class review.*north entrance/i}).click();
  await expect(page.getByLabel('Find in transcript')).toHaveValue('NORTH');
  await expect(page.getByText('Line number 0')).toHaveCount(0);
  await page.getByRole('button',{name:'Bookmark · Caption 5', exact:true}).click();
  await page.reload();
  await page.getByRole('button',{name:/Class review/}).click();
  await expect(page.getByText('Earlier notes')).toBeVisible();
  await page.getByRole('radio',{name:'Transcript'}).click();
  await page.getByRole('button',{name:/Open bookmark/}).click();
  await expect(page.getByText('Line number 2')).toBeVisible();
  await expect(page.getByText('Line number 6')).toBeVisible();
  await expect(page.getByText('Line number 1')).toHaveCount(0);
  await page.getByRole('button',{name:'Remove bookmark · Caption 5'}).click();
  await expect(page.getByRole('button',{name:/Open bookmark/})).toHaveCount(0);
});
