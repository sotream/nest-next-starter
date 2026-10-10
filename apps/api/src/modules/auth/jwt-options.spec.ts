import { JwtService } from '@nestjs/jwt';
import { JWT_AUDIENCE, JWT_ISSUER } from './auth.constants.js';
import { buildJwtOptions } from './jwt-options.js';

const SECRET = 'unit-test-secret-unit-test-secret-1234';
const sign = (options: ConstructorParameters<typeof JwtService>[0]) =>
  new JwtService(options).signAsync({ sub: 'user-1' });

describe('JWT options (RFC 8725)', () => {
  const jwt = new JwtService(buildJwtOptions(SECRET, 900));

  it('signs and verifies an HS256 token with issuer and audience', async () => {
    const token = await jwt.signAsync({ sub: 'user-1' });

    await expect(jwt.verifyAsync(token)).resolves.toMatchObject({
      sub: 'user-1',
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
    });
    expect(JSON.parse(Buffer.from(token.split('.')[0]!, 'base64url').toString())).toMatchObject({
      alg: 'HS256',
    });
  });

  it.each(['HS384', 'HS512'] as const)('rejects a token signed with %s', async (algorithm) => {
    const token = await sign({
      secret: SECRET,
      signOptions: { algorithm, issuer: JWT_ISSUER, audience: JWT_AUDIENCE, expiresIn: 60 },
    });

    await expect(jwt.verifyAsync(token)).rejects.toThrow();
  });

  it('rejects a token from another issuer', async () => {
    const token = await sign({
      secret: SECRET,
      signOptions: { issuer: 'someone-else', audience: JWT_AUDIENCE, expiresIn: 60 },
    });

    await expect(jwt.verifyAsync(token)).rejects.toThrow(/issuer/);
  });

  it('rejects a token for another audience or without one', async () => {
    const other = await sign({
      secret: SECRET,
      signOptions: { issuer: JWT_ISSUER, audience: 'other-service', expiresIn: 60 },
    });
    const none = await sign({ secret: SECRET, signOptions: { issuer: JWT_ISSUER, expiresIn: 60 } });

    await expect(jwt.verifyAsync(other)).rejects.toThrow(/audience/);
    await expect(jwt.verifyAsync(none)).rejects.toThrow(/audience/);
  });

  it('rejects an unsigned token', async () => {
    const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${part({ alg: 'none', typ: 'JWT' })}.${part({ sub: 'user-1', iss: JWT_ISSUER, aud: JWT_AUDIENCE })}.`;

    await expect(jwt.verifyAsync(token)).rejects.toThrow();
  });
});
