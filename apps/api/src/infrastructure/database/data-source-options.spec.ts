import { buildBaseOptions } from './data-source-options.js';

describe('buildBaseOptions', () => {
  it('never syncs the schema and never runs migrations on startup', () => {
    const options = buildBaseOptions('postgres://u:p@db:5432/app');

    expect(options.synchronize).toBe(false);
    expect(options.migrationsRun).toBeUndefined();
  });
});
