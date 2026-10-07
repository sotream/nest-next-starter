import type { IncomingMessage } from 'node:http';
import pino from 'pino';
import { REDACTED_PATHS, resolveRequestId } from './logging.module.js';

const withHeader = (value?: string | string[]) =>
  ({ headers: { 'x-request-id': value } }) as unknown as IncomingMessage;

describe('resolveRequestId', () => {
  it('keeps a plain client id', () => {
    expect(resolveRequestId(withHeader('abc-123_DEF.4'))).toBe('abc-123_DEF.4');
  });

  it.each([undefined, '', 'a'.repeat(65), 'has space', 'line\nbreak', '<script>', ['a', 'b']])(
    'generates a new id for %j',
    (value) => {
      expect(resolveRequestId(withHeader(value))).toMatch(/^[0-9a-f-]{36}$/);
    },
  );
});

describe('REDACTED_PATHS', () => {
  it('masks authorization and cookie headers in request and response logs', () => {
    const lines: string[] = [];
    const logger = pino(
      { redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' } },
      { write: (line: string) => lines.push(line) },
    );

    logger.info({
      req: {
        headers: { authorization: 'Bearer secret-token', cookie: 'starter_rt=secret-cookie' },
      },
      res: { headers: { 'set-cookie': ['starter_rt=secret-cookie; HttpOnly'] } },
    });

    expect(lines[0]).not.toMatch(/secret-token|secret-cookie/);
    expect(lines[0]).toContain('[REDACTED]');
  });
});
