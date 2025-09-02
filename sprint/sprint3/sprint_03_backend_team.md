# Sprint 03 - Backend Team

## Información del Sprint
- **Duración:** Semanas 5-6 (2 semanas)
- **Equipo:** Backend Team (4 desarrolladores)
- **Objetivo:** Implementar gestión completa de usuarios, roles, permisos e invitaciones

## Objetivos Específicos

### Objetivo Principal
Desarrollar APIs completas para gestión de usuarios con RBAC granular, sistema de invitaciones robusto y configuración avanzada de empresas y preferencias de usuario.

### Objetivos Técnicos
1. Implementar APIs de gestión de usuarios y roles RBAC
2. Crear sistema completo de invitaciones con email workflow
3. Desarrollar APIs de configuración de empresa y preferencias
4. Implementar middleware de autorización granular
5. Crear sistema de notificaciones y alertas
6. Establecer APIs de auditoría y reporting

## Tareas Detalladas

### 1. User Management Service

#### 1.1 User Service: modules/auth/services/UserService.ts
```typescript
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IUserRepository } from '../interfaces/IUserRepository';
import { ICompanyRepository } from '../interfaces/ICompanyRepository';
import { PasswordService } from './PasswordService';
import { AuditService } from './AuditService';

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

@injectable()
export class UserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.CompanyRepository) private companyRepository: ICompanyRepository,
    @inject(TYPES.PasswordService) private passwordService: PasswordService,
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async createUser(userData: CreateUserRequest): Promise<UserResponse> {
    try {
      // Validate email uniqueness
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('Email already exists');
      }

      // Hash password
      const passwordHash = await this.passwordService.hashPassword(userData.password);

      // Create user
      const user = await this.userRepository.create({
        ...userData,
        passwordHash,
        status: 'active',
        emailVerified: false
      });

      // Log activity
      await this.auditService.logActivity({
        action: 'user_created',
        entityType: 'user',
        entityId: user.id,
        description: `User created: ${user.email}`,
        metadata: { email: user.email }
      });

      this.logger.info('User created', { userId: user.id, email: user.email });

      return this.mapToResponse(user);
    } catch (error) {
      this.logger.error('Error creating user', { error: error.message, userData });
      throw error;
    }
  }

  async getUserById(userId: string): Promise<UserResponse | null> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return null;
    }

    return this.mapToResponse(user);
  }

  async updateUser(userId: string, updates: UpdateUserRequest, updatedBy: string): Promise<UserResponse> {
    try {
      const user = await this.userRepository.update(userId, updates);
      if (!user) {
        throw new Error('User not found');
      }

      // Log activity
      await this.auditService.logActivity({
        action: 'user_updated',
        entityType: 'user',
        entityId: userId,
        userId: updatedBy,
        description: `User profile updated`,
        metadata: { updates }
      });

      this.logger.info('User updated', { userId, updates, updatedBy });

      return this.mapToResponse(user);
    } catch (error) {
      this.logger.error('Error updating user', { error: error.message, userId, updates });
      throw error;
    }
  }

  async getUserCompanies(userId: string): Promise<UserCompany[]> {
    return await this.userRepository.getUserCompanies(userId);
  }

  async addUserToCompany(
    userId: string, 
    companyId: string, 
    role: string, 
    permissions?: string[],
    addedBy?: string
  ): Promise<void> {
    try {
      // Verify company exists
      const company = await this.companyRepository.findById(companyId);
      if (!company) {
        throw new Error('Company not found');
      }

      // Add user to company
      await this.userRepository.addToCompany(userId, companyId, role, permissions);

      // Log activity
      await this.auditService.logActivity({
        action: 'user_added_to_company',
        entityType: 'user_company',
        entityId: userId,
        userId: addedBy,
        companyId,
        description: `User added to company with role: ${role}`,
        metadata: { userId, companyId, role, permissions }
      });

      this.logger.info('User added to company', { userId, companyId, role, addedBy });
    } catch (error) {
      this.logger.error('Error adding user to company', { 
        error: error.message, 
        userId, 
        companyId, 
        role 
      });
      throw error;
    }
  }

  async removeUserFromCompany(userId: string, companyId: string, removedBy?: string): Promise<void> {
    try {
      await this.userRepository.removeFromCompany(userId, companyId);

      // Log activity
      await this.auditService.logActivity({
        action: 'user_removed_from_company',
        entityType: 'user_company',
        entityId: userId,
        userId: removedBy,
        companyId,
        description: 'User removed from company',
        metadata: { userId, companyId }
      });

      this.logger.info('User removed from company', { userId, companyId, removedBy });
    } catch (error) {
      this.logger.error('Error removing user from company', { 
        error: error.message, 
        userId, 
        companyId 
      });
      throw error;
    }
  }

  async changeUserRole(
    userId: string, 
    companyId: string, 
    newRole: string, 
    changedBy?: string
  ): Promise<void> {
    try {
      const oldRole = await this.userRepository.getUserRole(userId, companyId);
      
      await this.userRepository.updateUserRole(userId, companyId, newRole);

      // Log activity
      await this.auditService.logActivity({
        action: 'user_role_changed',
        entityType: 'user_company',
        entityId: userId,
        userId: changedBy,
        companyId,
        description: `User role changed from ${oldRole} to ${newRole}`,
        metadata: { userId, companyId, oldRole, newRole }
      });

      this.logger.info('User role changed', { userId, companyId, oldRole, newRole, changedBy });
    } catch (error) {
      this.logger.error('Error changing user role', { 
        error: error.message, 
        userId, 
        companyId, 
        newRole 
      });
      throw error;
    }
  }

  async deactivateUser(userId: string, deactivatedBy?: string): Promise<void> {
    try {
      await this.userRepository.updateStatus(userId, 'inactive');

      // Invalidate all user sessions
      await this.userRepository.invalidateAllUserSessions(userId);

      // Log activity
      await this.auditService.logActivity({
        action: 'user_deactivated',
        entityType: 'user',
        entityId: userId,
        userId: deactivatedBy,
        description: 'User account deactivated',
        metadata: { userId }
      });

      this.logger.info('User deactivated', { userId, deactivatedBy });
    } catch (error) {
      this.logger.error('Error deactivating user', { error: error.message, userId });
      throw error;
    }
  }

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
```

### 2. Role and Permission Service

#### 2.1 Permission Service: modules/auth/services/PermissionService.ts
```typescript
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IPermissionRepository } from '../interfaces/IPermissionRepository';
import { CacheService } from '@shared/services/CacheService';

export interface Permission {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  module: string;
  category: string;
  resource: string;
  action: string;
  isDangerous: boolean;
  requiresMfa: boolean;
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  level: number;
  isSystemRole: boolean;
  permissions: Permission[];
}

export interface UserPermissions {
  userId: string;
  companyId: string;
  role: string;
  permissions: string[];
  effectivePermissions: string[];
}

@injectable()
export class PermissionService {
  private readonly CACHE_TTL = 10 * 60; // 10 minutes
  
  constructor(
    @inject(TYPES.PermissionRepository) private permissionRepository: IPermissionRepository,
    @inject(TYPES.CacheService) private cacheService: CacheService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async getUserPermissions(userId: string, companyId: string): Promise<UserPermissions> {
    const cacheKey = `user_permissions:${userId}:${companyId}`;
    
    // Try cache first
    const cached = await this.cacheService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      // Get user's role and permissions
      const userRole = await this.permissionRepository.getUserRole(userId, companyId);
      if (!userRole) {
        throw new Error('User role not found');
      }

      // Get role permissions
      const rolePermissions = await this.permissionRepository.getRolePermissions(userRole.roleId);
      
      // Get user-specific permission overrides
      const userOverrides = await this.permissionRepository.getUserPermissionOverrides(userId, companyId);
      
      // Calculate effective permissions
      const effectivePermissions = this.calculateEffectivePermissions(
        rolePermissions,
        userOverrides
      );

      const result: UserPermissions = {
        userId,
        companyId,
        role: userRole.roleName,
        permissions: rolePermissions.map(p => p.name),
        effectivePermissions: effectivePermissions.map(p => p.name)
      };

      // Cache the result
      await this.cacheService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error('Error getting user permissions', { 
        error: error.message, 
        userId, 
        companyId 
      });
      throw error;
    }
  }

  async hasPermission(
    userId: string, 
    companyId: string, 
    permissionName: string
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId, companyId);
      return userPermissions.effectivePermissions.includes(permissionName);
    } catch (error) {
      this.logger.error('Error checking permission', { 
        error: error.message, 
        userId, 
        companyId, 
        permissionName 
      });
      return false; // Fail closed
    }
  }

  async hasAnyPermission(
    userId: string, 
    companyId: string, 
    permissions: string[]
  ): Promise<boolean> {
    try {
      const userPermissions = await this.getUserPermissions(userId, companyId);
      return permissions.some(p => userPermissions.effectivePermissions.includes(p));
    } catch (error) {
      this.logger.error('Error checking any permission', { 
        error: error.message, 
        userId, 
        companyId, 
        permissions 
      });
      return false; // Fail closed
    }
  }

  async getAllRoles(): Promise<Role[]> {
    const cacheKey = 'all_roles';
    const cached = await this.cacheService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const roles = await this.permissionRepository.getAllRoles();
    await this.cacheService.set(cacheKey, JSON.stringify(roles), this.CACHE_TTL);
    
    return roles;
  }

  async getAllPermissions(): Promise<Permission[]> {
    const cacheKey = 'all_permissions';
    const cached = await this.cacheService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    const permissions = await this.permissionRepository.getAllPermissions();
    await this.cacheService.set(cacheKey, JSON.stringify(permissions), this.CACHE_TTL);
    
    return permissions;
  }

  async invalidateUserPermissions(userId: string, companyId?: string): Promise<void> {
    if (companyId) {
      const cacheKey = `user_permissions:${userId}:${companyId}`;
      await this.cacheService.delete(cacheKey);
    } else {
      // Invalidate all companies for this user (would need pattern matching in cache)
      const pattern = `user_permissions:${userId}:*`;
      await this.cacheService.deletePattern(pattern);
    }

    this.logger.info('User permissions cache invalidated', { userId, companyId });
  }

  private calculateEffectivePermissions(
    rolePermissions: Permission[], 
    userOverrides: any[]
  ): Permission[] {
    const permissionMap = new Map(rolePermissions.map(p => [p.name, p]));
    
    // Apply user overrides
    for (const override of userOverrides) {
      if (override.granted === false) {
        // Permission explicitly denied
        permissionMap.delete(override.permissionName);
      } else if (override.granted === true) {
        // Permission explicitly granted (even if not in role)
        const permission = rolePermissions.find(p => p.name === override.permissionName);
        if (permission) {
          permissionMap.set(override.permissionName, permission);
        }
      }
    }
    
    return Array.from(permissionMap.values());
  }
}
```

### 3. Invitation System

#### 3.1 Invitation Service: modules/auth/services/InvitationService.ts
```typescript
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IInvitationRepository } from '../interfaces/IInvitationRepository';
import { EmailService } from '@shared/services/EmailService';
import { TokenService } from '@shared/services/TokenService';
import { AuditService } from './AuditService';
import crypto from 'crypto';

export interface CreateInvitationRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  roleId: string;
  specificPermissions?: string[];
  welcomeMessage?: string;
  expiryDays?: number;
}

export interface Invitation {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roleName: string;
  status: string;
  expiresAt: Date;
  invitedAt: Date;
  invitedBy: string;
  acceptedAt?: Date;
  companyName: string;
}

@injectable()
export class InvitationService {
  constructor(
    @inject(TYPES.InvitationRepository) private invitationRepository: IInvitationRepository,
    @inject(TYPES.EmailService) private emailService: EmailService,
    @inject(TYPES.TokenService) private tokenService: TokenService,
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async createInvitation(
    companyId: string,
    invitationData: CreateInvitationRequest,
    invitedByUserId: string
  ): Promise<Invitation> {
    try {
      // Check if user already exists with this email
      const existingUser = await this.invitationRepository.findUserByEmail(invitationData.email);
      if (existingUser) {
        // User exists, check if already in company
        const userInCompany = await this.invitationRepository.isUserInCompany(
          existingUser.id, 
          companyId
        );
        if (userInCompany) {
          throw new Error('User already exists in this company');
        }
      }

      // Cancel any pending invitations for this email/company
      await this.cancelPendingInvitations(invitationData.email, companyId, invitedByUserId);

      // Generate invitation token
      const invitationToken = this.generateInvitationToken();
      
      // Calculate expiry date
      const expiryDays = invitationData.expiryDays || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      // Create invitation
      const invitation = await this.invitationRepository.create({
        companyId,
        email: invitationData.email,
        firstName: invitationData.firstName,
        lastName: invitationData.lastName,
        roleId: invitationData.roleId,
        specificPermissions: invitationData.specificPermissions || [],
        welcomeMessage: invitationData.welcomeMessage,
        invitationToken,
        expiresAt,
        invitedByUserId
      });

      // Send invitation email
      await this.sendInvitationEmail(invitation);

      // Log activity
      await this.auditService.logActivity({
        action: 'invitation_sent',
        entityType: 'invitation',
        entityId: invitation.id,
        userId: invitedByUserId,
        companyId,
        description: `Invitation sent to ${invitationData.email}`,
        metadata: { 
          email: invitationData.email, 
          role: invitationData.roleId,
          expiresAt 
        }
      });

      this.logger.info('Invitation created', { 
        invitationId: invitation.id,
        email: invitationData.email,
        companyId,
        invitedBy: invitedByUserId
      });

      return await this.mapToResponse(invitation);
    } catch (error) {
      this.logger.error('Error creating invitation', { 
        error: error.message, 
        companyId, 
        invitationData 
      });
      throw error;
    }
  }

  async acceptInvitation(
    invitationToken: string,
    acceptanceData: {
      password: string;
      firstName?: string;
      lastName?: string;
    }
  ): Promise<{ user: any; company: any }> {
    try {
      // Find invitation by token
      const invitation = await this.invitationRepository.findByToken(invitationToken);
      if (!invitation) {
        throw new Error('Invalid invitation token');
      }

      // Check if expired
      if (invitation.expiresAt < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Check if already accepted
      if (invitation.status !== 'pending') {
        throw new Error('Invitation is no longer pending');
      }

      let user;
      let isNewUser = false;

      // Check if user already exists
      const existingUser = await this.invitationRepository.findUserByEmail(invitation.email);
      if (existingUser) {
        user = existingUser;
        
        // Check if user is already in company
        const userInCompany = await this.invitationRepository.isUserInCompany(
          user.id, 
          invitation.companyId
        );
        if (userInCompany) {
          throw new Error('User already exists in this company');
        }