/**
 * User Controller - Sprint 2
 * Siguiendo lineamientos nivel 2: CRUD completo con multi-tenancy
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TYPES } from '@/container/types';
import { IUserService } from '@/modules/users/interfaces/IUserService';
import { 
  CreateUserDto, 
  UpdateUserDto, 
  UpdateProfileDto,
  AssignUserToCompanyDto,
  RemoveUserFromCompanyDto 
} from '@/shared/validators/user.validators';

@injectable()
export class UserController {
  constructor(
    @inject(TYPES.UserService) private userService: IUserService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Get all users in company (paginated)
   * GET /api/users
   */
  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Extract pagination params
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const role = req.query.role as string;
      const isActive = req.query.isActive === 'true' ? true : 
                      req.query.isActive === 'false' ? false : undefined;

      // Get users for current company
      const result = await this.userService.getUsersByCompany(req.user.companyId, {
        page,
        limit,
        search,
        role,
        isActive
      });

      res.status(200).json({
        success: true,
        data: {
          users: result.users,
          pagination: {
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit)
          }
        }
      });

    } catch (error) {
      this.logger.error('Get users error', {
        error: error.message,
        companyId: req.user?.companyId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.params.id;

      // Get user with company validation
      const user = await this.userService.getUserById(userId, req.user.companyId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found or access denied'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            avatar: user.avatar,
            phone: user.phone,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            lastLoginAt: user.lastLoginAt
          }
        }
      });

    } catch (error) {
      this.logger.error('Get user by ID error', {
        error: error.message,
        userId: req.params.id,
        companyId: req.user?.companyId,
        requesterId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Create new user
   * POST /api/users
   */
  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      console.log('🚀 [Backend] POST /api/v1/users - Creating user');
      console.log('📝 [Backend] Request body:', req.body);
      console.log('👤 [Backend] Authenticated user:', { id: req.user?.id, role: req.user?.role });
      
      // Require authentication and admin/manager role
      if (!req.user) {
        console.log('❌ [Backend] Authentication required');
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!['admin', 'manager', 'Admin', 'Manager'].includes(req.user.role)) {
        console.log('❌ [Backend] Insufficient permissions. User role:', req.user.role);
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions. Admin or Manager role required.'
        });
        return;
      }
      
      console.log('✅ [Backend] Authorization passed');

      // Validate input
      console.log('🔍 [Backend] Validating input data');
      const createUserDto = plainToInstance(CreateUserDto, req.body);
      const errors = await validate(createUserDto);

      if (errors.length > 0) {
        console.log('❌ [Backend] Validation errors:', errors);
        const errorMessages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        );

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errorMessages
        });
        return;
      }

      // Check if email already exists
      console.log('🔍 [Backend] Checking if email exists:', createUserDto.email);
      const emailExists = await this.userService.emailExistsInCompany(
        createUserDto.email, 
        req.user.companyId
      );

      if (emailExists) {
        console.log('❌ [Backend] Email already exists in company');
        res.status(400).json({
          success: false,
          message: 'Email already exists in this company'
        });
        return;
      }

      console.log('✅ [Backend] Email is available, creating user...');
      // Create user
      const user = await this.userService.createUser({
        ...createUserDto,
        companyId: req.user.companyId,
        createdBy: req.user.id
      });
      
      console.log('✅ [Backend] User created in database:', { id: user.id, email: user.email });

      this.logger.info('User created successfully', {
        userId: user.id,
        email: createUserDto.email,
        role: createUserDto.role,
        companyId: req.user.companyId,
        createdBy: req.user.id
      });

      console.log('✅ [Backend] Sending success response');
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            avatar: user.avatar,
            phone: user.phone,
            isActive: user.isActive,
            createdAt: user.createdAt
          }
        }
      });

    } catch (error) {
      this.logger.error('Create user error', {
        error: error.message,
        stack: error.stack,
        email: req.body?.email,
        companyId: req.user?.companyId,
        createdBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Update user
   * PUT /api/users/:id
   */
  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication and admin/manager role
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!['admin', 'manager'].includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions. Admin or Manager role required.'
        });
        return;
      }

      const userId = req.params.id;

      // Validate input
      const updateUserDto = plainToInstance(UpdateUserDto, req.body);
      const errors = await validate(updateUserDto);

      if (errors.length > 0) {
        const errorMessages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        );

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errorMessages
        });
        return;
      }

      // Prevent self-role modification
      if (req.user.id === userId && updateUserDto.role) {
        res.status(400).json({
          success: false,
          message: 'Cannot modify your own role'
        });
        return;
      }

      // Update user
      const updatedUser = await this.userService.updateUser(
        userId, 
        req.user.companyId,
        updateUserDto
      );

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: 'User not found or access denied'
        });
        return;
      }

      this.logger.info('User updated successfully', {
        userId,
        updatedFields: Object.keys(updateUserDto),
        companyId: req.user.companyId,
        updatedBy: req.user.id
      });

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            role: updatedUser.role,
            avatar: updatedUser.avatar,
            phone: updatedUser.phone,
            isActive: updatedUser.isActive,
            updatedAt: updatedUser.updatedAt
          }
        }
      });

    } catch (error) {
      this.logger.error('Update user error', {
        error: error.message,
        userId: req.params.id,
        companyId: req.user?.companyId,
        updatedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Delete user (soft delete)
   * DELETE /api/users/:id
   */
  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication and admin role
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions. Admin role required.'
        });
        return;
      }

      const userId = req.params.id;

      // Prevent self-deletion
      if (req.user.id === userId) {
        res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
        return;
      }

      // Soft delete user
      const deleted = await this.userService.deleteUser(userId, req.user.companyId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'User not found or access denied'
        });
        return;
      }

      this.logger.warn('User deleted', {
        userId,
        companyId: req.user.companyId,
        deletedBy: req.user.id
      });

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      this.logger.error('Delete user error', {
        error: error.message,
        userId: req.params.id,
        companyId: req.user?.companyId,
        deletedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Get current user's profile
   * GET /api/users/profile
   */
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Get user profile
      const profile = await this.userService.getUserById(req.user.id, req.user.companyId);

      if (!profile) {
        res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: profile
        }
      });

    } catch (error) {
      this.logger.error('Get profile error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Get users by company
   * GET /api/users/company/:companyId
   */
  getUsersByCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const companyId = req.params.companyId;

      // Check permissions - only allow viewing users from own company or admin
      if (req.user.companyId !== companyId && req.user.role !== 'admin') {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      // Extract pagination params
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // Get users by company
      const result = await this.userService.getUsersByCompany(companyId, {
        page,
        limit
      });

      res.status(200).json({
        success: true,
        data: {
          users: result.users,
          pagination: {
            total: result.total,
            page,
            limit,
            totalPages: Math.ceil(result.total / limit)
          }
        }
      });

    } catch (error) {
      this.logger.error('Get users by company error', {
        error: error.message,
        companyId: req.params.companyId,
        requesterId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Update own profile
   * PUT /api/users/profile
   */
  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Validate input
      const updateProfileDto = plainToInstance(UpdateProfileDto, req.body);
      const errors = await validate(updateProfileDto);

      if (errors.length > 0) {
        const errorMessages = errors.map(error => 
          Object.values(error.constraints || {}).join(', ')
        );

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errorMessages
        });
        return;
      }

      // Update own profile
      const updatedUser = await this.userService.updateUserProfile(
        req.user.id,
        updateProfileDto
      );

      this.logger.info('Profile updated successfully', {
        userId: req.user.id,
        updatedFields: Object.keys(updateProfileDto)
      });

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            role: updatedUser.role,
            avatar: updatedUser.avatar,
            phone: updatedUser.phone,
            updatedAt: updatedUser.updatedAt
          }
        }
      });

    } catch (error) {
      this.logger.error('Update profile error', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Activate/Deactivate user
   * PATCH /api/users/:id/status
   */
  toggleUserStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication and admin/manager role
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      if (!['admin', 'manager'].includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions. Admin or Manager role required.'
        });
        return;
      }

      const userId = req.params.id;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'isActive field is required and must be boolean'
        });
        return;
      }

      // Prevent self-deactivation
      if (req.user.id === userId && !isActive) {
        res.status(400).json({
          success: false,
          message: 'Cannot deactivate your own account'
        });
        return;
      }

      // Update user status
      const updatedUser = await this.userService.updateUser(
        userId,
        req.user.companyId,
        { isActive }
      );

      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: 'User not found or access denied'
        });
        return;
      }

      this.logger.info('User status changed', {
        userId,
        newStatus: isActive ? 'active' : 'inactive',
        companyId: req.user.companyId,
        changedBy: req.user.id
      });

      res.status(200).json({
        success: true,
        message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            isActive: updatedUser.isActive,
            updatedAt: updatedUser.updatedAt
          }
        }
      });

    } catch (error) {
      this.logger.error('Toggle user status error', {
        error: error.message,
        userId: req.params.id,
        companyId: req.user?.companyId,
        changedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Get user activity/sessions
   * GET /api/users/:id/activity
   */
  getUserActivity = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.params.id;

      // Only allow viewing own activity or admin/manager viewing others
      if (req.user.id !== userId && !['admin', 'manager'].includes(req.user.role)) {
        res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
        return;
      }

      // Get user activity
      const activity = await this.userService.getUserActivity(userId, req.user.companyId);

      if (!activity) {
        res.status(404).json({
          success: false,
          message: 'User not found or access denied'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          activity: {
            lastLoginAt: activity.lastLoginAt,
            totalSessions: activity.totalSessions,
            activeSessions: activity.activeSessions,
            recentSessions: activity.recentSessions?.map(session => ({
              id: session.id,
              deviceInfo: session.deviceInfo,
              createdAt: session.createdAt,
              lastActivityAt: session.lastActivityAt,
              isActive: session.isActive
            }))
          }
        }
      });

    } catch (error) {
      this.logger.error('Get user activity error', {
        error: error.message,
        userId: req.params.id,
        requesterId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Assign user to company
   * POST /api/users/:id/companies
   */
  assignToCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.params.id;
      const { companyId, role } = req.body;

      // Validate input
      const assignDto = plainToInstance(AssignUserToCompanyDto, req.body);
      const errors = await validate(assignDto);

      if (errors.length > 0) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.map(error => ({
            field: error.property,
            constraints: error.constraints
          }))
        });
        return;
      }

      // Assign user to company
      const result = await this.userService.assignUserToCompany(userId, companyId, role);

      this.logger.info('User assigned to company', {
        userId,
        companyId,
        role,
        assignedBy: req.user.id
      });

      res.status(200).json({
        success: true,
        message: 'User assigned to company successfully',
        data: result
      });

    } catch (error) {
      this.logger.error('Assign user to company error', {
        error: error.message,
        userId: req.params.id,
        requesterId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Remove user from company
   * DELETE /api/users/:id/companies/:companyId
   */
  removeFromCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userId = req.params.id;
      const companyId = req.params.companyId;

      // Remove user from company
      await this.userService.removeUserFromCompany(userId, companyId);

      this.logger.info('User removed from company', {
        userId,
        companyId,
        removedBy: req.user.id
      });

      res.status(200).json({
        success: true,
        message: 'User removed from company successfully'
      });

    } catch (error) {
      this.logger.error('Remove user from company error', {
        error: error.message,
        userId: req.params.id,
        companyId: req.params.companyId,
        requesterId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}
