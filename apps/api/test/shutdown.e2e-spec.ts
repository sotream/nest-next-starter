import { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import { REDIS } from '../src/infrastructure/cache/redis.module.js';
import { createTestApp } from './helpers/test-app.js';

describe('graceful shutdown (e2e)', () => {
  it('closes the database and Redis connections when the app closes', async () => {
    const ctx = await createTestApp();
    const dataSource = ctx.app.get(DataSource);
    const redis = ctx.app.get<Redis>(REDIS);
    expect(dataSource.isInitialized).toBe(true);

    await ctx.close();

    expect(dataSource.isInitialized).toBe(false);
    await vi.waitFor(() => expect(redis.status).toBe('end'));
  });
});
