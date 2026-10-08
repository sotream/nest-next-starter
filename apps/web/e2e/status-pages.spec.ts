import { expect, test } from '@playwright/test';

test('an unknown address shows the custom 404 page with a way back', async ({ page }) => {
  const response = await page.goto('/this-page-does-not-exist');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();

  await page.getByRole('link', { name: 'Go to vehicles' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
