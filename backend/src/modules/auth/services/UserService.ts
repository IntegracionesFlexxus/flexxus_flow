/**
 * User Management Service
 * Sprint 3 - Backend Team
 * Implementación siguiendo lineamientos Nivel 2: SOLID, Clean Code, Inversión de Dependencias
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IUserRepository } from '@/shared/interfaces/repositories/IUserRepository';
import { ICompanyRepository } from '@/shared/interfaces/repositories/ICompanyRepository';
import { PasswordService } from '@/modules/auth/services/PasswordService';
import { AuditService } from '@/shared/services/audit/AuditService';

// DTOs siguiendo principio de responsabilidad única
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  timezone?: string;
  language?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  avatar?: string;
  timezone?: string;
  language?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  timezone: string;
  language: string;
  status: string;
  emailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  companies?: UserCompany[];
}

export interface UserCompany {
  id: string;
  name: string;
  role: string;
  permissions?: string[];
  isDefault: boolean;
  status: string;
}

/**
 * UserService implementa gestión completa de usuarios
 * Principios SOLID aplicados:
 * - S: Responsabilidad única para gestión de usuarios
 * - O: Abierto para extensión (nuevos métodos) cerrado para modificación
 * - L: Sustituible por cualquier implementación que respete la interfaz
 * - I: Segregación de interfaces (usa interfaces específicas)
 * - D: Inversión de dependencias (inyección de dependencias)
 */
@injectable()
export class UserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.CompanyRepository) private companyRepository: ICompanyRepository,
    @inject(TYPES.PasswordService) private passwordService: PasswordService,
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Crear nuevo usuario con validaciones y auditoría
   * Clean Code: función con responsabilidad única y nombre descriptivo
   */
  async createUser(userData: CreateUserRequest): Promise<UserResponse> {
    try {
      // Validar unicidad del email
      await this.validateEmailUniqueness(userData.email);

      // Hash de contraseña usando servicio especializado
      const passwordHash = await this.passwordService.hashPassword(userData.password);

      // Crear usuario con valores por defecto
      const user = await this.userRepository.create({
        ...userData,
        passwordHash,
        status: 'active',
        emailVerified: false,
        timezone: userData.timezone || 'America/Argentina/Buenos_Aires',
        language: userData.language || 'es'
      });

      // Auditoría automática
      await this.auditService.logActivity({
        action: 'user_created',
        entityType: 'user',
        entityId: user.id,
        description: `Usuario creado: ${user.email}`,
        metadata: { email: user.email }
      });

      this.logger.info('Usuario creado exitosamente', { 
        userId: user.id, 
        email: user.email 
      });

      return this.mapToResponse(user);
    } catch (error) {
      this.logger.error('Error al crear usuario', { 
        error: error.message, 
        userData: { ...userData, password: '[REDACTED]' }
      });
      throw error;
    }
  }

  /**
   * Obtener usuario por ID
   */
  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    return this.mapToResponse(user);
  }

  /**
   * Actualizar información de usuario
   */
  async updateUser(
    userId: string, 
    updates: UpdateUserRequest, 
    updatedBy: string
  ): Promise<UserResponse> {
    try {
      const user = await this.userRepository.update(userId, updates);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Auditoría del cambio
      await this.auditService.logActivity({
        action: 'user_updated',
        entityType: 'user',
        entityId: userId,
        userId: updatedBy,
        description: 'Perfil de usuario actualizado',
        metadata: { updates }
      });

      this.logger.info('Usuario actualizado', { 
        userId, 
        updates, 
        updatedBy 
      });

      return this.mapToResponse(user);
    } catch (error) {
      this.logger.error('Error al actualizar usuario', { 
        error: error.message, 
        userId, 
        updates 
      });
      throw error;
    }
  }

  /**
   * Obtener empresas del usuario
   */
  async getUserCompanies(userId: string): Promise<UserCompany[]> {
    return await this.userRepository.getUserCompanies(userId);
  }

  /**
   * Agregar usuario a empresa con rol específico
   */
  async addUserToCompany(
    userId: string,
    companyId: string,
    roleId: string,
    permissions?: string[],
    addedBy?: string
  ): Promise<void> {
    try {
      // Verificar que la empresa existe
      const company = await this.companyRepository.findById(companyId);
      if (!company) {
        throw new Error('Empresa no encontrada');
      }

      // Agregar usuario a empresa
      await this.userRepository.addToCompany(userId, companyId, roleId, permissions);

      // Auditoría
      await this.auditService.logActivity({
        action: 'user_added_to_company',
        entityType: 'user_company',
        entityId: userId,
        userId: addedBy,
        companyId,
        description: `Usuario agregado a empresa con rol: ${roleId}`,
        metadata: { userId, companyId, roleId, permissions }
      });

      this.logger.info('Usuario agregado a empresa', { 
        userId, 
        companyId, 
        roleId, 
        addedBy 
      });
    } catch (error) {
      this.logger.error('Error al agregar usuario a empresa', {
        error: error.message,
        userId,
        companyId,
        roleId
      });
      throw error;
    }
  }

  /**
   * Remover usuario de empresa
   */
  async removeUserFromCompany(
    userId: string,
    companyId: string,
    removedBy?: string
  ): Promise<void> {
    try {
      await this.userRepository.removeFromCompany(userId, companyId);

      // Auditoría
      await this.auditService.logActivity({
        action: 'user_removed_from_company',
        entityType: 'user_company',
        entityId: userId,
        userId: removedBy,
        companyId,
        description: 'Usuario removido de empresa',
        metadata: { userId, companyId }
      });

      this.logger.info('Usuario removido de empresa', { 
        userId, 
        companyId, 
        removedBy 
      });
    } catch (error) {
      this.logger.error('Error al remover usuario de empresa', {
        error: error.message,
        userId,
        companyId
      });
      throw error;
    }
  }

  /**
   * Cambiar rol de usuario en empresa
   */
  async changeUserRole(
    userId: string,
    companyId: string,
    newRoleId: string,
    changedBy?: string
  ): Promise<void> {
    try {
      const oldRole = await this.userRepository.getUserRole(userId, companyId);

      await this.userRepository.updateUserRole(userId, companyId, newRoleId);

      // Auditoría del cambio de rol
      await this.auditService.logActivity({
        action: 'user_role_changed',
        entityType: 'user_company',
        entityId: userId,
        userId: changedBy,
        companyId,
        description: `Rol de usuario cambiado de ${oldRole} a ${newRoleId}`,
        metadata: { userId, companyId, oldRole, newRole: newRoleId }
      });

      this.logger.info('Rol de usuario cambiado', {
        userId,
        companyId,
        oldRole,
        newRole: newRoleId,
        changedBy
      });
    } catch (error) {
      this.logger.error('Error al cambiar rol de usuario', {
        error: error.message,
        userId,
        companyId,
        newRole: newRoleId
      });
      throw error;
    }
  }

  /**
   * Desactivar usuario (soft delete)
   */
  async deactivateUser(userId: string, deactivatedBy?: string): Promise<void> {
    try {
      await this.userRepository.updateStatus(userId, 'inactive');

      // Invalidar todas las sesiones del usuario
      await this.sessionRepository.invalidateAllUserSessions(userId);

      // Auditoría
      await this.auditService.logActivity({
        action: 'user_deactivated',
        entityType: 'user',
        entityId: userId,
        userId: deactivatedBy,
        description: 'Cuenta de usuario desactivada',
        metadata: { userId }
      });

      this.logger.info('Usuario desactivado', { userId, deactivatedBy });
    } catch (error) {
      this.logger.error('Error al desactivar usuario', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  // Métodos privados para mantener Clean Code

  /**
   * Validar que el email sea único
   * Principio de responsabilidad única
   */
  private async validateEmailUniqueness(email: string): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new Error('El email ya está en uso');
    }
  }

  /**
   * Obtener usuario por email
   */
  async getUserByEmail(email: string): Promise<UserResponse | null> {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      return null;
    }
    return this.mapToResponse(user);
  }

  /**
   * Eliminar usuario (soft delete)
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      const result = await this.userRepository.delete(userId);
      
      if (result) {
        await this.auditService.logActivity({
          action: 'user_deleted',
          entityType: 'user',
          entityId: userId,
          description: 'Usuario eliminado'
        });
        
        this.logger.info('Usuario eliminado', { userId });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Error al eliminar usuario', { 
        error: error.message, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Obtener todos los usuarios con paginación
   */
  async getAllUsers(limit: number = 10, offset: number = 0): Promise<any[]> {
    return await this.userRepository.findAll({ limit, offset });
  }

  /**
   * Verificar email del usuario
   */
  async verifyUserEmail(userId: string): Promise<void> {
    try {
      await this.userRepository.update(userId, {
        emailVerifiedAt: new Date(),
        status: 'active'
      });
      
      await this.auditService.logActivity({
        action: 'email_verified',
        entityType: 'user',
        entityId: userId,
        description: 'Email verificado'
      });
      
      this.logger.info('Email verificado', { userId });
    } catch (error) {
      this.logger.error('Error al verificar email', { 
        error: error.message, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Actualizar último login del usuario
   */
  async updateUserLastLogin(userId: string): Promise<void> {
    try {
      await this.userRepository.update(userId, {
        lastLoginAt: new Date()
      });
      
      this.logger.info('Último login actualizado', { userId });
    } catch (error) {
      this.logger.error('Error al actualizar último login', { 
        error: error.message, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Cambiar contraseña del usuario
   */
  async changePassword(
    userId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new Error('Usuario no encontrado');
      }
      
      // Verificar contraseña actual
      const isValid = await this.passwordService.verifyPassword(
        currentPassword,
        user.passwordHash
      );
      
      if (!isValid) {
        throw new Error('Contraseña actual incorrecta');
      }
      
      // Hash de nueva contraseña
      const newPasswordHash = await this.passwordService.hashPassword(newPassword);
      
      // Actualizar contraseña
      await this.userRepository.update(userId, {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date()
      });
      
      await this.auditService.logActivity({
        action: 'password_changed',
        entityType: 'user',
        entityId: userId,
        description: 'Contraseña cambiada'
      });
      
      this.logger.info('Contraseña cambiada', { userId });
    } catch (error) {
      this.logger.error('Error al cambiar contraseña', { 
        error: error.message, 
        userId 
      });
      throw error;
    }
  }

  /**
   * Validar contraseña
   */
  async validatePassword(password: string, hash: string): Promise<boolean> {
    return await this.passwordService.verifyPassword(password, hash);
  }

  /**
   * Hash de contraseña
   */
  async hashPassword(password: string): Promise<string> {
    return await this.passwordService.hashPassword(password);
  }

  /**
   * Mapear entidad de dominio a DTO de respuesta
   * Patrón Adapter para transformación de datos
   */
  private mapToResponse(user: any): UserResponse {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      timezone: user.timezone || 'America/Argentina/Buenos_Aires',
      language: user.language || 'es',
      status: user.status,
      emailVerified: !!user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      companies: user.companies
    };
  }
}
