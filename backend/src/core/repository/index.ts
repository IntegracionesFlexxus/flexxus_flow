/**
 * Repository Pattern Exports
 * Sprint 4 - Índice de exportaciones del patrón Repository
 */
// Query Builder
export { DynamicQueryBuilder, createQueryBuilder } from '@/core/query/QueryBuilder';
export type { 
  WhereOperator, 
  WhereCondition, 
  JoinCondition, 
  SortCondition, 
  QueryOptions 
} from '@/core/query/QueryBuilder';
// Specifications
export { 
  ISpecification,
  BaseSpecification,
  AndSpecification,
  OrSpecification,
  NotSpecification,
  FieldSpecification,
  NullSpecification,
  DateRangeSpecification,
  SpecificationBuilder,
  specification
} from '@/core/specifications/ISpecification';
// Data Mapper
export { 
  DataMapper,
  ProfileBuilder,
  globalMapper,
  map,
  mapArray,
  mapToExisting,
  MapProperty,
  IgnoreProperty,
  Transform
} from '@/core/mapping/DataMapper';
export type { 
  TransformFunction,
  MappingProfile,
  MappingOptions
} from '@/core/mapping/DataMapper';
// User Specifications (Business Logic Examples)
export {
  ActiveUsersSpecification,
  UsersByCompanySpecification,
  VerifiedEmailUsersSpecification,
  RecentLoginSpecification,
  UsersByEmailPatternSpecification,
  InactiveUsersSpecification,
  ActiveCompanyUsersSpecification,
  VerifiedActiveUsersSpecification
} from '@/modules/auth/specifications/UserSpecifications';
// User DTOs (Mapping Examples)
export {
  CreateUserDto,
  UpdateUserDto,
  UserResponseDto,
  UserListItemDto,
  UserProfileDto,
  UserStatsDto,
  PaginatedUsersDto
} from '@/modules/auth/dtos/UserDto';
