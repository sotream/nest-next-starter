import request from 'supertest';
import { createTestApp } from './helpers/test-app.js';
import type { TestApp } from './helpers/test-app.js';

const signInAttempt = (ctx: TestApp) =>
  request(ctx.app.getHttpServer())
    .post('/api/v1/auth/sign-in')
    .send({ email: 'x@example.com', password: 'whatever1' });

describe('rate limiting across API instances', () => {
  let first: TestApp;
  let second: TestApp;

  beforeAll(async () => {
    first = await createTestApp();
    second = await createTestApp();
  });
  afterAll(async () => {
    await first.close();
    await second.close();
  });
  beforeEach(() => first.reset());

  it('counts requests from two instances against one shared limit', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 10; i += 1) {
      statuses.push((await signInAttempt(i % 2 === 0 ? first : second)).status);
    }
    expect(statuses).not.toContain(429);

    expect((await signInAttempt(first)).status).toBe(429);
    expect((await signInAttempt(second)).status).toBe(429);
  });
});
