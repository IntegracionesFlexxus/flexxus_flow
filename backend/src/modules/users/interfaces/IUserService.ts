/**
 * User Service Interface - Sprint 2
 * Siguiendo lineamientos nivel 2: inversión de dependencias para UserController
 */
import { IAuthenticatedUser } from '../types';

export interface IUserService {
  /**
   * Get users by company with pagination and filters
   */
  getUsersByCompany(companyId: string, options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<{
    users: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      avatar?: string;
      phone?: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
      lastLoginAt?: Date;
    }>;
    total: number;
  }>;
  /**
   * Get user by ID with company validation
   */
  getUserById(userId: string, companyId: string): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatar?: string;
    phone?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
  } | null>;
  /**
   * Create new user
   */
  createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    companies?: string[];
    avatar?: string;
    phone?: string;
    status?: string;
    isActive?: boolean;
    companyId: string;
    createdBy: string;
    password?: string;
  }, authenticatedUser: IAuthenticatedUser): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatar?: string;
    phone?: string;
    isActive: boolean;
    createdAt: Date;
  }>;
  /**
   * Update user
   */
  updateUser(userId: string, companyId: string, data: {
    firstName?: string;
    lastName?: string;
    role?: string;
    companies?: string[];
    avatar?: string;
    phone?: string;
    isActive?: boolean;
  }, authenticatedUser: IAuthenticatedUser): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatar?: string;
    phone?: string;
    isActive: boolean;
    updatedAt: Date;
  } | null>;
  /**
   * Update user profile (self-update)
   */
  updateUserProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    phone?: string;
  }): Promise<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatar?: string;
    phone?: string;
    updatedAt: Date;
  }>;
  /**
   * Delete user (soft delete)
   */
  deleteUser(userId: string, companyId: string): Promise<boolean>;
  /**
   * Check if email exists in company
   */
  emailExistsInCompany(email: string, companyId: string): Promise<boolean>;
  /**
   * Get user activity/sessions
   */
  getUserActivity(userId: string, companyId: string): Promise<{
    lastLoginAt?: Date;
    totalSessions: number;
    activeSessions: number;
    recentSessions?: Array<{
      id: string;
      deviceInfo: any;
      createdAt: Date;
      lastActivityAt: Date;
      isActive: boolean;
    }>;
  } | null>;
  /**
   * Assign user to company with role
   */
  assignUserToCompany(userId: string, companyId: string, role: string, authenticatedUser: IAuthenticatedUser): Promise<boolean>;
  /**
   * Remove user from company
   */
  removeUserFromCompany(userId: string, companyId: string): Promise<boolean>;
  /**
   * Get user companies
   */
  getUserCompanies(userId: string): Promise<Array<{
    id: string;
    name: string;
    role: string;
    isActive: boolean;
  }>>;
}
