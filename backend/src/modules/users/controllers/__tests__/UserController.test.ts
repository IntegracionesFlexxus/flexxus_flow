/**
 * UserController Tests - Sprint 2
 * Siguiendo lineamientos nivel 2: tests críticos para controllers API
 */

import 'reflect-metadata';
import { Request, Response } from 'express';
import { UserController } from '@/modules/users/controllers/UserController';
import { IUserService } from '@/modules/users/interfaces/IUserService';
import { Logger } from 'winston';

// Mock dependencies
const mockUserService = {
  createUser: jest.fn(),
  updateUser: jest.fn(),
  deleteUser: jest.fn(),
  getUserById: jest.fn(),
  getUsersByCompany: jest.fn(),
  updateProfile: jest.fn(),
  changeUserRole: jest.fn(),
  toggleUserStatus: jest.fn(),
  getUserActivity: jest.fn()
} as jest.Mocked<IUserService>;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
} as unknown as Logger;

describe('UserController', () => {
  let userController: UserController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    userController = new UserController(mockUserService, mockLogger);

    jsonSpy = jest.fn().mockReturnThis();
    statusSpy = jest.fn().mockReturnThis();

    req = {
      body: {},
      params: {},
      query: {},
      user: {
        id: 'user-123',
        email: 'test@example.com',
        companyId: 'company-456',
        role: 'admin'
      }
    };

    res = {
      status: statusSpy,
      json: jsonSpy
    };

    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should get users with pagination and filters', async () => {
      const usersResult = {
        users: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            firstName: 'User',
            lastName: 'One',
            role: 'user',
            isActive: true,
            createdAt: new Date()
          },
          {
            id: 'user-2',
            email: 'user2@example.com',
            firstName: 'User',
            lastName: 'Two',
            role: 'manager',
            isActive: true,
            createdAt: new Date()
          }
        ],
        pagination: {
          total: 2,
          totalPages: 1,
          currentPage: 1,
          limit: 10
        }
      };

      req.query = {
        page: '1',
        limit: '10',
        search: 'user',
        role: 'all',
        isActive: 'true'
      };

      mockUserService.getUsersByCompany.mockResolvedValue(usersResult);

      await userController.getUsers(req as Request, res as Response);

      expect(mockUserService.getUsersByCompany).toHaveBeenCalledWith('company-456', {
        page: 1,
        limit: 10,
        search: 'user',
        role: 'all',
        isActive: true
      });
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Users retrieved successfully',
        data: usersResult
      });
    });

    it('should require admin or manager role', async () => {
      req.user!.role = 'user';

      await userController.getUsers(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
      expect(mockUserService.getUsersByCompany).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockUserService.getUsersByCompany.mockRejectedValue(new Error('Database error'));

      await userController.getUsers(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve users'
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getUserById', () => {
    it('should get user by ID successfully', async () => {
      const user = {
        id: 'user-456',
        email: 'target@example.com',
        firstName: 'Target',
        lastName: 'User',
        role: 'user',
        isActive: true,
        companyId: 'company-456',
        createdAt: new Date(),
        lastLoginAt: new Date()
      };

      req.params = { id: 'user-456' };
      mockUserService.getUserById.mockResolvedValue(user);

      await userController.getUserById(req as Request, res as Response);

      expect(mockUserService.getUserById).toHaveBeenCalledWith('user-456', 'company-456');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'User retrieved successfully',
        data: { user }
      });
    });

    it('should handle user not found', async () => {
      req.params = { id: 'nonexistent' };
      mockUserService.getUserById.mockResolvedValue(null);

      await userController.getUserById(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'User not found'
      });
    });
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const createUserData = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        password: 'password123',
        role: 'user',
        sendInvite: true
      };

      const createdUser = {
        id: 'user-new',
        email: createUserData.email,
        firstName: createUserData.firstName,
        lastName: createUserData.lastName,
        role: createUserData.role,
        isActive: true,
        companyId: 'company-456',
        createdAt: new Date()
      };

      req.body = createUserData;
      mockUserService.createUser.mockResolvedValue(createdUser);

      await userController.createUser(req as Request, res as Response);

      expect(mockUserService.createUser).toHaveBeenCalledWith({
        ...createUserData,
        companyId: 'company-456',
        createdBy: 'user-123'
      });
      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'User created successfully',
        data: { user: createdUser }
      });
    });

    it('should require admin role for user creation', async () => {
      req.user!.role = 'user';
      req.body = {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        password: 'password123',
        role: 'user'
      };

      await userController.createUser(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
      expect(mockUserService.createUser).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      req.body = {
        email: 'invalid-email',
        firstName: '',
        lastName: 'User',
        password: '123', // Too short
        role: 'invalid-role'
      };

      // Mock validation errors
      const mockValidate = jest.fn().mockResolvedValue([
        {
          property: 'email',
          constraints: { isEmail: 'Invalid email format' }
        },
        {
          property: 'firstName',
          constraints: { isNotEmpty: 'First name is required' }
        }
      ]);

      jest.doMock('class-validator', () => ({
        validate: mockValidate,
        plainToInstance: jest.fn().mockReturnValue(req.body)
      }));

      await userController.createUser(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.stringContaining('Invalid email format'),
          expect.stringContaining('First name is required')
        ])
      });
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        role: 'manager',
        isActive: true
      };

      const updatedUser = {
        id: 'user-456',
        email: 'user@example.com',
        firstName: 'Updated',
        lastName: 'Name',
        role: 'manager',
        isActive: true,
        companyId: 'company-456',
        updatedAt: new Date()
      };

      req.params = { id: 'user-456' };
      req.body = updateData;
      mockUserService.updateUser.mockResolvedValue(updatedUser);

      await userController.updateUser(req as Request, res as Response);

      expect(mockUserService.updateUser).toHaveBeenCalledWith('user-456', updateData, 'company-456');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'User updated successfully',
        data: { user: updatedUser }
      });
    });

    it('should prevent self-role modification', async () => {
      req.params = { id: 'user-123' }; // Same as req.user.id
      req.body = { role: 'user' };

      await userController.updateUser(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot modify your own role'
      });
      expect(mockUserService.updateUser).not.toHaveBeenCalled();
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      req.params = { id: 'user-456' };
      mockUserService.deleteUser.mockResolvedValue(undefined);

      await userController.deleteUser(req as Request, res as Response);

      expect(mockUserService.deleteUser).toHaveBeenCalledWith('user-456', 'company-456');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully'
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User deleted',
        expect.objectContaining({
          deletedUserId: 'user-456',
          deletedBy: 'user-123',
          companyId: 'company-456'
        })
      );
    });

    it('should prevent self-deletion', async () => {
      req.params = { id: 'user-123' }; // Same as req.user.id

      await userController.deleteUser(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot delete your own account'
      });
      expect(mockUserService.deleteUser).not.toHaveBeenCalled();
    });

    it('should require admin role', async () => {
      req.user!.role = 'manager';
      req.params = { id: 'user-456' };

      await userController.deleteUser(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
    });
  });

  describe('updateProfile', () => {
    it('should update own profile successfully', async () => {
      const profileData = {
        firstName: 'Updated',
        lastName: 'Profile',
        preferences: {
          theme: 'dark',
          language: 'en'
        }
      };

      const updatedProfile = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Updated',
        lastName: 'Profile',
        preferences: profileData.preferences,
        updatedAt: new Date()
      };

      req.body = profileData;
      mockUserService.updateProfile.mockResolvedValue(updatedProfile);

      await userController.updateProfile(req as Request, res as Response);

      expect(mockUserService.updateProfile).toHaveBeenCalledWith('user-123', profileData);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Profile updated successfully',
        data: { profile: updatedProfile }
      });
    });

    it('should require authentication', async () => {
      req.user = undefined;

      await userController.updateProfile(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
    });
  });

  describe('toggleUserStatus', () => {
    it('should toggle user status successfully', async () => {
      const updatedUser = {
        id: 'user-456',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: false,
        updatedAt: new Date()
      };

      req.params = { id: 'user-456' };
      mockUserService.toggleUserStatus.mockResolvedValue(updatedUser);

      await userController.toggleUserStatus(req as Request, res as Response);

      expect(mockUserService.toggleUserStatus).toHaveBeenCalledWith('user-456', 'company-456');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'User status updated successfully',
        data: { user: updatedUser }
      });
    });

    it('should prevent self-status toggle', async () => {
      req.params = { id: 'user-123' }; // Same as req.user.id

      await userController.toggleUserStatus(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot modify your own status'
      });
    });
  });

  describe('changeUserRole', () => {
    it('should change user role successfully', async () => {
      const roleData = {
        role: 'manager'
      };

      const updatedUser = {
        id: 'user-456',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'manager',
        updatedAt: new Date()
      };

      req.params = { id: 'user-456' };
      req.body = roleData;
      mockUserService.changeUserRole.mockResolvedValue(updatedUser);

      await userController.changeUserRole(req as Request, res as Response);

      expect(mockUserService.changeUserRole).toHaveBeenCalledWith('user-456', 'manager', 'company-456');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'User role updated successfully',
        data: { user: updatedUser }
      });
    });

    it('should require admin role', async () => {
      req.user!.role = 'user';
      req.params = { id: 'user-456' };
      req.body = { role: 'manager' };

      await userController.changeUserRole(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
    });
  });

  describe('getUserActivity', () => {
    it('should get user activity successfully', async () => {
      const activityData = {
        activities: [
          {
            id: 'activity-1',
            type: 'login',
            timestamp: new Date(),
            details: { ip: '192.168.1.1' }
          },
          {
            id: 'activity-2',
            type: 'profile_update',
            timestamp: new Date(),
            details: { fields: ['firstName'] }
          }
        ],
        pagination: {
          total: 2,
          totalPages: 1,
          currentPage: 1,
          limit: 10
        }
      };

      req.params = { id: 'user-456' };
      req.query = { page: '1', limit: '10' };
      mockUserService.getUserActivity.mockResolvedValue(activityData);

      await userController.getUserActivity(req as Request, res as Response);

      expect(mockUserService.getUserActivity).toHaveBeenCalledWith('user-456', 'company-456', {
        page: 1,
        limit: 10
      });
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'User activity retrieved successfully',
        data: activityData
      });
    });

    it('should allow users to view their own activity', async () => {
      req.params = { id: 'user-123' }; // Same as req.user.id
      req.user!.role = 'user';
      
      const activityData = {
        activities: [],
        pagination: { total: 0, totalPages: 0, currentPage: 1, limit: 10 }
      };

      mockUserService.getUserActivity.mockResolvedValue(activityData);

      await userController.getUserActivity(req as Request, res as Response);

      expect(mockUserService.getUserActivity).toHaveBeenCalled();
      expect(statusSpy).toHaveBeenCalledWith(200);
    });
  });
});