import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { WebOriginGuard } from './web-origin.guard.js';

function createContext(origin?: string): ExecutionContext {
  const request = { protocol: 'http', headers: { origin, host: 'localhost:4000' } };
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
}

function createGuard(appEnv: 'dev' | 'prod'): WebOriginGuard {
  const values: Record<string, string> = { WEB_ORIGIN: 'http://localhost:3000/', APP_ENV: appEnv };
  return new WebOriginGuard({ get: (key: string) => values[key] } as unknown as ConfigService<
    never,
    true
  >);
}

describe.each(['dev', 'prod'] as const)('WebOriginGuard (%s)', (appEnv) => {
  const guard = createGuard(appEnv);

  it('allows the configured web origin, ignoring a trailing slash in the setting', () => {
    expect(guard.canActivate(createContext('http://localhost:3000'))).toBe(true);
  });

  it('allows requests without an Origin header', () => {
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it.each(['http://evil.localhost:3000', 'http://localhost:3001', 'null'])(
    'rejects origin %s',
    (origin) => {
      expect(() => guard.canActivate(createContext(origin))).toThrow(ForbiddenException);
    },
  );
});

describe('WebOriginGuard and the API own origin (Swagger UI)', () => {
  it('allows it in dev', () => {
    expect(createGuard('dev').canActivate(createContext('http://localhost:4000'))).toBe(true);
  });

  it('rejects it in prod', () => {
    expect(() => createGuard('prod').canActivate(createContext('http://localhost:4000'))).toThrow(
      ForbiddenException,
    );
  });
});
