import { validate } from 'class-validator';
import { MaxBytes } from './max-bytes.js';

class Sample {
  @MaxBytes(72)
  value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }
}

describe('MaxBytes', () => {
  it.each([['a'.repeat(72)], ['п'.repeat(36)], ['']])(
    'accepts a value of at most 72 UTF-8 bytes',
    async (value) => {
      expect(await validate(new Sample(value))).toEqual([]);
    },
  );

  it.each([['a'.repeat(73)], ['п'.repeat(37)], ['😀'.repeat(19)]])(
    'rejects a value over 72 bytes even when it has fewer than 72 characters',
    async (value) => {
      const [failure] = await validate(new Sample(value));

      expect(failure?.constraints?.maxBytes).toBe('value must be at most 72 bytes in UTF-8');
    },
  );

  it('rejects a value that is not a string', async () => {
    expect(await validate(new Sample(42))).toHaveLength(1);
  });
});
