/**
 * User Repository Interface - Refactored
 * Solo operaciones CRUD básicas de usuarios
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
}
export interface IUserRepositoryBase {
  // ==================== OPERACIONES BÁSICAS CRUD ====================
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserDto): Promise<User>;
  update(id: string, data: UpdateUserDto): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  exists(email: string): Promise<boolean>;
  // ==================== GESTIÓN DE ESTADO ====================
  updateStatus(userId: string, status: 'active' | 'inactive' | 'suspended'): Promise<void>;
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
  }): Promise<number>;
  search(searchTerm: string, limit?: number): Promise<User[]>;
  getRecentlyActive(limit?: number): Promise<User[]>;
  getCreatedBetween(startDate: Date, endDate: Date): Promise<User[]>;
}
