/**
 * Auth Validators - Sprint 2
 * Siguiendo lineamientos nivel 2: validación centralizada con class-validator
 */
import { IsEmail, IsString, IsOptional, Length, Matches, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
/**
 * Login validation DTO
 */
export class LoginDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
  @IsString({ message: 'Password must be a string' })
  @Length(6, 128, { message: 'Password must be between 6 and 128 characters' })
  password: string;
  @IsOptional()
  @IsUUID(4, { message: 'Company ID must be a valid UUID' })
  companyId?: string;
}
/**
 * Registration validation DTO
 */
export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
  @IsString({ message: 'Password must be a string' })
  @Length(8, 128, { message: 'Password must be between 8 and 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one lowercase letter, one uppercase letter, and one number'
  })
  password: string;
  @IsString({ message: 'First name must be a string' })
  @Length(2, 50, { message: 'First name must be between 2 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  firstName: string;
  @IsString({ message: 'Last name must be a string' })
  @Length(2, 50, { message: 'Last name must be between 2 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  lastName: string;
  @IsString({ message: 'Company name must be a string' })
  @Length(2, 100, { message: 'Company name must be between 2 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  companyName: string;
}
/**
 * Refresh token validation DTO
 */
export class RefreshTokenDto {
  @IsString({ message: 'Refresh token must be a string' })
  refreshToken: string;
}
/**
 * Change password validation DTO
 */
export class ChangePasswordDto {
  @IsString({ message: 'Current password must be a string' })
  currentPassword: string;
  @IsString({ message: 'New password must be a string' })
  @Length(8, 128, { message: 'New password must be between 8 and 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'New password must contain at least one lowercase letter, one uppercase letter, and one number'
  })
  newPassword: string;
}
/**
 * Forgot password validation DTO
 */
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
}
/**
 * Reset password validation DTO
 */
export class ResetPasswordDto {
  @IsString({ message: 'Reset token must be a string' })
  token: string;
  @IsString({ message: 'New password must be a string' })
  @Length(8, 128, { message: 'New password must be between 8 and 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'New password must contain at least one lowercase letter, one uppercase letter, and one number'
  })
  newPassword: string;
}
/**
 * Switch company validation DTO
 */
export class SwitchCompanyDto {
  @IsUUID(4, { message: 'Company ID must be a valid UUID' })
  companyId: string;
}
