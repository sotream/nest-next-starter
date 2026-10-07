import request from 'supertest';
import { logout, refresh, signIn, signUp } from './helpers/auth-client.js';
import { createTestApp } from './helpers/test-app.js';
import type { TestApp } from './helpers/test-app.js';

const bearer = (token: string): [string, string] => ['Authorization', `Bearer ${token}`];
const vehicle = (plateNumber: string) => ({ plateNumber, model: 'Golf', fuelType: 'PETROL' });

describe('API (e2e)', () => {
  let ctx: TestApp;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.close());
  beforeEach(() => ctx.reset());

  it('answers liveness without touching dependencies', async () => {
    const res = await http().get('/api/health/live').expect(200);

    expect(res.body).toEqual({ status: 'ok' });
  });

  it('reports database and Redis as ready', async () => {
    const res = await http().get('/api/health/ready').expect(200);

    expect(res.body.info).toMatchObject({ database: { status: 'up' }, redis: { status: 'up' } });
  });

  it('runs the full flow: sign-up, sign-in, create, list, refresh, logout', async () => {
    const created = await signUp(ctx.app, 'flow@example.com');
    expect(created.res.status).toBe(201);
    expect(created.res.headers['set-cookie']?.[0]).toMatch(
      /^starter_rt=.*Path=\/api\/v1\/auth.*HttpOnly/i,
    );

    const { session } = await signIn(ctx.app, 'flow@example.com');

    await http()
      .post('/api/v1/vehicles')
      .set(...bearer(session.accessToken))
      .send(vehicle('E2E-1'))
      .expect(201);

    const list = await http()
      .get('/api/v1/vehicles')
      .set(...bearer(session.accessToken))
      .expect(200);
    expect(list.body).toMatchObject({ total: 1, limit: 20, offset: 0 });
    expect(list.body.items[0].plateNumber).toBe('E2E-1');

    const refreshed = await refresh(ctx.app, session.refreshCookie).expect(200);
    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    const rotatedCookie = refreshed.headers['set-cookie']?.[0]?.split(';')[0] ?? '';
    expect(rotatedCookie).not.toBe(session.refreshCookie);

    await logout(ctx.app, rotatedCookie).expect(204);
    await refresh(ctx.app, rotatedCookie).expect(401);
  });

  it('revokes the whole session when a rotated refresh cookie is replayed', async () => {
    const { session } = await signUp(ctx.app, 'replay@example.com');
    const rotated = await refresh(ctx.app, session.refreshCookie).expect(200);
    const newCookie = rotated.headers['set-cookie']?.[0]?.split(';')[0] ?? '';

    await refresh(ctx.app, session.refreshCookie).expect(401);
    await refresh(ctx.app, newCookie).expect(401);
  });

  it('rejects requests without a valid access token', async () => {
    await http().get('/api/v1/vehicles').expect(401);
    await http()
      .get('/api/v1/auth/me')
      .set(...bearer('not-a-jwt'))
      .expect(401);
  });

  it('returns the current user from /auth/me', async () => {
    const { session } = await signUp(ctx.app, 'me@example.com');

    const res = await http()
      .get('/api/v1/auth/me')
      .set(...bearer(session.accessToken))
      .expect(200);

    expect(res.body).toMatchObject({ email: 'me@example.com', role: 'USER' });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('validates input and rejects unknown fields', async () => {
    const { session } = await signUp(ctx.app, 'valid@example.com');

    await http().post('/api/v1/auth/sign-up').send({ email: 'bad', password: 'short' }).expect(400);
    await http()
      .post('/api/v1/vehicles')
      .set(...bearer(session.accessToken))
      .send({ ...vehicle('X-1'), ownerId: 'someone-else' })
      .expect(400);
  });

  it('answers 409 for duplicate emails and plate numbers', async () => {
    const { session } = await signUp(ctx.app, 'dup@example.com');
    await http()
      .post('/api/v1/auth/sign-up')
      .send({ email: 'dup@example.com', password: 'Password123!' })
      .expect(409);

    const create = () =>
      http()
        .post('/api/v1/vehicles')
        .set(...bearer(session.accessToken))
        .send(vehicle('DUP-1'));
    await create().expect(201);
    await create().expect(409);
  });

  it('keeps vehicles private to their owner but visible to admins', async () => {
    const alice = (await signUp(ctx.app, 'alice@example.com')).session;
    const bob = (await signUp(ctx.app, 'bob@example.com')).session;
    const created = await http()
      .post('/api/v1/vehicles')
      .set(...bearer(alice.accessToken))
      .send(vehicle('ALICE-1'))
      .expect(201);

    await http()
      .get(`/api/v1/vehicles/${created.body.id}`)
      .set(...bearer(bob.accessToken))
      .expect(404);
    const bobList = await http()
      .get('/api/v1/vehicles')
      .set(...bearer(bob.accessToken))
      .expect(200);
    expect(bobList.body.total).toBe(0);

    await ctx.dataSource.query(`UPDATE users SET role = 'ADMIN' WHERE email = 'bob@example.com'`);
    const adminSession = (await signIn(ctx.app, 'bob@example.com')).session;
    const adminList = await http()
      .get('/api/v1/vehicles')
      .set(...bearer(adminSession.accessToken))
      .expect(200);
    expect(adminList.body.total).toBe(1);
  });

  it('updates and deletes own vehicles', async () => {
    const { session } = await signUp(ctx.app, 'crud@example.com');
    const created = await http()
      .post('/api/v1/vehicles')
      .set(...bearer(session.accessToken))
      .send(vehicle('CRUD-1'))
      .expect(201);
    const url = `/api/v1/vehicles/${created.body.id}`;

    const updated = await http()
      .patch(url)
      .set(...bearer(session.accessToken))
      .send({ model: 'Polo' })
      .expect(200);
    expect(updated.body.model).toBe('Polo');

    await http()
      .delete(url)
      .set(...bearer(session.accessToken))
      .expect(204);
    await http()
      .get(url)
      .set(...bearer(session.accessToken))
      .expect(404);
  });

  it('rate limits auth endpoints with 429', async () => {
    const attempt = () =>
      http().post('/api/v1/auth/sign-in').send({ email: 'x@example.com', password: 'whatever1' });

    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      statuses.push((await attempt()).status);
    }

    expect(statuses.slice(0, 10)).not.toContain(429);
    expect(statuses.slice(10)).toEqual([429, 429]);
  });

  it('keeps refresh in its own rate-limit bucket, apart from sign-in', async () => {
    for (let i = 0; i < 11; i += 1) {
      await http()
        .post('/api/v1/auth/sign-in')
        .send({ email: 'x@example.com', password: 'whatever1' });
    }

    const res = await http().post('/api/v1/auth/refresh');

    expect(res.status).toBe(401);
  });

  it('rejects refresh and logout from a foreign Origin without touching the session', async () => {
    const { session } = await signUp(ctx.app, 'origin@example.com');
    const foreign = 'http://evil.localhost:3000';

    await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', session.refreshCookie)
      .set('Origin', foreign)
      .expect(403);
    await http()
      .post('/api/v1/auth/logout')
      .set('Cookie', session.refreshCookie)
      .set('Origin', foreign)
      .expect(403);

    await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', session.refreshCookie)
      .set('Origin', 'http://localhost:3000')
      .expect(200);
  });

  it('sets security headers and hides the framework', async () => {
    const res = await http().get('/api/health/live').expect(200);

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('rejects oversized JSON bodies with 413', async () => {
    await http()
      .post('/api/v1/auth/sign-in')
      .send({ email: 'x@example.com', password: 'a'.repeat(200_000) })
      .expect(413);
  });
});
