// Auth Module Types - Sprint 1
// Tipos básicos para autenticación y autorización
export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  timezone?: string;
  language?: string;
  status: 'active' | 'inactive' | 'suspended';
  email_verified_at?: Date;
  last_login_at?: Date;
  password_changed_at?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}
export interface Company {
  id: string;
  name: string;
  legal_name?: string;
  tax_id?: string;
  plan: 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled';
  settings?: Record<string, any>;
  billing_email?: string;
  billing_address?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}
export interface UserCompany {
  id: string;
  user_id: string;
  company_id: string;
  role: 'admin' | 'manager' | 'sales_rep' | 'agent' | 'viewer';
  permissions?: Record<string, any>;
  is_default: boolean;
  status: 'active' | 'suspended' | 'invited';
  invited_by_user_id?: string;
  invitation_accepted_at?: Date;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date | null;
}
export interface LoginDto {
  email: string;
  password: string;
  company_id?: string; // Opcional, para login directo a una empresa
}
export interface RegisterDto {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  company_name?: string; // Para crear nueva empresa
  company_id?: string; // Para unirse a empresa existente
  invitation_code?: string; // Código de invitación
}
export interface AuthResponse {
  success: boolean;
  user: Partial<User>;
  company?: Partial<Company>;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  availableCompanies?: any[];
  permissions?: string[];
  sessionId?: string;
}
export interface JwtPayload {
  userId: string;
  email: string;
  companyId: string;
  role: string;
  iat?: number;
  exp?: number;
}
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
export interface ForgotPasswordDto {
  email: string;
}
export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}
export interface SwitchCompanyDto {
  companyId: string;
}
