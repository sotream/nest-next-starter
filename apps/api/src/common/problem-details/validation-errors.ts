import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';

/** One failed rule, located by a JSON Pointer in URI fragment form (RFC 9457 s3 validation example). */
export interface ProblemError {
  pointer: string;
  detail: string;
}

const escapePointer = (name: string): string => name.replaceAll('~', '~0').replaceAll('/', '~1');

function flatten(errors: ValidationError[], parent: string): ProblemError[] {
  return errors.flatMap(({ property, constraints, children }) => {
    const pointer = `${parent}/${escapePointer(property)}`;
    return [
      ...Object.values(constraints ?? {}).map((detail) => ({ pointer, detail })),
      ...flatten(children ?? [], pointer),
    ];
  });
}

/** `ValidationPipe` option: turns class-validator errors into the `errors` extension member. */
export function validationExceptionFactory(errors: ValidationError[]): BadRequestException {
  return new BadRequestException({
    message: 'Request validation failed',
    code: 'VALIDATION_FAILED',
    errors: flatten(errors, '#'),
  });
}
