import { assertSeedAllowed } from './seed-guard.js';

describe('assertSeedAllowed', () => {
  it('allows dev', () => {
    expect(() => assertSeedAllowed('dev')).not.toThrow();
  });

  it('refuses prod', () => {
    expect(() => assertSeedAllowed('prod')).toThrow(/Refusing to seed/);
  });
});
