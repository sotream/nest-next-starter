import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';
import { validationExceptionFactory } from './validation-errors.js';

const error = (property: string, messages: string[], children: ValidationError[] = []) =>
  ({
    property,
    constraints: Object.fromEntries(messages.map((message, i) => [`rule${i}`, message])),
    children,
  }) as ValidationError;

describe('validationExceptionFactory', () => {
  it('lists every failed rule with a JSON Pointer to the member', () => {
    const exception = validationExceptionFactory([
      error('email', ['email must be an email']),
      error('password', ['password is too short', 'password must be a string']),
    ]);

    expect(exception).toBeInstanceOf(BadRequestException);
    expect(exception.getResponse()).toEqual({
      message: 'Request validation failed',
      code: 'VALIDATION_FAILED',
      errors: [
        { pointer: '#/email', detail: 'email must be an email' },
        { pointer: '#/password', detail: 'password is too short' },
        { pointer: '#/password', detail: 'password must be a string' },
      ],
    });
  });

  it('follows nested members and escapes ~ and / in names', () => {
    const exception = validationExceptionFactory([
      {
        property: 'address',
        children: [error('street', ['street must be a string']), error('a/b~c', ['bad'])],
      } as ValidationError,
    ]);

    expect(exception.getResponse()).toMatchObject({
      errors: [
        { pointer: '#/address/street', detail: 'street must be a string' },
        { pointer: '#/address/a~1b~0c', detail: 'bad' },
      ],
    });
  });
});
