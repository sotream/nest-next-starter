interface Header {
  key: string;
  value: string;
}

/**
 * Content Security Policy for the web app. Next.js injects inline bootstrap scripts, so `script-src`
 * needs `'unsafe-inline'` unless every page is rendered per request with a nonce; that trade-off is kept
 * for a static-friendly starter. `connect-src` allows only this origin and the API. Dev adds what the
 * React dev server needs (eval for debugging, a websocket for hot reload).
 */
export function buildCsp(apiUrl: string, isDev: boolean): string {
  const apiOrigin = new URL(apiUrl).origin;
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}${isDev ? ' ws:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** No HSTS on purpose: it is set where TLS terminates (see the deployment guide). */
export function buildSecurityHeaders(apiUrl: string, isDev: boolean): Header[] {
  return [
    { key: 'Content-Security-Policy', value: buildCsp(apiUrl, isDev) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ];
}
