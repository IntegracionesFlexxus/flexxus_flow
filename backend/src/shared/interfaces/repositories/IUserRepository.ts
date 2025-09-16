/**
 * User Repository Interface - Refactored
 * Solo operaciones CRUD básicas de usuarios siguiendo SRP
 */
import { User } from '@/shared/interfaces/types/auth.types';
export interface CreateUserDto {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
}
export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatar?: string;
  status?: 'active' | 'inactive' | 'suspended';
  password_hash?: string;
}
export interface IUserRepository {
  // ==================== OPERACIONES BÁSICAS CRUD ====================
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserDto | Partial<User>): Promise<User>;
  update(id: string, data: UpdateUserDto | Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  exists(email: string): Promise<boolean>;
  // ==================== GESTIÓN DE ESTADO ====================
  updateStatus(userId: string, status: 'active' | 'inactive' | 'suspended' | string): Promise<void>;
  // ==================== OPERACIONES DE CONSULTA ====================
  findAll(options?: {
    offset?: number;
    limit?: number;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
  }): Promise<User[]>;
  count(filters?: {
    status?: string;
    emailVerified?: boolean;
    companyId?: string;
    roleId?: string;
  }): Promise<number>;
  search(searchTerm: string, limit?: number): Promise<User[]>;
  getRecentlyActive(limit?: number): Promise<User[]>;
  getCreatedBetween(startDate: Date, endDate: Date): Promise<User[]>;
  // ==================== LEGACY - TO BE REMOVED ====================
  // Estos métodos están temporalmente aquí para compatibilidad
  // Serán eliminados una vez que todos los servicios estén migrados
  updateLastLogin?(id: string): Promise<void>;
  verifyEmail?(id: string): Promise<void>;
  getUserCompanies?(userId: string): Promise<any[]>;
  addToCompany?(userId: string, companyId: string, roleId: string, permissions?: string[]): Promise<void>;
  removeFromCompany?(userId: string, companyId: string): Promise<void>;
  getUserRole?(userId: string, companyId: string): Promise<string | null>;
  findUserCompanyRole?(userId: string, companyId: string): Promise<{ role: string } | null>;
  updateUserRole?(userId: string, companyId: string, newRoleId: string): Promise<void>;
  getUserRoles?(userId: string, companyId?: string): Promise<any[]>;
  invalidateAllUserSessions?(userId: string): Promise<void>;
  findByCompany?(companyId: string, options?: any): Promise<User[]>;
  countByCompany?(companyId: string, options?: any): Promise<number>;
  findByRole?(roleId: string, companyId?: string): Promise<User[]>;
  belongsToCompany?(userId: string, companyId: string): Promise<boolean>;
  findByPasswordResetToken?(token: string): Promise<User | null>;
  updatePasswordResetToken?(userId: string, token: string | null, expiresAt: Date | null): Promise<void>;
}
