import type { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';
import { REFRESH_COOKIE_NAME } from './auth.constants.js';

const result = {
  user: { id: '1', email: 'a@b.c', role: 'USER' },
  accessToken: 'access',
  refreshToken: 'refresh',
};

async function signInCookieOptions(appEnv: 'dev' | 'prod') {
  const cookie = vi.fn();
  const controller = new AuthController(
    { signIn: () => Promise.resolve(result) } as unknown as AuthService,
    { get: (key: string) => (key === 'APP_ENV' ? appEnv : 7) } as unknown as ConfigService<
      never,
      true
    >,
  );
  await controller.signIn({ email: 'a@b.c', password: 'x' }, { cookie } as unknown as Response);
  return cookie.mock.calls[0]?.[2] as Record<string, unknown>;
}

describe('refresh cookie', () => {
  it('is Secure in prod only', async () => {
    expect(await signInCookieOptions('prod')).toMatchObject({ secure: true });
    expect(await signInCookieOptions('dev')).toMatchObject({ secure: false });
  });

  it('is httpOnly, SameSite=Lax and host-only (no Domain)', async () => {
    const options = await signInCookieOptions('prod');

    expect(options).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/api/v1/auth' });
    expect(options).not.toHaveProperty('domain');
    expect(REFRESH_COOKIE_NAME).toBe('starter_rt');
  });
});
