/**
 * User Validators - Sprint 2
 * Siguiendo lineamientos nivel 2: validación centralizada con class-validator
 */
import { IsEmail, IsString, IsOptional, Length, IsUUID, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
/**
 * User creation validation DTO
 */
export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
  @IsString({ message: 'First name must be a string' })
  @Length(2, 50, { message: 'First name must be between 2 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  firstName: string;
  @IsString({ message: 'Last name must be a string' })
  @Length(2, 50, { message: 'Last name must be between 2 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  lastName: string;
  @IsEnum(['admin', 'manager', 'user', 'viewer'], {
    message: 'Role must be one of: admin, manager, user, viewer'
  })
  role: 'admin' | 'manager' | 'user' | 'viewer';
  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string' })
  avatar?: string;
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Length(10, 15, { message: 'Phone must be between 10 and 15 characters' })
  phone?: string;
  @IsOptional()
  @IsBoolean({ message: 'Active status must be boolean' })
  isActive?: boolean = true;
}
/**
 * User update validation DTO
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @Length(2, 50, { message: 'First name must be between 2 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  firstName?: string;
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @Length(2, 50, { message: 'Last name must be between 2 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  lastName?: string;
  @IsOptional()
  @IsEnum(['admin', 'manager', 'user', 'viewer'], {
    message: 'Role must be one of: admin, manager, user, viewer'
  })
  role?: 'admin' | 'manager' | 'user' | 'viewer';
  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string' })
  avatar?: string;
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Length(10, 15, { message: 'Phone must be between 10 and 15 characters' })
  phone?: string;
  @IsOptional()
  @IsBoolean({ message: 'Active status must be boolean' })
  isActive?: boolean;
}
/**
 * User profile update validation DTO (self-update)
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @Length(2, 50, { message: 'First name must be between 2 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  firstName?: string;
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @Length(2, 50, { message: 'Last name must be between 2 and 50 characters' })
  @Transform(({ value }) => value?.trim())
  lastName?: string;
  @IsOptional()
  @IsString({ message: 'Avatar URL must be a string' })
  avatar?: string;
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Length(10, 15, { message: 'Phone must be between 10 and 15 characters' })
  phone?: string;
}
/**
 * Assign user to company validation DTO
 */
export class AssignUserToCompanyDto {
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId: string;
  @IsUUID(4, { message: 'Company ID must be a valid UUID' })
  companyId: string;
  @IsEnum(['admin', 'manager', 'user', 'viewer'], {
    message: 'Role must be one of: admin, manager, user, viewer'
  })
  role: 'admin' | 'manager' | 'user' | 'viewer';
}
/**
 * Remove user from company validation DTO
 */
export class RemoveUserFromCompanyDto {
  @IsUUID(4, { message: 'User ID must be a valid UUID' })
  userId: string;
  @IsUUID(4, { message: 'Company ID must be a valid UUID' })
  companyId: string;
}
