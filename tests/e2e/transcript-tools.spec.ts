import { expect, test } from '@playwright/test';

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
