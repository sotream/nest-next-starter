import { expect, test } from '@playwright/test';
import { SEED_USER, signIn } from './helpers';

test('desktop shows the sidebar with the current page marked', async ({ page }) => {
  await signIn(page);

  await expect(page.getByRole('link', { name: 'Vehicles' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('complementary').getByText(SEED_USER.email)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open menu' })).toBeHidden();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('the burger opens a drawer that closes on navigation and can sign out', async ({ page }) => {
    await signIn(page);
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav).toBeHidden();

    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: 'Vehicles' }).click();
    await expect(nav).toBeHidden();

    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.keyboard.press('Escape');
    await expect(nav).toBeHidden();

    await page.getByRole('button', { name: 'Open menu' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});
