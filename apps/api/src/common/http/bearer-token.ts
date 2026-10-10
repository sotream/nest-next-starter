/** `Bearer` credentials per RFC 6750 s2.1: a case-insensitive scheme, one or more spaces, a token68. */
const BEARER = /^Bearer +([A-Za-z0-9\-._~+/]+=*)$/i;

export function readBearerToken(authorization: string | undefined): string | undefined {
  return authorization?.match(BEARER)?.[1];
}
