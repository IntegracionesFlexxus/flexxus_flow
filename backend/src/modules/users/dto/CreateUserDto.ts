import { IsEmail, IsString, IsOptional, IsEnum, MinLength, MaxLength, IsBoolean, IsObject, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationPreferences {
  @IsBoolean()
  @IsOptional()
  email?: boolean;

  @IsBoolean()
  @IsOptional()
  sms?: boolean;

  @IsBoolean()
  @IsOptional()
  push?: boolean;
}

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName!: string;

  @IsString()
  @MinLength(8)
  @IsOptional()
  password?: string;

  @IsString()
  role!: string; // Can be role name or UUID

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  companies?: string[]; // Array de company IDs

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsEnum(['active', 'inactive', 'suspended'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  twoFactorEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  emailVerified?: boolean;

  @IsObject()
  @ValidateNested()
  @Type(() => NotificationPreferences)
  @IsOptional()
  notifications?: NotificationPreferences;
}