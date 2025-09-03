// Auth Service Interface - Sprint 1

import { 
  LoginDto, 
  RegisterDto, 
  AuthResponse,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  JwtPayload,
  SwitchCompanyDto
} from '../types/auth.types';

export interface IAuthService {
  login(dto: LoginDto): Promise<AuthResponse>;
  register(dto: RegisterDto): Promise<AuthResponse>;
  refreshToken(refreshToken: string): Promise<AuthResponse>;
  logout(userId: string): Promise<void>;
  verifyToken(token: string): Promise<JwtPayload>;
  changePassword(userId: string, dto: ChangePasswordDto): Promise<void>;
  forgotPassword(dto: ForgotPasswordDto): Promise<void>;
  resetPassword(dto: ResetPasswordDto): Promise<void>;
  switchCompany(userId: string, dto: SwitchCompanyDto): Promise<AuthResponse>;
  generateToken(payload: JwtPayload): string;
  generateRefreshToken(payload: JwtPayload): string;
}