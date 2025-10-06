/**
 * User DTOs with Data Mapper decorators
 * Sprint 4 - DTOs con mapeo automático
 */
import { IsEmail, IsString, IsBoolean, IsOptional, IsUUID, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MapProperty, Transform, IgnoreProperty } from '@/core/mapping/DataMapper';
/**
 * User creation DTO
 */
export class CreateUserDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  @MapProperty('email')
  email: string;
  @ApiProperty({ description: 'User full name' })
  @IsString()
  @MapProperty('name')
  name: string;
  @ApiProperty({ description: 'Password (will be hashed)' })
  @IsString()
  @IgnoreProperty() // Don't map password to entity directly
  password: string;
  @ApiProperty({ description: 'Company ID' })
  @IsUUID()
  @MapProperty('company_id')
  companyId: string;
  @ApiPropertyOptional({ description: 'Initial active state', default: true })
  @IsBoolean()
  @IsOptional()
  @MapProperty('is_active')
  isActive?: boolean = true;
}
/**
 * User update DTO
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User full name' })
  @IsString()
  @IsOptional()
  @MapProperty('name')
  name?: string;
  @ApiPropertyOptional({ description: 'User active state' })
  @IsBoolean()
  @IsOptional()
  @MapProperty('is_active')
  isActive?: boolean;
  @ApiPropertyOptional({ description: 'Email verification status' })
  @IsBoolean()
  @IsOptional()
  @MapProperty('email_verified')
  emailVerified?: boolean;
}
/**
 * User response DTO
 */
export class UserResponseDto {
  @ApiProperty({ description: 'User ID' })
  @MapProperty('id')
  id: string;
  @ApiProperty({ description: 'User email address' })
  @MapProperty('email')
  email: string;
  @ApiProperty({ description: 'User full name' })
  @MapProperty('name')
  name: string;
  @ApiProperty({ description: 'Company ID' })
  @MapProperty('company_id')
  companyId: string;
  @ApiProperty({ description: 'User active state' })
  @MapProperty('is_active')
  isActive: boolean;
  @ApiProperty({ description: 'Email verification status' })
  @MapProperty('email_verified')
  emailVerified: boolean;
  @ApiPropertyOptional({ description: 'Last login timestamp' })
  @MapProperty('last_login')
  @Transform((value: Date | null) => value ? value.toISOString() : null)
  lastLogin?: string;
  @ApiProperty({ description: 'User creation timestamp' })
  @MapProperty('created_at')
  @Transform((value: Date) => value.toISOString())
  createdAt: string;
  @ApiProperty({ description: 'User last update timestamp' })
  @MapProperty('updated_at')
  @Transform((value: Date) => value.toISOString())
  updatedAt: string;
  // Ignore sensitive fields
  @IgnoreProperty()
  password?: never;
  @IgnoreProperty()
  deleted_at?: never;
}
/**
 * User list item DTO (minimal info for lists)
 */
export class UserListItemDto {
  @ApiProperty({ description: 'User ID' })
  @MapProperty('id')
  id: string;
  @ApiProperty({ description: 'User email address' })
  @MapProperty('email')
  email: string;
  @ApiProperty({ description: 'User full name' })
  @MapProperty('name')
  name: string;
  @ApiProperty({ description: 'User active state' })
  @MapProperty('is_active')
  isActive: boolean;
  @ApiProperty({ description: 'Email verification status' })
  @MapProperty('email_verified')
  emailVerified: boolean;
  @ApiPropertyOptional({ description: 'Last login date (ISO string)' })
  @MapProperty('last_login')
  @Transform((value: Date | null) => {
    if (!value) return null;
    return value.toISOString().split('T')[0]; // Return only date part
  })
  lastLogin?: string;
}
/**
 * User profile DTO (for user's own profile)
 */
export class UserProfileDto extends UserResponseDto {
  @ApiPropertyOptional({ description: 'User preferences (JSON)' })
  @MapProperty('preferences')
  @Transform((value: any) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    return value || {};
  })
  preferences?: Record<string, any>;
  @ApiPropertyOptional({ description: 'User settings (JSON)' })
  @MapProperty('settings')
  @Transform((value: any) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    return value || {};
  })
  settings?: Record<string, any>;
}
/**
 * User statistics DTO
 */
export class UserStatsDto {
  @ApiProperty({ description: 'User ID' })
  @MapProperty('user_id')
  userId: string;
  @ApiProperty({ description: 'User name' })
  @MapProperty('user_name')
  userName: string;
  @ApiProperty({ description: 'Login count' })
  @MapProperty('login_count')
  @Transform((value: string | number) => parseInt(String(value), 10))
  loginCount: number;
  @ApiProperty({ description: 'Last login date' })
  @MapProperty('last_login')
  @Transform((value: Date | null) => value ? value.toISOString() : null)
  lastLogin?: string;
  @ApiProperty({ description: 'Session duration in minutes' })
  @MapProperty('avg_session_duration')
  @Transform((value: string | number) => Math.round(parseFloat(String(value))))
  avgSessionDuration: number;
  @ApiProperty({ description: 'Active days count' })
  @MapProperty('active_days')
  @Transform((value: string | number) => parseInt(String(value), 10))
  activeDays: number;
}
/**
 * Paginated users response DTO
 */
export class PaginatedUsersDto {
  @ApiProperty({ type: [UserListItemDto], description: 'List of users' })
  users: UserListItemDto[];
  @ApiProperty({ description: 'Total count of users' })
  total: number;
  @ApiProperty({ description: 'Current page number' })
  page: number;
  @ApiProperty({ description: 'Items per page' })
  limit: number;
  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;
  @ApiProperty({ description: 'Has next page' })
  hasNext: boolean;
  @ApiProperty({ description: 'Has previous page' })
  hasPrev: boolean;
}
