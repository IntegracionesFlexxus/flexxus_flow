/**
 * User Service Implementation - Sprint 2
 * Complete user management service following Level 2 guidelines
 */
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IUserService } from '@/modules/users/interfaces/IUserService';
import { IUserRepository } from '@/shared/interfaces/repositories/IUserRepository';
import { IUserCompanyRepository } from '@/modules/companies/interfaces/IUserCompanyRepository';
import { ISessionRepository } from '@/modules/auth/interfaces/ISessionRepository';
import { PasswordService } from '@/modules/auth/services/PasswordService';
import { v4 as uuidv4 } from 'uuid';
import { IUserInCompany } from '@/modules/companies/repositories/UserCompanyRepository';
import {
  IUser,
  ICreateUserData,
  IUpdateUserData,
  IUserActivity,
  IUserCompany,
  IDatabaseUser,
  ISessionInfo
} from '@/modules/users/types';
@injectable()
export class UserService implements IUserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.UserCompanyRepository) private userCompanyRepository: IUserCompanyRepository,
    @inject(TYPES.SessionRepository) private sessionRepository: ISessionRepository,
    @inject(TYPES.PasswordService) private passwordService: PasswordService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  async getAllUsers(options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    status?: string;
  }): Promise<{
    users: IUser[];
    total: number;
  }> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const offset = (page - 1) * limit;

      this.logger.info('[UserService.getAllUsers] SuperAdmin fetching all users', {
        page,
        limit,
        offset,
        search: options?.search,
        role: options?.role,
        status: options?.status
      });

      // Obtener todos los usuarios del sistema con paginación
      const users = await this.userRepository.findAll({
        offset,
        limit,
        orderBy: 'created_at',
        orderDirection: 'DESC'
      });

      // Obtener el total sin paginación para los filtros aplicados
      const total = await this.userRepository.count({
        status: options?.status || undefined
      });

      // Mapear a la estructura esperada por el frontend
      const mappedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        role: 'system_user', // Para usuarios globales, usar un rol genérico
        avatar: user.avatar_url || null,
        phone: null, // No existe en la tabla users básica
        isActive: user.status === 'active',
        emailVerified: user.email_verified_at !== null,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLoginAt: user.last_login_at || null
      }));

      this.logger.info('[UserService.getAllUsers] Successfully fetched all users', {
        totalUsers: mappedUsers.length,
        totalCount: total
      });

      return {
        users: mappedUsers,
        total
      };
    } catch (error) {
      this.logger.error('Error getting all users (SuperAdmin)', {
        error: error.message,
        stack: error.stack,
        options
      });
      throw error;
    }
  }
  async getUsersByCompany(companyId: string, options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<{
    users: IUser[];
    total: number;
  }> {
    try {
      const page = options?.page || 1;
      const limit = options?.limit || 20;
      const offset = (page - 1) * limit;
      const users = await this.userCompanyRepository.getUsersInCompany(companyId, {
        offset,
        limit,
        search: options?.search,
        roleId: options?.role
      });
      const total = await this.userCompanyRepository.countUsersInCompany(companyId, {
        search: options?.search,
        roleId: options?.role,
        isActive: options?.isActive
      });
      // Log para debug
      this.logger.debug('[UserService.getUsersByCompany] Raw users from repository', {
        usersCount: users.length,
        firstUser: users[0]
      });

      const mappedUsers = users.map(user => {
        const mappedUser = {
          id: user.userId,  // Corregido: usar userId que viene del repository
          email: user.email,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          role: user.role || 'company_user',
          roleId: user.roleId || null,  // Agregado: roleId para el frontend
          status: user.status || 'active',
          avatar: user.avatar || null,
          phone: user.phone || null,
          isActive: user.status === 'active',
          emailVerified: user.emailVerified || false,
          createdAt: user.joinedAt,
          updatedAt: user.joinedAt,  // No tenemos updatedAt, usamos joinedAt
          lastLoginAt: user.lastActiveAt || null
        };

        // Log del primer usuario mapeado
        if (users.indexOf(user) === 0) {
          this.logger.debug('[UserService.getUsersByCompany] First mapped user', {
            mappedUser,
            hasId: !!mappedUser.id
          });
        }

        return mappedUser;
      });

      return {
        users: mappedUsers,
        total
      };
    } catch (error) {
      this.logger.error('Error getting users by company', {
        error: error.message,
        companyId,
        options
      });
      throw error;
    }
  }
  async getUserById(userId: string, companyId: string): Promise<IUser | null> {
    try {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return null;
      }
      // Verify user belongs to the company
      const userCompany = await this.userCompanyRepository.getUserRoleInCompany(userId, companyId);
      if (!userCompany) {
        return null;
      }
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        role: userCompany.role || 'user',
        avatar: null,
        phone: null,
        isActive: true,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        lastLoginAt: null
      };
    } catch (error) {
      this.logger.error('Error getting user by ID', {
        error: error.message,
        userId,
        companyId
      });
      throw error;
    }
  }
  async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    avatar?: string;
    phone?: string;
    status?: boolean;
    companyId: string;
    createdBy: string;
    password?: string;
  }): Promise<IUser> {
    try {
      // Generate a temporary password if not provided
      const password = data.password || this.generateTemporaryPassword();
      const passwordHash = await this.passwordService.hashPassword(password);
      // Create user
      const userId = uuidv4();
      
      // Build user data object - only include defined values
      const userData: ICreateUserData = {
        id: userId,
        email: data.email,
        password_hash: passwordHash,
        first_name: data.firstName,
        last_name: data.lastName,
        status: data.status || 'active',
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Only add optional fields if they have values
      if (data.avatar) userData.avatar = data.avatar;
      if (data.phone) userData.phone = data.phone;
      
      const user = await this.userRepository.create(userData);

      // Assign user to company with role
      await this.userCompanyRepository.addUserToCompany(userId, data.companyId, data.role);

      this.logger.info('User Assigned successfully', {
        userId,
        email: data.email,
        companyId: data.companyId,
        createdBy: data.createdBy
      });
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: data.role,
        avatar: user.avatar,
        phone: user.phone,
        isActive: user.status === 'active',
        createdAt: user.created_at
      };
    } catch (error) {
      this.logger.error('Error creating user', {
        error: error,
        email: data.email,
        companyId: data.companyId
      });
      throw error;
    }
  }
  async updateUser(userId: string, companyId: string, data: {
    firstName?: string;
    lastName?: string;
    role?: string;
    avatar?: string;
    phone?: string;
    status?: string;
    isActive?: boolean;
  }): Promise<IUser | null> {
    try {
      this.logger.debug('[UserService.updateUser] Starting update', {
        userId,
        companyId,
        updateFields: Object.keys(data)
      });

      // SUPER ADMIN: Saltear verificación de empresa para empresa virtual
      const isSuperAdminContext = companyId === '00000000-0000-0000-0000-000000000000';

      let userCompany = null;
      if (!isSuperAdminContext) {
        // Verify user belongs to company (solo para usuarios normales)
        userCompany = await this.userCompanyRepository.getUserRoleInCompany(userId, companyId);
        if (!userCompany) {
          this.logger.warn('[UserService.updateUser] User does not belong to company', {
            userId,
            companyId
          });
          return null;
        }
      } else {
        this.logger.info('[UserService.updateUser] Super Admin context - skipping company verification', {
          userId,
          companyId
        });
        // Para Super Admin, crear un objeto mock para compatibilidad
        userCompany = { role: 'super_admin' };
      }
      // Update user data
      const updates: IUpdateUserData = {
        updated_at: new Date()
      };
      if (data.firstName !== undefined) updates.first_name = data.firstName;
      if (data.lastName !== undefined) updates.last_name = data.lastName;
      if (data.avatar !== undefined) updates.avatar = data.avatar;
      if (data.phone !== undefined) updates.phone = data.phone;

      // Manejar status - priorizar status directo, sino usar isActive
      if (data.status !== undefined) {
        updates.status = data.status;
      } else if (data.isActive !== undefined) {
        updates.status = data.isActive ? 'active' : 'inactive';
      }
      const user = await this.userRepository.update(userId, updates);

      // Update role if provided (solo para usuarios normales, no Super Admin)
      if (data.role && data.role !== userCompany.role && !isSuperAdminContext) {
        this.logger.debug('[UserService.updateUser] Updating user role in company', {
          userId,
          companyId,
          oldRole: userCompany.role,
          newRole: data.role
        });
        await this.userCompanyRepository.updateUserRoleInCompany(userId, companyId, data.role);
      } else if (isSuperAdminContext && data.role) {
        this.logger.info('[UserService.updateUser] Super Admin context - role update skipped', {
          userId,
          requestedRole: data.role
        });
      }
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: data.role || userCompany.role,
        avatar: user.avatar,
        phone: user.phone,
        isActive: user.status === 'active',
        updatedAt: user.updated_at
      };
    } catch (error) {
      this.logger.error('[UserService.updateUser] Error updating user', {
        error: error.message,
        stack: error.stack,
        userId,
        companyId,
        isSuperAdminContext: companyId === '00000000-0000-0000-0000-000000000000',
        updateData: data
      });
      throw error;
    }
  }
  async updateUserProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    phone?: string;
  }): Promise<IUser> {
    try {
      const updates: IUpdateUserData = {
        updated_at: new Date()
      };
      if (data.firstName !== undefined) updates.first_name = data.firstName;
      if (data.lastName !== undefined) updates.last_name = data.lastName;
      if (data.avatar !== undefined) updates.avatar = data.avatar;
      if (data.phone !== undefined) updates.phone = data.phone;
      const user = await this.userRepository.update(userId, updates);
      // Get user's role
      const userCompanies = await this.userRepository.getUserCompanies(userId);
      const primaryCompany = userCompanies.find(c => c.is_default) || userCompanies[0];
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: primaryCompany?.role || 'user',
        avatar: user.avatar,
        phone: user.phone,
        updatedAt: user.updated_at
      };
    } catch (error) {
      this.logger.error('Error updating user profile', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  async deleteUser(userId: string, companyId: string): Promise<boolean> {
    // Log detallado al inicio del proceso de eliminación
    this.logger.info('[UserService.deleteUser] START', {
      userId,
      companyId,
      timestamp: new Date().toISOString(),
      operation: 'DELETE_USER'
    });


    try {
      // Verify user belongs to company
      this.logger.debug('[UserService.deleteUser] Checking if user belongs to company', {
        userId,
        companyId
      });
      const userCompany = await this.userCompanyRepository.getUserRoleInCompany(userId, companyId);

      this.logger.debug('[UserService.deleteUser] User company check result', {
        userId,
        companyId,
        userCompany,
        exists: !!userCompany,
        roleId: userCompany?.roleId,
        role: userCompany?.role
      });

      if (!userCompany) {
        this.logger.warn('[UserService.deleteUser] User does not belong to company', {
          userId,
          companyId,
          message: 'User not found in company or already removed'
        });
        return false;
      }

      // Soft delete user
      this.logger.debug('[UserService.deleteUser] Starting soft delete', {
        userId,
        companyId,
        action: 'SOFT_DELETE'
      });

      await this.userRepository.update(userId, {
        status: 'inactive',
        deleted_at: new Date(),
        updated_at: new Date()
      });

      this.logger.info('[UserService.deleteUser] User soft deleted successfully', {
        userId,
        companyId,
        status: 'inactive',
        deletedAt: new Date().toISOString()
      });

      // Invalidate all user sessions
      this.logger.debug('[UserService.deleteUser] Invalidating user sessions', {
        userId,
        action: 'INVALIDATE_SESSIONS'
      });

      let invalidatedCount = 0;
      try {
        // Check if sessionRepository exists
        if (!this.sessionRepository) {
          this.logger.warn('[UserService.deleteUser] SessionRepository not available, skipping session invalidation');
        } else {
          invalidatedCount = await this.sessionRepository.invalidateUserSessions(userId);
          this.logger.info('[UserService.deleteUser] Sessions invalidated', {
            userId,
            companyId,
            invalidatedSessionsCount: invalidatedCount
          });
          this.logger.debug('[UserService.deleteUser] Sessions invalidated', { invalidatedCount });
        }
      } catch (sessionError) {
        // Log the error but don't fail the deletion
        this.logger.error('[UserService.deleteUser] Error invalidating sessions (non-fatal)', {
          userId,
          error: sessionError instanceof Error ? sessionError.message : String(sessionError),
          stack: sessionError instanceof Error ? sessionError.stack : undefined
        });
        this.logger.warn('[UserService.deleteUser] Non-fatal error invalidating sessions', {
          error: sessionError instanceof Error ? sessionError.message : String(sessionError)
        });
        // Continue with the deletion process
      }

      this.logger.info('[UserService.deleteUser] User deletion completed successfully', {
        userId,
        companyId,
        timestamp: new Date().toISOString(),
        result: 'SUCCESS',
        operations: ['VERIFY_USER_COMPANY', 'SOFT_DELETE', 'INVALIDATE_SESSIONS']
      });

      return true;
    } catch (error) {
      const errorDetails = {
        userId,
        companyId,
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : 'UnknownError',
        errorCode: (error as any).code,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        operation: 'DELETE_USER_FAILED'
      };


      this.logger.error('[UserService.deleteUser] Error deleting user', errorDetails);

      throw error;
    }
  }
  async emailExistsInCompany(email: string, companyId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findByEmail(email);
      if (!user) {
        return false;
      }
      const userCompany = await this.userRepository.findUserCompanyRole(user.id, companyId);
      return !!userCompany;
    } catch (error) {
      this.logger.error('Error checking email existence', {
        error: error.message,
        email,
        companyId
      });
      throw error;
    }
  }
  async getUserActivity(userId: string, companyId: string): Promise<IUserActivity | null> {
    try {
      // Verify user belongs to company
      const userCompany = await this.userCompanyRepository.getUserRoleInCompany(userId, companyId);
      if (!userCompany) {
        return null;
      }
      const user = await this.userRepository.findById(userId);
      if (!user) {
        return null;
      }
      const sessions = await this.sessionRepository.getActiveUserSessions(userId);
      return {
        lastLoginAt: user.last_login_at,
        totalSessions: sessions.length,
        activeSessions: sessions.filter(s => s.active).length,
        recentSessions: sessions.slice(0, 5).map(session => ({
          id: session.id,
          deviceInfo: session.deviceInfo,
          createdAt: session.createdAt,
          lastActivityAt: session.lastActivityAt,
          isActive: session.active
        }))
      };
    } catch (error) {
      this.logger.error('Error getting user activity', {
        error: error.message,
        userId,
        companyId
      });
      throw error;
    }
  }
  async assignUserToCompany(userId: string, companyId: string, role: string): Promise<boolean> {
    try {
      await this.userCompanyRepository.addUserToCompany(userId, companyId, role);
      this.logger.info('User assigned to company', {
        userId,
        companyId,
        role
      });
      return true;
    } catch (error) {
      this.logger.error('Error assigning user to company', {
        error: error.message,
        userId,
        companyId,
        role
      });
      throw error;
    }
  }
  async removeUserFromCompany(userId: string, companyId: string): Promise<boolean> {
    try {
      await this.userRepository.removeFromCompany(userId, companyId);
      // Invalidate sessions for this company
      const sessions = await this.sessionRepository.getActiveUserSessions(userId);
      for (const session of sessions) {
        if (session.companyId === companyId) {
          await this.sessionRepository.invalidate(session.id);
        }
      }
      this.logger.info('User removed from company', {
        userId,
        companyId
      });
      return true;
    } catch (error) {
      this.logger.error('Error removing user from company', {
        error: error.message,
        userId,
        companyId
      });
      throw error;
    }
  }
  async getUserCompanies(userId: string): Promise<IUserCompany[]> {
    try {
      const companies = await this.userRepository.getUserCompanies(userId);
      return companies.map(c => ({
        id: c.company_id,
        name: c.company_name,
        role: c.role,
        isActive: c.status === 'active'
      }));
    } catch (error) {
      this.logger.error('Error getting user companies', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
