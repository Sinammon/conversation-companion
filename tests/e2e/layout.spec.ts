import { expect, test } from '@playwright/test';

test('desktop sidebar, sample cards and phone dock keep the same notebook', async ({ page }) => {
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const demo = page.getByRole('button', { name: 'Lecture demo' });
  await demo.focus();
  await expect(demo).toBeFocused();
  await demo.press('Enter');
  await expect(page.getByRole('heading', { name: 'Lecture demo' })).toBeVisible();
  await page.getByRole('button', { name: 'Preferences' }).click();
  await expect(page.getByText('This is your caption size.')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Notebook' }).click();
  await expect(page.getByRole('button', { name: 'New session' })).toBeVisible();
  await expect(page.locator('.cc-lights')).toHaveCSS('pointer-events', 'none');
  expect(await page.locator('.cc-lights').evaluate(el => getComputedStyle(el, '::before').animationName)).toBe('none');
});
