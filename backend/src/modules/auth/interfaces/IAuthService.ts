/**
 * Auth Service Interface - Sprint 2
 * Siguiendo lineamientos nivel 2: contratos y inversión de dependencias
 * Updated para Controllers API con responsabilidad única
 */
import { 
  LoginDto, 
  RegisterDto, 
  AuthResponse,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  JwtPayload,
  SwitchCompanyDto
} from '@/modules/auth/types/auth.types';
export interface IAuthService {
  // Métodos existentes del Sprint 1 (mantener compatibilidad)
  login(dto: LoginDto, metadata?: { ipAddress?: string; userAgent?: string }): Promise<AuthResponse>;
  register(dto: RegisterDto): Promise<AuthResponse>;
  refreshToken(refreshToken: string): Promise<AuthResponse>;
  logout(userId: string): Promise<void>;
  verifyToken(token: string): Promise<JwtPayload>;
  changePassword(userId: string, dto: ChangePasswordDto): Promise<void>;
  forgotPassword(dto: ForgotPasswordDto, metadata?: { ipAddress?: string; userAgent?: string }): Promise<void>;
  resetPassword(dto: ResetPasswordDto, metadata?: { ipAddress?: string; userAgent?: string }): Promise<void>;
  switchCompany(userId: string, dto: SwitchCompanyDto): Promise<AuthResponse>;
  generateToken(payload: JwtPayload): string;
  generateRefreshToken(payload: JwtPayload): string;
  // Nuevos métodos para Controllers API - Sprint 2
  /**
   * Authenticate user with email and password (controller-friendly)
   */
  authenticate(email: string, password: string): Promise<{
    success: boolean;
    message?: string;
    user?: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      avatar?: string;
    };
    companies?: Array<{
      id: string;
      name: string;
      plan: string;
      role: string;
      features: string[];
    }>;
  }>;
  /**
   * Validate user credentials without full authentication
   */
  validatePassword(email: string, password: string): Promise<boolean>;
  /**
   * Get user companies with roles
   */
  getUserCompanies(userId: string): Promise<Array<{
    id: string;
    name: string;
    plan: string;
    role: string;
    features: string[];
  }>>;
  /**
   * Check if email already exists
   */
  emailExists(email: string): Promise<boolean>;
}
