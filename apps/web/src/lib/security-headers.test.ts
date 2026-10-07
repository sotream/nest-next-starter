import { buildCsp, buildSecurityHeaders } from './security-headers';

describe('security headers', () => {
  it('limits connections to this origin and the API, and forbids framing', () => {
    const csp = buildCsp('https://api.example.com/', false);

    expect(csp).toContain("connect-src 'self' https://api.example.com");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });

  it('allows eval and websockets only in dev', () => {
    expect(buildCsp('http://localhost:4000', true)).toMatch(/unsafe-eval[\s\S]*ws:/);
    expect(buildCsp('http://localhost:4000', false)).not.toMatch(/unsafe-eval|ws:/);
  });

  it('sets the basic headers and leaves HSTS to the proxy', () => {
    const keys = buildSecurityHeaders('http://localhost:4000', false).map((h) => h.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        'Content-Security-Policy',
        'X-Content-Type-Options',
        'Referrer-Policy',
      ]),
    );
    expect(keys).not.toContain('Strict-Transport-Security');
  });
});
