import { Request, Response } from 'express';
import { inject, injectable } from 'inversify';
import { TYPES } from '@/container/types';
import { IUserService } from '@modules/users/interfaces/IUserService';
import { ILoggerService } from '@/shared/services/logger/LoggerService';
import { CreateUserDto } from '@modules/users/dto/CreateUserDto';
import { UpdateUserDto } from '@modules/users/dto/UpdateUserDto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

/**
 * User Controller
 * Sprint 3 - User Management
 */
@injectable()
export class UserController {
  constructor(
    @inject(TYPES.UserService) private userService: IUserService,
    @inject(TYPES.Logger) private logger: ILoggerService
  ) {}

  /**
   * Get all users
   * GET /api/users
   */
  getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;

      const users = await this.userService.getAllUsers({
        page: Number(page),
        limit: Number(limit),
        search: String(search),
        role: String(role),
        status: String(status)
      });

      res.json({
        success: true,
        data: users
      });
    } catch (error: any) {
      this.logger.error('Get all users error', { error: error.message, stack: error.stack });
      res.status(500).json({
        success: false,
        message: 'Error fetching users'
      });
    }
  };

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const user = await this.userService.getUserById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error: any) {
      this.logger.error('Get user by ID error', { 
        userId: req.params.id, 
        error: error.message, 
        stack: error.stack 
      });
      res.status(500).json({
        success: false,
        message: 'Error fetching user'
      });
    }
  };

  /**
   * Get current user profile
   * GET /api/users/profile
   */
  getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const user = await this.userService.getUserById(userId);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User profile not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { user }
      });
    } catch (error: any) {
      this.logger.error('Get profile error', { 
        userId: req.user?.id, 
        error: error.message, 
        stack: error.stack 
      });
      res.status(500).json({
        success: false,
        message: 'Error fetching profile'
      });
    }
  };

  /**
   * Get users by company
   * GET /api/users/company/:companyId
   */
  getUsersByCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      const { companyId } = req.params;
      const { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;

      const users = await this.userService.getUsersByCompany(companyId, {
        page: Number(page),
        limit: Number(limit),
        search: String(search),
        role: String(role),
        status: String(status)
      });

      res.json({
        success: true,
        data: users
      });
    } catch (error: any) {
      this.logger.error('Get users by company error', { 
        companyId: req.params.companyId, 
        error: error.message, 
        stack: error.stack 
      });
      res.status(500).json({
        success: false,
        message: 'Error fetching company users'
      });
    }
  };

  /**
   * Create new user
   * POST /api/users
   */
  createUser = async (req: Request, res: Response): Promise<void> => {
    try {
      // Check user authentication from middleware
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // Validate input
      const createUserDto = plainToInstance(CreateUserDto, req.body);
      const errors = await validate(createUserDto);

      if (errors.length > 0) {
        this.logger.debug('Validation errors:', errors);
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
      const emailExists = await this.userService.emailExistsInCompany(
        createUserDto.email, 
        req.user.companyId
      );

      if (emailExists) {
        this.logger.debug('Email already exists in company:', createUserDto.email);
        res.status(400).json({
          success: false,
          message: 'Email already exists in this company'
        });
        return;
      }

      // Create user
      const user = await this.userService.createUser({
        ...createUserDto,
        companyId: req.user.companyId,
        createdBy: req.user.id
      });

      this.logger.info('User created successfully', {
        userId: user.id,
        email: createUserDto.email,
        role: createUserDto.role,
        companyId: req.user.companyId,
        createdBy: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: { user }
      });
    } catch (error: any) {
      this.logger.error('Create user error', { 
        email: req.body.email,
        companyId: req.user?.companyId,
        createdBy: req.user?.id,
        error: error.message, 
        stack: error.stack 
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
      const { id } = req.params;

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

      const user = await this.userService.updateUser(id, updateUserDto);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      this.logger.info('User updated successfully', {
        userId: id,
        updatedBy: req.user?.id
      });

      res.json({
        success: true,
        message: 'User updated successfully',
        data: { user }
      });
    } catch (error: any) {
      this.logger.error('Update user error', { 
        userId: req.params.id, 
        error: error.message, 
        stack: error.stack 
      });
      res.status(500).json({
        success: false,
        message: 'Error updating user'
      });
    }
  };

  /**
   * Update current user profile
   * PUT /api/users/profile
   */
  updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

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

      const user = await this.userService.updateUser(userId, updateUserDto);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      this.logger.info('Profile updated successfully', { userId });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { user }
      });
    } catch (error: any) {
      this.logger.error('Update profile error', { 
        userId: req.user?.id, 
        error: error.message, 
        stack: error.stack 
      });
      res.status(500).json({
        success: false,
        message: 'Error updating profile'
      });
    }
  };

  /**
   * Delete user
   * DELETE /api/users/:id
   */
  deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const companyId = req.headers['x-company-id'] as string || req.user?.companyId;

      // Log inicial detallado
      this.logger.info('[UserController.deleteUser] Request received', {
        userId: id,
        companyId,
        userContext: req.user,
        headers: Object.keys(req.headers),
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path
      });

      console.log('[UserController.deleteUser] Request received:', {
        userId: id,
        companyId,
        userContext: req.user,
        headers: req.headers,
        timestamp: new Date().toISOString()
      });

      if (!companyId) {
        this.logger.error('[UserController.deleteUser] No companyId found in request', {
          userId: id,
          headers: req.headers,
          userContext: req.user
        });
        console.log('[UserController.deleteUser] No companyId found in request');
        res.status(400).json({
          success: false,
          message: 'Company ID is required'
        });
        return;
      }

      this.logger.debug('[UserController.deleteUser] Calling userService.deleteUser', {
        userId: id,
        companyId
      });
      console.log('[UserController.deleteUser] Calling userService.deleteUser...');
      const success = await this.userService.deleteUser(id, companyId);

      this.logger.debug('[UserController.deleteUser] Service response', {
        userId: id,
        companyId,
        success
      });
      console.log('[UserController.deleteUser] Service response:', { success });

      if (!success) {
        this.logger.warn('[UserController.deleteUser] User not found or not in company', {
          userId: id,
          companyId,
          message: 'User not found or does not belong to this company'
        });
        console.log('[UserController.deleteUser] User not found or not in company');
        res.status(404).json({
          success: false,
          message: 'User not found or does not belong to this company'
        });
        return;
      }

      this.logger.info('[UserController.deleteUser] User deleted successfully', {
        userId: id,
        companyId,
        deletedBy: req.user?.id,
        timestamp: new Date().toISOString(),
        responseStatus: 200
      });

      console.log('[UserController.deleteUser] SUCCESS - User deleted');
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error: any) {
      const errorDetails = {
        userId: req.params.id,
        companyId: req.headers['x-company-id'] || req.user?.companyId,
        error: error.message,
        stack: error.stack,
        errorCode: error.code,
        errorName: error.name,
        timestamp: new Date().toISOString()
      };

      console.error('[UserController.deleteUser] ERROR:', errorDetails);

      this.logger.error('[UserController.deleteUser] Delete user error', errorDetails);

      res.status(500).json({
        success: false,
        message: 'Error deleting user'
      });
    }
  };

  /**
   * Assign user to company
   * POST /api/users/:id/companies
   */
  assignToCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { companyId, roleId } = req.body;

      if (!companyId || !roleId) {
        res.status(400).json({
          success: false,
          message: 'Company ID and Role ID are required'
        });
        return;
      }

      await this.userService.assignToCompany(id, companyId, roleId);

      this.logger.info('User assigned to company', {
        userId: id,
        companyId,
        roleId,
        assignedBy: req.user?.id
      });

      res.json({
        success: true,
        message: 'User assigned to company successfully'
      });
    } catch (error: any) {
      this.logger.error('Assign to company error', { 
        userId: req.params.id, 
        companyId: req.body.companyId,
        error: error.message, 
        stack: error.stack 
      });
      res.status(500).json({
        success: false,
        message: 'Error assigning user to company'
      });
    }
  };

  /**
   * Remove user from company
   * DELETE /api/users/:id/companies/:companyId
   */
  removeFromCompany = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, companyId } = req.params;

      await this.userService.removeFromCompany(id, companyId);

      this.logger.info('User removed from company', {
        userId: id,
        companyId,
        removedBy: req.user?.id
      });

      res.json({
        success: true,
        message: 'User removed from company successfully'
      });
    } catch (error: any) {
      this.logger.error('Remove from company error', { 
        userId: req.params.id, 
        companyId: req.params.companyId,
        error: error.message, 
        stack: error.stack 
      });
      res.status(500).json({
        success: false,
        message: 'Error removing user from company'
      });
    }
  };
}