import { productionProblems, validateEnv } from './env.validation.js';

const prodEnv = {
  APP_ENV: 'prod',
  JWT_ACCESS_SECRET: 'x'.repeat(48),
  WEB_ORIGIN: 'https://app.example.com',
  DATABASE_URL: 'postgres://svc:s3cret@db:5432/app',
  REDIS_URL: 'redis://:s3cret@redis:6379',
};

describe('validateEnv', () => {
  it('applies dev defaults for everything except APP_ENV', () => {
    const env = validateEnv({ APP_ENV: 'dev' });

    expect(env.PORT).toBe(4000);
    expect(env.APP_ENV).toBe('dev');
  });

  it.each([undefined, '', 'production', 'development', 'staging'])(
    'refuses to start with APP_ENV=%j',
    (value) => {
      expect(() => validateEnv({ APP_ENV: value })).toThrow(/APP_ENV/);
    },
  );

  it('coerces numeric strings from process.env', () => {
    expect(validateEnv({ APP_ENV: 'dev', PORT: '5000' }).PORT).toBe(5000);
  });

  it('lists every invalid variable in one readable error', () => {
    expect(() => validateEnv({ APP_ENV: 'dev', PORT: 'abc', LOG_LEVEL: 'loud' })).toThrow(
      /PORT:[\s\S]*LOG_LEVEL:/,
    );
  });
});

describe('production fail-fast', () => {
  it('accepts a fully configured production environment', () => {
    expect(validateEnv(prodEnv).APP_ENV).toBe('prod');
  });

  it('rejects dev defaults, listing every problem at once', () => {
    expect(() => validateEnv({ APP_ENV: 'prod' })).toThrow(
      /JWT_ACCESS_SECRET[\s\S]*WEB_ORIGIN[\s\S]*DATABASE_URL[\s\S]*REDIS_URL/,
    );
  });

  it.each([
    ['a short secret', { JWT_ACCESS_SECRET: 'short' }, /JWT_ACCESS_SECRET/],
    ['an http web origin', { WEB_ORIGIN: 'http://app.example.com' }, /WEB_ORIGIN/],
    ['database without a password', { DATABASE_URL: 'postgres://svc@db/app' }, /DATABASE_URL/],
    ['redis without a password', { REDIS_URL: 'redis://redis:6379' }, /REDIS_URL/],
  ])('rejects %s', (_label, override, message) => {
    expect(() => validateEnv({ ...prodEnv, ...override })).toThrow(message);
  });

  it('is not enforced in dev', () => {
    expect(productionProblems(validateEnv({ APP_ENV: 'dev' })).length).toBeGreaterThan(0);
    expect(() => validateEnv({ APP_ENV: 'dev' })).not.toThrow();
  });
});

describe('refresh cleanup settings', () => {
  it('defaults to a daily job with retention above the token lifetime', () => {
    const env = validateEnv({ APP_ENV: 'dev' });

    expect(env.REFRESH_CLEANUP_CRON).toBe('0 3 * * *');
    expect(env.REFRESH_REVOKED_RETENTION_DAYS).toBeGreaterThanOrEqual(env.REFRESH_TOKEN_TTL_DAYS);
  });

  it('rejects an invalid cron expression', () => {
    expect(() => validateEnv({ APP_ENV: 'dev', REFRESH_CLEANUP_CRON: 'not a cron' })).toThrow(
      /REFRESH_CLEANUP_CRON/,
    );
  });

  it('rejects retention shorter than the refresh token lifetime', () => {
    expect(() =>
      validateEnv({
        APP_ENV: 'dev',
        REFRESH_TOKEN_TTL_DAYS: '30',
        REFRESH_REVOKED_RETENTION_DAYS: '7',
      }),
    ).toThrow(/REFRESH_REVOKED_RETENTION_DAYS must be at least/);
  });
});
