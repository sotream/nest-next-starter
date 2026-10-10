import { ValidateBy } from 'class-validator';
import type { ValidationOptions } from 'class-validator';

/** Limits a string by its UTF-8 size. Needed for bcrypt, which only reads the first 72 bytes. */
export function MaxBytes(max: number, options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'maxBytes',
      constraints: [max],
      validator: {
        validate: (value: unknown) => typeof value === 'string' && Buffer.byteLength(value) <= max,
        defaultMessage: (args) => `${args?.property} must be at most ${max} bytes in UTF-8`,
      },
    },
    options,
  );
}
