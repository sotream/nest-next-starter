import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../../common/enums/role.enum.js';
import { MaxBytes } from '../../../common/validators/max-bytes.js';

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class SignInDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  // Lenient on purpose: it only bounds the work done. bcrypt compares the first 72 bytes either way.
  @ApiProperty({ example: 'User123!local', maxLength: 128 })
  @IsString()
  @MaxLength(128)
  password: string;
}

export class SignUpDto {
  @ApiProperty({ example: 'user@example.com' })
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  // bcrypt only uses the first 72 BYTES (OWASP Password Storage cheat sheet), so characters would
  // undercount for non-ASCII text and a longer password would silently lose its tail.
  @ApiProperty({ minLength: 8, description: 'At least 8 characters, at most 72 bytes in UTF-8' })
  @IsString()
  @MinLength(8)
  @MaxBytes(72)
  password: string;
}

export class UserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: Role }) role: Role;
}

export class AuthResponseDto {
  @ApiProperty({ description: 'Short-lived JWT. Keep in memory; send as Bearer token.' })
  accessToken: string;

  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}
