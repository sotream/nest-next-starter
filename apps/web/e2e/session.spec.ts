import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('shows a retry instead of signing out when the session check fails, then recovers', async ({
  page,
}) => {
  await signIn(page);

  await page.route('**/api/v1/auth/refresh', (route) => route.fulfill({ status: 503, body: '{}' }));
  await page.reload();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByText('We could not check your session')).toBeVisible();

  await page.unroute('**/api/v1/auth/refresh');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
});

test('two tabs refreshing at the same time both stay signed in', async ({ context, page }) => {
  await signIn(page);
  const second = await context.newPage();
  await second.goto('/vehicles');
  await expect(second.getByRole('heading', { name: 'Vehicles' })).toBeVisible();

  const statuses: number[] = [];
  for (const tab of [page, second]) {
    tab.on('response', (response) => {
      if (response.url().endsWith('/auth/refresh')) statuses.push(response.status());
    });
  }

  // Both tabs lose their in-memory token and refresh at once; the Web Lock must serialise them.
  await Promise.all([page.reload(), second.reload()]);

  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
  await expect(second.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
  expect(statuses).toEqual([200, 200]);
});
