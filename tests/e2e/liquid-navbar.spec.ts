import { expect, test } from '@playwright/test';

test('the Waterline dock remains operable without WebGL and follows the keyboard', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...options: unknown[]) {
      if (type.startsWith('webgl')) return null;
      return Reflect.apply(getContext, this, [type, ...options]);
    } as typeof getContext;
  });
  await page.goto('/');
  const dock = page.getByRole('tablist', { name: 'Main navigation' });
  const notebook = dock.getByRole('tab', { name: 'Notebook' });
  const preferences = dock.getByRole('tab', { name: 'Preferences' });
  const highlight = dock.locator('.nimbus-drop');

  await expect(dock).toHaveAttribute('data-gl', 'off');
  await expect(highlight).toBeVisible();
  await expect(notebook).toHaveAttribute('aria-selected', 'true');
  await expect(preferences).toHaveAttribute('tabindex', '-1');
  await notebook.focus();
  await notebook.press('ArrowRight');
  await expect(preferences).toBeFocused();
  await expect(preferences).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'Preferences' })).toBeVisible();
  const bounds = await highlight.boundingBox();
  const tabBounds = await preferences.boundingBox();
  expect(Math.abs(bounds!.x - tabBounds!.x)).toBeLessThanOrEqual(2);
  await preferences.press('ArrowRight');
  await expect(notebook).toBeFocused();
  await expect(page.getByRole('heading', { name: 'My notebook' })).toBeVisible();
});
