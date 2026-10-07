import { expect, test } from '@playwright/test';
import { signIn, uniquePlate } from './helpers';

test('signs in, manages a vehicle, keeps the session on reload and signs out', async ({ page }) => {
  const cspViolations: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) cspViolations.push(message.text());
  });
  const plate = uniquePlate();

  await signIn(page);

  await page.getByRole('button', { name: 'Add vehicle' }).click();
  await page.getByLabel('Plate number').fill(plate);
  await page.getByLabel('Model').fill('Test Model');
  await page.getByRole('button', { name: 'Save vehicle' }).click();
  await expect(page.getByText(plate)).toBeVisible();

  await page.getByRole('button', { name: `Edit ${plate}` }).click();
  await page.getByLabel('Model').fill('Edited Model');
  await page.getByRole('button', { name: 'Save vehicle' }).click();
  await expect(page.getByText('Edited Model')).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
  await expect(page.getByText(plate)).toBeVisible();

  await page.getByRole('button', { name: `Delete ${plate}` }).click();
  await page.getByRole('button', { name: 'Confirm delete' }).click();
  await expect(page.getByText(plate)).toBeHidden();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.goto('/vehicles');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  expect(cspViolations).toEqual([]);
});
