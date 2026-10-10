import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { readBearerToken } from '../http/bearer-token.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { Role } from '../enums/role.enum.js';
import type {
  AuthenticatedRequest,
  AuthenticatedUser,
} from '../interfaces/authenticated-user.interface.js';

const REALM = 'api';

/**
 * RFC 9110 s11.6.1 requires a challenge on every 401. Per RFC 6750 s3 `error` is only added when a
 * token was sent and rejected, not when credentials are missing.
 */
function unauthorized(response: Response, rejectedToken: boolean): UnauthorizedException {
  response.setHeader(
    'WWW-Authenticate',
    rejectedToken ? `Bearer realm="${REALM}", error="invalid_token"` : `Bearer realm="${REALM}"`,
  );
  return new UnauthorizedException();
}

function toAuthenticatedUser(payload: Record<string, unknown>): AuthenticatedUser {
  const { sub, role } = payload;
  if (typeof sub !== 'string' || !Object.values(Role).includes(role as Role)) {
    throw new UnauthorizedException();
  }
  return { id: sub, role: role as Role };
}

/** Global guard: every route requires a valid access token unless marked `@Public()`. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();
    const token = readBearerToken(request.headers.authorization);
    if (!token) {
      throw unauthorized(response, false);
    }
    try {
      request.user = toAuthenticatedUser(
        await this.jwt.verifyAsync<Record<string, unknown>>(token),
      );
    } catch {
      throw unauthorized(response, true);
    }
    return true;
  }
}
