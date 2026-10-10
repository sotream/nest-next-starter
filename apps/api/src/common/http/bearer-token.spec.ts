import { readBearerToken } from './bearer-token.js';

describe('readBearerToken', () => {
  it.each([
    ['Bearer abc.def-ghi_jkl', 'abc.def-ghi_jkl'],
    ['bearer abc', 'abc'],
    ['BEARER   abc', 'abc'],
  ])('reads the token from %j (scheme is case-insensitive, RFC 9110 s11.1)', (header, token) => {
    expect(readBearerToken(header)).toBe(token);
  });

  it.each([
    undefined,
    '',
    'Bearer',
    'Bearer ',
    'Bearerabc',
    'Basic abc',
    'Bearer a b',
    'Bearer a,b',
  ])('finds no token in %j', (header) => {
    expect(readBearerToken(header)).toBeUndefined();
  });
});
