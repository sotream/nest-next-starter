import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Created by `pnpm db:seed`. */
export const SEED_USER = { email: 'user@example.com', password: 'User123!local' };

export async function signIn(page: Page): Promise<void> {
  await page.goto('/sign-in');
  await page.getByLabel('Email').fill(SEED_USER.email);
  await page.getByLabel('Password').fill(SEED_USER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Vehicles' })).toBeVisible();
}

/** Plates are unique per run so a failed run cannot collide with the next one. */
export const uniquePlate = (): string => `E2E-${Date.now().toString(36).toUpperCase()}`;
