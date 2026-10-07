import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { REFRESH_COOKIE_NAME } from '../../src/modules/auth/auth.constants.js';
import type { Response } from 'supertest';

const BASE = '/api/v1/auth';

export interface Session {
  accessToken: string;
  /** Raw `name=value` pair of the refresh cookie, ready for a Cookie header. */
  refreshCookie: string;
}

export function extractRefreshCookie(res: Response): string {
  const cookies = res.headers['set-cookie'] as string[] | undefined;
  const cookie = cookies?.find((value) => value.startsWith(`${REFRESH_COOKIE_NAME}=`));
  if (!cookie) {
    throw new Error('Response did not set a refresh cookie');
  }
  return cookie.split(';')[0]!;
}

function toSession(res: Response): Session {
  return { accessToken: res.body.accessToken, refreshCookie: extractRefreshCookie(res) };
}

export async function signUp(app: INestApplication, email: string, password = 'Password123!') {
  const res = await request(app.getHttpServer()).post(`${BASE}/sign-up`).send({ email, password });
  return { res, session: toSession(res) };
}

export async function signIn(app: INestApplication, email: string, password = 'Password123!') {
  const res = await request(app.getHttpServer()).post(`${BASE}/sign-in`).send({ email, password });
  return { res, session: toSession(res) };
}

export function refresh(app: INestApplication, refreshCookie: string) {
  return request(app.getHttpServer()).post(`${BASE}/refresh`).set('Cookie', refreshCookie);
}

export function logout(app: INestApplication, refreshCookie: string) {
  return request(app.getHttpServer()).post(`${BASE}/logout`).set('Cookie', refreshCookie);
}
