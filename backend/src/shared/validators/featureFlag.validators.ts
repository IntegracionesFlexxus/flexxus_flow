/**
 * Feature Flag Validators - Sprint 2
 * Siguiendo lineamientos nivel 2: validación centralizada con class-validator
 */
import { IsString, IsOptional, Length, IsBoolean, IsNumber, IsObject, IsArray, IsEnum, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
/**
 * Feature flag creation validation DTO
 */
export class CreateFeatureFlagDto {
  @IsString({ message: 'Feature name must be a string' })
  @Length(2, 100, { message: 'Feature name must be between 2 and 100 characters' })
  @Transform(({ value }) => value?.toLowerCase().replace(/[^a-z0-9_]/g, '_'))
  featureName: string;
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(0, 500, { message: 'Description must not exceed 500 characters' })
  description?: string;
  @IsBoolean({ message: 'Enabled status must be boolean' })
  enabled: boolean;
  @IsOptional()
  @IsObject({ message: 'Config must be an object' })
  config?: Record<string, any>;
  @IsOptional()
  @IsNumber({}, { message: 'Rollout percentage must be a number' })
  @Min(0, { message: 'Rollout percentage must be at least 0' })
  @Max(100, { message: 'Rollout percentage must be at most 100' })
  rolloutPercentage?: number = 100;
  @IsOptional()
  @IsObject({ message: 'Rollout rules must be an object' })
  rolloutRules?: {
    roles?: string[];
    userAttributes?: Record<string, any>;
    allowedIPs?: string[];
  };
  @IsEnum(['development', 'staging', 'production'], {
    message: 'Environment must be one of: development, staging, production'
  })
  environment: 'development' | 'staging' | 'production';
  @IsOptional()
  @IsEnum(['ui', 'api', 'integration', 'analytics', 'security'], {
    message: 'Category must be one of: ui, api, integration, analytics, security'
  })
  category?: 'ui' | 'api' | 'integration' | 'analytics' | 'security' = 'ui';
  @IsOptional()
  @Type(() => Date)
  startsAt?: Date;
  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;
}
/**
 * Feature flag update validation DTO
 */
export class UpdateFeatureFlagDto {
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Length(0, 500, { message: 'Description must not exceed 500 characters' })
  description?: string;
  @IsOptional()
  @IsBoolean({ message: 'Enabled status must be boolean' })
  enabled?: boolean;
  @IsOptional()
  @IsObject({ message: 'Config must be an object' })
  config?: Record<string, any>;
  @IsOptional()
  @IsNumber({}, { message: 'Rollout percentage must be a number' })
  @Min(0, { message: 'Rollout percentage must be at least 0' })
  @Max(100, { message: 'Rollout percentage must be at most 100' })
  rolloutPercentage?: number;
  @IsOptional()
  @IsObject({ message: 'Rollout rules must be an object' })
  rolloutRules?: {
    roles?: string[];
    userAttributes?: Record<string, any>;
    allowedIPs?: string[];
  };
  @IsOptional()
  @IsEnum(['ui', 'api', 'integration', 'analytics', 'security'], {
    message: 'Category must be one of: ui, api, integration, analytics, security'
  })
  category?: 'ui' | 'api' | 'integration' | 'analytics' | 'security';
  @IsOptional()
  @Type(() => Date)
  startsAt?: Date;
  @IsOptional()
  @Type(() => Date)
  expiresAt?: Date;
}
/**
 * Feature flag evaluation DTO
 */
export class EvaluateFeatureFlagDto {
  @IsString({ message: 'Feature name must be a string' })
  featureName: string;
  @IsOptional()
  @IsString({ message: 'User ID must be a string' })
  userId?: string;
  @IsOptional()
  @IsString({ message: 'Company ID must be a string' })
  companyId?: string;
  @IsOptional()
  @IsString({ message: 'User role must be a string' })
  userRole?: string;
  @IsOptional()
  @IsEnum(['development', 'staging', 'production'], {
    message: 'Environment must be one of: development, staging, production'
  })
  environment?: 'development' | 'staging' | 'production' = 'production';
  @IsOptional()
  @IsObject({ message: 'User attributes must be an object' })
  userAttributes?: Record<string, any>;
  @IsOptional()
  @IsString({ message: 'IP address must be a string' })
  ipAddress?: string;
  @IsOptional()
  @IsObject({ message: 'Device info must be an object' })
  deviceInfo?: Record<string, any>;
}
/**
 * Bulk feature flag operations DTO
 */
export class BulkFeatureFlagDto {
  @IsArray({ message: 'Feature names must be an array' })
  @IsString({ each: true, message: 'Each feature name must be a string' })
  featureNames: string[];
  @IsBoolean({ message: 'Enabled status must be boolean' })
  enabled: boolean;
  @IsOptional()
  @IsEnum(['development', 'staging', 'production'], {
    message: 'Environment must be one of: development, staging, production'
  })
  environment?: 'development' | 'staging' | 'production' = 'production';
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  @Length(0, 200, { message: 'Reason must not exceed 200 characters' })
  reason?: string;
}
/**
 * Feature flag clone DTO
 */
export class CloneFeatureFlagDto {
  @IsEnum(['development', 'staging', 'production'], {
    message: 'Source environment must be one of: development, staging, production'
  })
  sourceEnvironment: 'development' | 'staging' | 'production';
  @IsEnum(['development', 'staging', 'production'], {
    message: 'Target environment must be one of: development, staging, production'
  })
  targetEnvironment: 'development' | 'staging' | 'production';
  @IsOptional()
  @IsArray({ message: 'Feature names must be an array' })
  @IsString({ each: true, message: 'Each feature name must be a string' })
  featureNames?: string[];
  @IsOptional()
  @IsBoolean({ message: 'Overwrite existing must be boolean' })
  overwriteExisting?: boolean = false;
}
/**
 * Feature flag analytics query DTO
 */
export class FeatureFlagAnalyticsDto {
  @IsString({ message: 'Feature name must be a string' })
  featureName: string;
  @IsOptional()
  @IsEnum(['development', 'staging', 'production'], {
    message: 'Environment must be one of: development, staging, production'
  })
  environment?: 'development' | 'staging' | 'production' = 'production';
  @IsOptional()
  @Type(() => Date)
  startDate?: Date;
  @IsOptional()
  @Type(() => Date)
  endDate?: Date;
  @IsOptional()
  @IsEnum(['hourly', 'daily', 'weekly', 'monthly'], {
    message: 'Granularity must be one of: hourly, daily, weekly, monthly'
  })
  granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily';
  @IsOptional()
  @IsArray({ message: 'Metrics must be an array' })
  @IsString({ each: true, message: 'Each metric must be a string' })
  @IsEnum(['evaluations', 'enabled_count', 'disabled_count', 'unique_users', 'error_rate'], { 
    each: true, 
    message: 'Each metric must be one of: evaluations, enabled_count, disabled_count, unique_users, error_rate' 
  })
  metrics?: string[] = ['evaluations', 'enabled_count', 'disabled_count'];
}
