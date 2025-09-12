// Service interfaces following Single Responsibility Principle (SRP)
import { Request, Response, NextFunction } from 'express';
// Base service interface
export interface IService {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}
// Logger Service
export interface ILoggerService extends IService {
  info(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  http(message: string, meta?: any): void;
}
// Cache Service
export interface ICacheService extends IService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  flush(): Promise<void>;
  exists(key: string): Promise<boolean>;
  getTTL(key: string): Promise<number>;
}
// Event Bus Service
export interface IEventBusService extends IService {
  emit(event: string, data: any): void;
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
  once(event: string, handler: Function): void;
  removeAllListeners(event?: string): void;
}
// Validator Service
export interface IValidatorService {
  isEmail(email: string): boolean;
  isPhone(phone: string): boolean;
  isUUID(uuid: string): boolean;
  required<T>(value: T, fieldName: string): T;
  validateSchema(data: any, schema: any): { isValid: boolean; errors?: string[] };
}
// Auth Service
export interface IAuthService extends IService {
  login(email: string, password: string): Promise<IAuthResult>;
  register(userData: IUserRegistration): Promise<IUser>;
  logout(userId: string): Promise<void>;
  refreshToken(refreshToken: string): Promise<IAuthResult>;
  validateToken(token: string): Promise<ITokenPayload>;
  hashPassword(password: string): Promise<string>;
  comparePassword(password: string, hash: string): Promise<boolean>;
}
// User Service
export interface IUserService extends IService {
  findById(id: string): Promise<IUser | null>;
  findByEmail(email: string): Promise<IUser | null>;
  create(userData: IUserCreation): Promise<IUser>;
  update(id: string, userData: Partial<IUser>): Promise<IUser>;
  delete(id: string): Promise<boolean>;
  list(filters: IUserFilters, pagination: IPagination): Promise<IPaginatedResult<IUser>>;
}
// Company Service
export interface ICompanyService extends IService {
  findById(id: string): Promise<ICompany | null>;
  create(companyData: ICompanyCreation): Promise<ICompany>;
  update(id: string, companyData: Partial<ICompany>): Promise<ICompany>;
  delete(id: string): Promise<boolean>;
  list(filters: ICompanyFilters, pagination: IPagination): Promise<IPaginatedResult<ICompany>>;
  addUser(companyId: string, userId: string, role: string): Promise<void>;
  removeUser(companyId: string, userId: string): Promise<void>;
}
// Health Service
export interface IHealthService extends IService {
  checkLiveness(): Promise<IHealthStatus>;
  checkReadiness(): Promise<IHealthStatus>;
  checkDatabase(name: string): Promise<IHealthStatus>;
  checkService(name: string, url: string): Promise<IHealthStatus>;
  getMetrics(): Promise<IHealthMetrics>;
  getHistory(limit?: number): Promise<IHealthStatus[]>;
}
// Error Handler Service
export interface IErrorHandlerService {
  handleError(error: Error, req?: Request, res?: Response): void;
  handleAsync(fn: Function): Function;
  isOperationalError(error: Error): boolean;
  logError(error: Error, context?: any): void;
}
// DTOs and supporting interfaces
export interface IUser {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface IUserRegistration {
  email: string;
  password: string;
  name: string;
  role?: string;
}
export interface IUserCreation extends IUserRegistration {
  companyId?: string;
}
export interface IUserFilters {
  role?: string;
  isActive?: boolean;
  companyId?: string;
  search?: string;
}
export interface ICompany {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export interface ICompanyCreation {
  name: string;
  description?: string;
  ownerId: string;
}
export interface ICompanyFilters {
  isActive?: boolean;
  search?: string;
}
export interface IAuthResult {
  user: IUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
export interface ITokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}
export interface IPagination {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
export interface IHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  timestamp: Date;
  responseTime?: number;
  details?: any;
}
export interface IHealthMetrics {
  uptime: number;
  totalChecks: number;
  failedChecks: number;
  availability: number;
  avgResponseTime: number;
}
