import { randomUUID } from 'node:crypto';
import { RefreshTokenCleanupService } from '../src/modules/auth/refresh-token-cleanup.service.js';
import { signUp } from './helpers/auth-client.js';
import { createTestApp } from './helpers/test-app.js';
import type { TestApp } from './helpers/test-app.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-10-07T12:00:00Z');
const daysFromNow = (days: number) => new Date(NOW.getTime() + days * DAY_MS);

describe('refresh token cleanup (e2e)', () => {
  let ctx: TestApp;
  let cleanup: RefreshTokenCleanupService;
  let userId: string;

  beforeAll(async () => {
    ctx = await createTestApp();
    cleanup = ctx.app.get(RefreshTokenCleanupService);
  });
  afterAll(() => ctx.close());
  beforeEach(async () => {
    await ctx.reset();
    await signUp(ctx.app, 'cleanup@example.com');
    const [{ id }] = (await ctx.dataSource.query('SELECT id FROM users')) as [{ id: string }];
    userId = id;
    await ctx.dataSource.query('DELETE FROM refresh_tokens');
  });

  async function insert(name: string, expiresAt: Date, revokedAt: Date | null): Promise<void> {
    await ctx.dataSource.query(
      `INSERT INTO refresh_tokens ("tokenHash", "familyId", "userId", "expiresAt", "revokedAt")
       VALUES ($1, $2, $3, $4, $5)`,
      [`${name}-${randomUUID()}`.slice(0, 64), randomUUID(), userId, expiresAt, revokedAt],
    );
  }

  const remaining = async () =>
    (
      (await ctx.dataSource.query('SELECT "tokenHash" FROM refresh_tokens')) as {
        tokenHash: string;
      }[]
    )
      .map((row) => row.tokenHash.split('-')[0])
      .sort();

  it('removes expired and long-revoked tokens and keeps the rest', async () => {
    // Retention defaults to 14 days.
    await insert('expired', daysFromNow(-1), null);
    await insert('revoked-old', daysFromNow(5), daysFromNow(-15));
    await insert('active', daysFromNow(5), null);
    await insert('revoked-recent', daysFromNow(5), daysFromNow(-2));

    const removed = await cleanup.cleanup(NOW);

    expect(removed).toBe(2);
    expect(await remaining()).toEqual(['active', 'revoked']);
  });

  it('works through batches', async () => {
    for (let i = 0; i < 5; i += 1) await insert(`expired${i}`, daysFromNow(-1), null);
    await insert('active', daysFromNow(5), null);

    expect(await cleanup.cleanup(NOW, 2)).toBe(5);
    expect(await remaining()).toEqual(['active']);
  });

  it('is safe to run concurrently, as replicas do', async () => {
    for (let i = 0; i < 20; i += 1) await insert(`expired${i}`, daysFromNow(-1), null);

    const counts = await Promise.all([cleanup.cleanup(NOW, 3), cleanup.cleanup(NOW, 3)]);

    expect(counts[0]! + counts[1]!).toBe(20);
    expect(await remaining()).toEqual([]);
  });
});
