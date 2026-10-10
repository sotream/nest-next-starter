import {
  BadRequestException,
  ConflictException,
  HttpException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { ProblemDetailsFilter } from './problem-details.filter.js';

function run(exception: unknown, headersSent = false) {
  const res = {
    headersSent,
    status: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  // Only the three members the filter reads are provided; the rest of ArgumentsHost is irrelevant here.
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => res }),
  } as unknown as ArgumentsHost;
  new ProblemDetailsFilter().catch(exception, host);
  return res;
}

describe('ProblemDetailsFilter', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('answers HTTP exceptions as application/problem+json', () => {
    const res = run(new NotFoundException('Vehicle not found'));

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.type).toHaveBeenCalledWith('application/problem+json');
    expect(res.json).toHaveBeenCalledWith({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'Vehicle not found',
      code: 'NOT_FOUND',
    });
  });

  it('derives a stable code from the status phrase', () => {
    const res = run(new ConflictException('Email is already registered'));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ status: 409, code: 'CONFLICT', title: 'Conflict' }),
    );
  });

  it('keeps the code and the errors list of a validation exception', () => {
    const errors = [{ pointer: '#/email', detail: 'email must be an email' }];
    const res = run(
      new BadRequestException({
        message: 'Request validation failed',
        code: 'VALIDATION_FAILED',
        errors,
      }),
    );

    expect(res.json).toHaveBeenCalledWith({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'Request validation failed',
      code: 'VALIDATION_FAILED',
      errors,
    });
  });

  it('hides the message of an unexpected error and logs it', () => {
    const res = run(new Error('password for db user app is hunter2'));

    expect(res.status).toHaveBeenCalledWith(500);
    const [body] = res.json.mock.calls[0] as [Record<string, unknown>];
    expect(body).toMatchObject({
      status: 500,
      detail: 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    });
    expect(JSON.stringify(body)).not.toContain('hunter2');
    expect(Logger.prototype.error).toHaveBeenCalled();
  });

  it.each([
    [413, 'entity.too.large', 'Request body is too large'],
    [400, 'entity.parse.failed', 'Request body is not valid JSON'],
  ])(
    'maps the body parser error %i %s without echoing parser internals',
    (status, type, detail) => {
      const res = run(
        Object.assign(new Error('Unexpected token } in JSON at 1'), { status, type, expose: true }),
      );

      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ status, detail }));
    },
  );

  it('does not show the class name of the throttler exception', () => {
    const res = run(new HttpException('ThrottlerException: Too Many Requests', 429));

    const [body] = res.json.mock.calls[0] as [{ detail: string; code: string }];
    expect(body.code).toBe('TOO_MANY_REQUESTS');
    expect(body.detail).not.toContain('ThrottlerException');
  });

  it('passes through a body that is not a message, such as the health check report', () => {
    const report = { status: 'error', error: { redis: { status: 'down' } } };
    const res = run(new ServiceUnavailableException(report));

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(report);
    expect(res.type).not.toHaveBeenCalled();
  });

  it('does nothing when the response has already started', () => {
    const res = run(new NotFoundException(), true);

    expect(res.json).not.toHaveBeenCalled();
  });
});
