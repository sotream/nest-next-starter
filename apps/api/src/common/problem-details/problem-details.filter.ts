import { STATUS_CODES } from 'node:http';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import type { ProblemError } from './validation-errors.js';

/** RFC 9457 problem details. Only `type: about:blank` is used, so `title` is the HTTP status phrase. */
export interface ProblemDetails {
  type: 'about:blank';
  title: string;
  status: number;
  detail: string;
  /** Stable machine-readable value for clients; the human text in `detail` may change. */
  code: string;
  errors?: ProblemError[];
}

const PROBLEM_JSON = 'application/problem+json';

/** body-parser errors carry a `type`; their own messages quote the payload, so they are not echoed. */
const PARSER_DETAILS: Record<string, string> = {
  'entity.too.large': 'Request body is too large',
  'entity.parse.failed': 'Request body is not valid JSON',
};

const toCode = (title: string): string => title.toUpperCase().replaceAll(/[^A-Z0-9]+/g, '_');

function isClientHttpError(
  error: unknown,
): error is { status: number; type: string; expose?: boolean } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof error.status === 'number' &&
    error.status >= 400 &&
    error.status < 500 &&
    'type' in error &&
    typeof error.type === 'string'
  );
}

/** Nest's throttler prefixes its message with the class name. */
const stripClassName = (message: string): string => message.replace(/^\w+Exception: /, '');

function readMessage(body: object): string | undefined {
  if (!('message' in body)) return undefined;
  const { message } = body;
  if (typeof message === 'string') return stripClassName(message);
  if (Array.isArray(message)) return message.filter((m) => typeof m === 'string').join('; ');
  return undefined;
}

const readString = (body: object, key: string): string | undefined =>
  key in body && typeof (body as Record<string, unknown>)[key] === 'string'
    ? ((body as Record<string, unknown>)[key] as string)
    : undefined;

function readErrors(body: object): ProblemError[] | undefined {
  return 'errors' in body && Array.isArray(body.errors)
    ? (body.errors as ProblemError[])
    : undefined;
}

function problem(
  status: number,
  detail: string,
  extra: Partial<ProblemDetails> = {},
): ProblemDetails {
  const title = STATUS_CODES[status] ?? 'Error';
  return { type: 'about:blank', title, status, detail, code: toCode(title), ...extra };
}

/**
 * Answers every error as `application/problem+json` (RFC 9457) and never leaks internals: unexpected
 * errors become a generic 500 and are logged with their stack instead.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    if (res.headersSent) return;

    if (exception instanceof HttpException) {
      this.fromHttpException(exception, res);
    } else if (isClientHttpError(exception)) {
      const detail = PARSER_DETAILS[exception.type] ?? STATUS_CODES[exception.status] ?? 'Error';
      this.send(res, problem(exception.status, detail));
    } else {
      this.logger.error(
        exception instanceof Error ? exception.message : String(exception),
        exception instanceof Error ? exception.stack : undefined,
      );
      this.send(res, problem(HttpStatus.INTERNAL_SERVER_ERROR, 'Internal server error'));
    }
  }

  private fromHttpException(exception: HttpException, res: Response): void {
    const status = exception.getStatus();
    const body = exception.getResponse();
    if (typeof body === 'string') {
      this.send(res, problem(status, stripClassName(body)));
      return;
    }
    const detail = readMessage(body);
    if (detail === undefined) {
      // Not an error message but a payload of its own, such as the health check report.
      res.status(status).json(body);
      return;
    }
    this.send(
      res,
      problem(status, detail, {
        ...(readString(body, 'code') && { code: readString(body, 'code') }),
        ...(readErrors(body) && { errors: readErrors(body) }),
      }),
    );
  }

  private send(res: Response, body: ProblemDetails): void {
    res.status(body.status).type(PROBLEM_JSON).json(body);
  }
}
