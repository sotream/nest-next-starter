import { UnsupportedMediaTypeException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

/**
 * This API only reads JSON bodies. Without this check a body of another type is skipped by the parser
 * and then fails validation with a misleading 400; RFC 9110 s15.5.16 asks for 415 instead.
 */
export function requireJsonBody(req: Request, _res: Response, next: NextFunction): void {
  const hasBody = Number(req.headers['content-length']) > 0 || 'transfer-encoding' in req.headers;
  next(
    hasBody && !req.is('application/json')
      ? new UnsupportedMediaTypeException('Send the request body as application/json')
      : undefined,
  );
}
