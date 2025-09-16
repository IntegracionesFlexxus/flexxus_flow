/**
 * Company Validators - Sprint 2
 * Siguiendo lineamientos nivel 2: validación centralizada con class-validator
 */
import { IsString, IsOptional, Length, IsEnum, IsBoolean, IsArray, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
/**
 * Company creation validation DTO
 */
export class CreateCompanyDto {
  @IsString({ message: 'Company name must be a string' })
  @Length(2, 100, { message: 'Company name must be between 2 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(0, 500, { message: 'Description must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;
  @IsEnum(['free', 'starter', 'professional', 'enterprise'], {
    message: 'Plan must be one of: free, starter, professional, enterprise'
  })
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  @IsOptional()
  @IsString({ message: 'Website must be a string' })
  website?: string;
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Length(10, 15, { message: 'Phone must be between 10 and 15 characters' })
  phone?: string;
  @IsOptional()
  @IsString({ message: 'Address must be a string' })
  @Length(0, 200, { message: 'Address must not exceed 200 characters' })
  address?: string;
  @IsOptional()
  @IsBoolean({ message: 'Active status must be boolean' })
  isActive?: boolean = true;
}
/**
 * Company update validation DTO
 */
export class UpdateCompanyDto {
  @IsOptional()
  @IsString({ message: 'Company name must be a string' })
  @Length(2, 100, { message: 'Company name must be between 2 and 100 characters' })
  @Transform(({ value }) => value?.trim())
  name?: string;
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(0, 500, { message: 'Description must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;
  @IsOptional()
  @IsEnum(['free', 'starter', 'professional', 'enterprise'], {
    message: 'Plan must be one of: free, starter, professional, enterprise'
  })
  plan?: 'free' | 'starter' | 'professional' | 'enterprise';
  @IsOptional()
  @IsString({ message: 'Website must be a string' })
  website?: string;
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @Length(10, 15, { message: 'Phone must be between 10 and 15 characters' })
  phone?: string;
  @IsOptional()
  @IsString({ message: 'Address must be a string' })
  @Length(0, 200, { message: 'Address must not exceed 200 characters' })
  address?: string;
  @IsOptional()
  @IsBoolean({ message: 'Active status must be boolean' })
  isActive?: boolean;
  @IsOptional()
  @IsArray({ message: 'Features must be an array' })
  @IsString({ each: true, message: 'Each feature must be a string' })
  features?: string[];
}
/**
 * Company settings update validation DTO
 */
export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsString({ message: 'Timezone must be a string' })
  timezone?: string;
  @IsOptional()
  @IsString({ message: 'Currency must be a string' })
  @Length(3, 3, { message: 'Currency must be 3 characters (ISO 4217)' })
  currency?: string;
  @IsOptional()
  @IsString({ message: 'Language must be a string' })
  @Length(2, 5, { message: 'Language must be a valid locale code' })
  language?: string;
  @IsOptional()
  @IsString({ message: 'Date format must be a string' })
  dateFormat?: string;
  @IsOptional()
  @IsString({ message: 'Time format must be a string' })
  timeFormat?: string;
  @IsOptional()
  @IsBoolean({ message: 'Email notifications must be boolean' })
  emailNotifications?: boolean;
  @IsOptional()
  @IsBoolean({ message: 'SMS notifications must be boolean' })
  smsNotifications?: boolean;
  @IsOptional()
  @IsBoolean({ message: 'Two factor authentication must be boolean' })
  twoFactorRequired?: boolean;
  @IsOptional()
  @IsBoolean({ message: 'Session timeout enabled must be boolean' })
  sessionTimeoutEnabled?: boolean;
  @IsOptional()
  @IsString({ message: 'Session timeout duration must be a string' })
  sessionTimeoutDuration?: string;
}
/**
 * Company user invitation validation DTO
 */
export class InviteUserDto {
  @IsString({ message: 'Email must be a string' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;
  @IsEnum(['admin', 'manager', 'user', 'viewer'], {
    message: 'Role must be one of: admin, manager, user, viewer'
  })
  role: 'admin' | 'manager' | 'user' | 'viewer';
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
  @IsString({ message: 'Invitation message must be a string' })
  @Length(0, 500, { message: 'Invitation message must not exceed 500 characters' })
  message?: string;
}
/**
 * Company plan upgrade validation DTO
 */
export class UpgradePlanDto {
  @IsEnum(['starter', 'professional', 'enterprise'], {
    message: 'New plan must be one of: starter, professional, enterprise'
  })
  newPlan: 'starter' | 'professional' | 'enterprise';
  @IsOptional()
  @IsString({ message: 'Payment method must be a string' })
  paymentMethod?: string;
  @IsOptional()
  @IsBoolean({ message: 'Annual billing must be boolean' })
  annualBilling?: boolean;
}
/**
 * Company feature toggle validation DTO
 */
export class ToggleFeatureDto {
  @IsString({ message: 'Feature name must be a string' })
  feature: string;
  @IsBoolean({ message: 'Enabled status must be boolean' })
  enabled: boolean;
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  @Length(0, 200, { message: 'Reason must not exceed 200 characters' })
  reason?: string;
}
