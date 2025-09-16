/**
 * User Adapter
 * Adaptador para desacoplar módulos que necesitan interactuar con usuarios
 * Implementa patrón Adapter y Event-Driven Architecture
 */
import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import { TYPES } from '@/container/types';
import { IUserRepository } from '@/shared/interfaces/repositories/IUserRepository';
export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyId?: string;
  role?: string;
  permissions?: string[];
}
export interface IUserAdapter {
  getUserInfo(userId: string): Promise<UserInfo | null>;
  getUsersByCompany(companyId: string): Promise<UserInfo[]>;
  validateUserAccess(userId: string, resource: string, action: string): Promise<boolean>;
  emitUserEvent(event: string, data: any): void;
  onUserEvent(event: string, handler: (data: any) => void): void;
}
@injectable()
export class UserAdapter implements IUserAdapter {
  private eventEmitter: EventEmitter;
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository
  ) {
    this.eventEmitter = new EventEmitter();
  }
  /**
   * Obtener información básica del usuario sin exponer el repositorio completo
   */
  async getUserInfo(userId: string): Promise<UserInfo | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      companyId: user.defaultCompanyId,
      role: user.currentRole,
      permissions: user.permissions
    };
  }
  /**
   * Obtener usuarios por empresa
   */
  async getUsersByCompany(companyId: string): Promise<UserInfo[]> {
    const users = await this.userRepository.findByCompany(companyId);
    return users.map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      companyId: user.defaultCompanyId,
      role: user.currentRole,
      permissions: user.permissions
    }));
  }
  /**
   * Validar acceso del usuario a un recurso
   */
  async validateUserAccess(userId: string, resource: string, action: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) return false;
    // Implementar lógica de validación según permisos
    if (!user.permissions) return false;
    const requiredPermission = `${resource}:${action}`;
    return user.permissions.includes(requiredPermission) || user.permissions.includes('*');
  }
  /**
   * Emitir evento relacionado con usuarios
   */
  emitUserEvent(event: string, data: any): void {
    this.eventEmitter.emit(event, data);
  }
  /**
   * Suscribirse a eventos de usuarios
   */
  onUserEvent(event: string, handler: (data: any) => void): void {
    this.eventEmitter.on(event, handler);
  }
}
