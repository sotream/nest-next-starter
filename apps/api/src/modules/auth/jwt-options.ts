import type { JwtModuleOptions } from '@nestjs/jwt';
import { JWT_AUDIENCE, JWT_ISSUER } from './auth.constants.js';

/**
 * Signing and verification are pinned to HS256 with a fixed issuer and audience (RFC 8725 s3.1, s3.8,
 * s3.9). Without `algorithms`, `jsonwebtoken` would also accept HS384 and HS512.
 */
export function buildJwtOptions(secret: string, expiresInSeconds: number): JwtModuleOptions {
  return {
    secret,
    signOptions: {
      algorithm: 'HS256',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      expiresIn: expiresInSeconds,
    },
    verifyOptions: { algorithms: ['HS256'], issuer: JWT_ISSUER, audience: JWT_AUDIENCE },
  };
}
