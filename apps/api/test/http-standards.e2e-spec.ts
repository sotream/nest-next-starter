import { createHmac } from 'node:crypto';
import request from 'supertest';
import { JWT_AUDIENCE, JWT_ISSUER } from '../src/modules/auth/auth.constants.js';
import { signUp } from './helpers/auth-client.js';
import { createTestApp } from './helpers/test-app.js';
import type { TestApp } from './helpers/test-app.js';

const WEB_ORIGIN = 'http://localhost:3000';
const DEV_SECRET = 'dev-only-access-secret-change-me-before-deploying';
const PROBLEM = /^application\/problem\+json/;

const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** A token signed like the API's own, so only the claim or algorithm under test differs. */
function forge(alg: 'HS256' | 'HS384' | 'HS512', claims: Record<string, unknown>): string {
  const head = part({ alg, typ: 'JWT' });
  const body = part({ exp: Math.floor(Date.now() / 1000) + 600, ...claims });
  const signature = createHmac(`sha${alg.slice(2)}`, DEV_SECRET)
    .update(`${head}.${body}`)
    .digest('base64url');
  return `${head}.${body}.${signature}`;
}

describe('HTTP standards (e2e)', () => {
  let ctx: TestApp;
  const http = () => request(ctx.app.getHttpServer());

  beforeAll(async () => {
    ctx = await createTestApp();
  });
  afterAll(() => ctx.close());
  beforeEach(() => ctx.reset());

  describe('errors are RFC 9457 problem details', () => {
    it('answers an unknown route', async () => {
      const res = await http().get('/api/v1/nope').expect(404);

      expect(res.headers['content-type']).toMatch(PROBLEM);
      expect(res.body).toEqual({
        type: 'about:blank',
        title: 'Not Found',
        status: 404,
        detail: 'Cannot GET /api/v1/nope',
        code: 'NOT_FOUND',
      });
    });

    it('lists each failed validation rule with a JSON Pointer', async () => {
      const res = await http()
        .post('/api/v1/auth/sign-up')
        .send({ email: 'not-an-email', password: 'short', extra: true })
        .expect(400);

      expect(res.headers['content-type']).toMatch(PROBLEM);
      expect(res.body).toMatchObject({
        status: 400,
        title: 'Bad Request',
        code: 'VALIDATION_FAILED',
        detail: 'Request validation failed',
      });
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          { pointer: '#/email', detail: 'email must be an email' },
          { pointer: '#/extra', detail: 'property extra should not exist' },
        ]),
      );
      expect(res.body).not.toHaveProperty('message');
    });

    it('answers a conflict', async () => {
      await signUp(ctx.app, 'dup@example.com');
      const res = await http()
        .post('/api/v1/auth/sign-up')
        .send({ email: 'dup@example.com', password: 'Password123!' })
        .expect(409);

      expect(res.headers['content-type']).toMatch(PROBLEM);
      expect(res.body).toMatchObject({ status: 409, code: 'CONFLICT' });
    });

    it('answers too many requests with Retry-After and no class name', async () => {
      const attempt = () =>
        http().post('/api/v1/auth/sign-in').send({ email: 'x@example.com', password: 'whatever1' });
      for (let i = 0; i < 10; i += 1) await attempt();

      const res = await attempt().expect(429);

      expect(res.headers['content-type']).toMatch(PROBLEM);
      expect(res.headers['retry-after']).toMatch(/^\d+$/);
      expect(res.body).toMatchObject({ status: 429, code: 'TOO_MANY_REQUESTS' });
      expect(res.body.detail).not.toContain('Exception');
    });
  });

  describe('errors raised before routing still carry the global headers', () => {
    it.each([
      ['malformed JSON', 400, '{"email":'],
      ['an oversized body', 413, JSON.stringify({ email: 'a'.repeat(200_000) })],
    ])('%s', async (_name, status, body) => {
      const res = await http()
        .post('/api/v1/auth/sign-in')
        .set('Origin', WEB_ORIGIN)
        .set('Content-Type', 'application/json')
        .send(body)
        .expect(status);

      expect(res.headers['content-type']).toMatch(PROBLEM);
      expect(res.headers['access-control-allow-origin']).toBe(WEB_ORIGIN);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers).not.toHaveProperty('x-powered-by');
      expect(res.body).toMatchObject({ type: 'about:blank', status });
    });

    it('answers 415 for a body that is not JSON', async () => {
      const res = await http()
        .post('/api/v1/auth/sign-in')
        .set('Content-Type', 'text/plain')
        .send('hello')
        .expect(415);

      expect(res.headers['content-type']).toMatch(PROBLEM);
      expect(res.body).toMatchObject({ status: 415, code: 'UNSUPPORTED_MEDIA_TYPE' });
    });

    it('does not ask for a body on a POST without one', async () => {
      await http().post('/api/v1/auth/logout').expect(204);
    });
  });

  describe('bearer authentication (RFC 6750, RFC 9110)', () => {
    it('challenges a request without credentials, without an error attribute', async () => {
      const res = await http().get('/api/v1/vehicles').expect(401);

      expect(res.headers['www-authenticate']).toBe('Bearer realm="api"');
      expect(res.headers['content-type']).toMatch(PROBLEM);
    });

    it('challenges a rejected token with invalid_token', async () => {
      const res = await http()
        .get('/api/v1/vehicles')
        .set('Authorization', 'Bearer not.a.token')
        .expect(401);

      expect(res.headers['www-authenticate']).toBe('Bearer realm="api", error="invalid_token"');
    });

    it('accepts the scheme in any letter case', async () => {
      const { session } = await signUp(ctx.app, 'case@example.com');

      await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `bEaReR ${session.accessToken}`)
        .expect(200);
    });

    it('does not cache the response that carries the access token', async () => {
      const { res } = await signUp(ctx.app, 'cache@example.com');

      expect(res.headers['cache-control']).toBe('no-store');
    });
  });

  describe('access tokens (RFC 8725)', () => {
    const claimsFor = async (email: string) => {
      const { session } = await signUp(ctx.app, email);
      const payload = JSON.parse(
        Buffer.from(session.accessToken.split('.')[1]!, 'base64url').toString(),
      );
      return { sub: payload.sub as string, role: payload.role as string, session };
    };
    const me = (token: string) =>
      http().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);

    it('issues HS256 tokens with issuer and audience', async () => {
      const { session } = await claimsFor('claims@example.com');
      const [head, body] = session.accessToken
        .split('.')
        .slice(0, 2)
        .map((p) => JSON.parse(Buffer.from(p, 'base64url').toString()));

      expect(head).toMatchObject({ alg: 'HS256' });
      expect(body).toMatchObject({ iss: JWT_ISSUER, aud: JWT_AUDIENCE });
    });

    it('accepts a correctly forged HS256 token, which proves the other cases fail on purpose', async () => {
      const { sub, role } = await claimsFor('ok@example.com');

      await me(forge('HS256', { sub, role, iss: JWT_ISSUER, aud: JWT_AUDIENCE })).expect(200);
    });

    it.each(['HS384', 'HS512'] as const)('rejects a token signed with %s', async (alg) => {
      const { sub, role } = await claimsFor(`${alg}@example.com`);

      await me(forge(alg, { sub, role, iss: JWT_ISSUER, aud: JWT_AUDIENCE })).expect(401);
    });

    it('rejects a token from another issuer or for another audience', async () => {
      const { sub, role } = await claimsFor('claims2@example.com');

      await me(forge('HS256', { sub, role, iss: 'someone-else', aud: JWT_AUDIENCE })).expect(401);
      await me(forge('HS256', { sub, role, iss: JWT_ISSUER, aud: 'other-service' })).expect(401);
      await me(forge('HS256', { sub, role })).expect(401);
    });

    it('rejects an unsigned token', async () => {
      const { sub } = await claimsFor('none@example.com');
      const token = `${part({ alg: 'none', typ: 'JWT' })}.${part({ sub, role: 'ADMIN', iss: JWT_ISSUER, aud: JWT_AUDIENCE })}.`;

      await me(token).expect(401);
    });
  });

  describe('passwords are limited in bytes for bcrypt', () => {
    const signUpWith = (password: string) =>
      http()
        .post('/api/v1/auth/sign-up')
        .send({ email: `${Math.random()}@example.com`, password });

    it('accepts exactly 72 bytes of multi-byte text', async () => {
      await signUpWith('п'.repeat(36)).expect(201);
    });

    it('rejects more than 72 bytes even when there are fewer than 72 characters', async () => {
      const res = await signUpWith('п'.repeat(37)).expect(400);

      expect(res.body.errors).toEqual([
        { pointer: '#/password', detail: 'password must be at most 72 bytes in UTF-8' },
      ]);
    });

    it('lets sign-in stay lenient up to 128 characters, so no account is locked out', async () => {
      const attempt = (password: string) =>
        http().post('/api/v1/auth/sign-in').send({ email: 'lenient@example.com', password });

      await attempt('x'.repeat(128)).expect(401);
      await attempt('x'.repeat(129)).expect(400);
    });
  });

  describe('created resources and cross-origin access', () => {
    it('points Location at the created vehicle', async () => {
      const { session } = await signUp(ctx.app, 'loc@example.com');

      const res = await http()
        .post('/api/v1/vehicles')
        .set('Authorization', `Bearer ${session.accessToken}`)
        .send({ plateNumber: 'LOC-1', model: 'Golf', fuelType: 'PETROL' })
        .expect(201);

      expect(res.headers.location).toBe(`/api/v1/vehicles/${res.body.id}`);
      await http()
        .get(res.headers.location!)
        .set('Authorization', `Bearer ${session.accessToken}`)
        .expect(200);
    });

    it('exposes the headers a browser client needs and caches the preflight', async () => {
      const simple = await http().get('/api/health/live').set('Origin', WEB_ORIGIN).expect(200);
      expect(simple.headers['access-control-expose-headers']).toBe(
        'Retry-After,Location,X-Request-Id',
      );

      const preflight = await http()
        .options('/api/v1/vehicles')
        .set('Origin', WEB_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);
      expect(preflight.headers['access-control-max-age']).toBe('600');
    });
  });
});
