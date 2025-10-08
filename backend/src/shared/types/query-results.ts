/**
 * Query Result Types
 * Tipos para resultados de queries SQL
 * Refactor TypeScript Strict Types - Phase 1
 */

/**
 * Resultado de query de roles
 */
export interface RoleQueryResult {
  id: string;
  name: string;
  code: string;
  description?: string;
  company_id?: string;
  is_system_role: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Resultado de query de user_companies
 */
export interface UserCompanyQueryResult {
  user_id: string;
  company_id: string;
  role_id: string;
  role: string;
  is_default: boolean;
  status: string;
  permissions?: string[];
  created_at: Date;
  updated_at: Date;
}

/**
 * Resultado de query de companies con rol del usuario
 */
export interface CompanyWithRoleQueryResult {
  company_id: string;
  name: string;
  role: string;
  role_id: string;
  is_default: boolean;
  status: string;
  joined_at: Date;
}

/**
 * Resultado de query de usuarios en una empresa
 */
export interface UserInCompanyQueryResult {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar?: string;
  status: string;
  email_verified_at?: Date;
  role: string;
  role_id: string;
  joined_at: Date;
  last_active_at?: Date;
}

/**
 * Resultado de query de conteo
 */
export interface CountQueryResult {
  count: string;
}

/**
 * Resultado de query simple de existencia
 */
export interface ExistsQueryResult {
  exists: boolean;
}
