import { ForbiddenException, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { EnvironmentVariables } from '../../infrastructure/config/env.validation.js';

/**
 * Guards cookie-authenticated routes. SameSite=Lax does not stop requests from a sibling subdomain
 * (same-site), so a browser request must also come from the configured web origin. Requests without an
 * `Origin` header (curl, server-to-server) are not browser cross-site requests and pass. In dev the API's
 * own origin is allowed as well, so Swagger UI (served by the API) can call these routes.
 */
@Injectable()
export class WebOriginGuard implements CanActivate {
  private readonly allowedOrigin: string;
  private readonly allowSelfOrigin: boolean;

  constructor(config: ConfigService<EnvironmentVariables, true>) {
    this.allowedOrigin = new URL(config.get('WEB_ORIGIN', { infer: true })).origin;
    this.allowSelfOrigin = config.get('APP_ENV', { infer: true }) === 'dev';
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const { origin } = req.headers;
    const isSelf = this.allowSelfOrigin && origin === `${req.protocol}://${req.headers.host}`;
    if (origin !== undefined && origin !== this.allowedOrigin && !isSelf) {
      throw new ForbiddenException('Origin not allowed');
    }
    return true;
  }
}
