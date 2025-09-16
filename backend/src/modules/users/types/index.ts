/**
 * User Types - Sprint 4
 * Type definitions for user-related entities
 */

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
  roleId?: string;
  avatar?: string | null;
  phone?: string | null;
  status?: string;
  isActive: boolean;
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt?: Date;
  lastLoginAt?: Date | null;
}

export interface ICreateUserData {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  avatar?: string;
  phone?: string;
}

export interface IUpdateUserData {
  updated_at: Date;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  phone?: string;
  status?: string;
}

export interface IUserActivity {
  lastLoginAt: Date | null;
  totalSessions: number;
  activeSessions: number;
  recentSessions: Array<{
    id: string;
    deviceInfo: string;
    createdAt: Date;
    lastActivityAt: Date;
    isActive: boolean;
  }>;
}

export interface IUserCompany {
  id: string;
  name: string;
  role: string;
  isActive: boolean;
}

export interface IDatabaseUser {
  id: string;
  email: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string | null;
  phone?: string | null;
  status: string;
  email_verified_at?: Date | null;
  last_login_at?: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}

export interface IUserQueryResult {
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

export interface ICompanyQueryResult {
  company_id: string;
  company_name: string;
  role: string;
  status: string;
}

export interface ISessionInfo {
  id: string;
  deviceInfo: string;
  createdAt: Date;
  lastActivityAt: Date;
  active: boolean;
  companyId?: string;
}