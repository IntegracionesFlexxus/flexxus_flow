/**
 * CompanyController Tests - Sprint 2
 * Siguiendo lineamientos nivel 2: tests críticos para controllers API
 */

import 'reflect-metadata';
import { Request, Response } from 'express';
import { CompanyController } from '@/modules/companies/controllers/CompanyController';
import { ICompanyService } from '@/modules/companies/interfaces/ICompanyService';
import { IFeatureFlagService } from '@/modules/feature-flags/interfaces/IFeatureFlagService';
import { Logger } from 'winston';

// Mock dependencies
const mockCompanyService = {
  getCompanyById: jest.fn(),
  updateCompany: jest.fn(),
  getCompanyUsers: jest.fn(),
  inviteUser: jest.fn(),
  removeUserFromCompany: jest.fn(),
  updateUserRole: jest.fn(),
  getCompanyUsage: jest.fn(),
  updatePlan: jest.fn(),
  getCompanySettings: jest.fn(),
  updateCompanySettings: jest.fn(),
  toggleFeature: jest.fn(),
  bulkInviteUsers: jest.fn()
} as jest.Mocked<ICompanyService>;

const mockFeatureFlagService = {
  evaluateFeatureFlag: jest.fn(),
  getCompanyFeatures: jest.fn()
} as jest.Mocked<IFeatureFlagService>;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
} as unknown as Logger;

describe('CompanyController', () => {
  let companyController: CompanyController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    companyController = new CompanyController(
      mockCompanyService,
      mockFeatureFlagService,
      mockLogger
    );

    jsonSpy = jest.fn().mockReturnThis();
    statusSpy = jest.fn().mockReturnThis();

    req = {
      body: {},
      params: {},
      query: {},
      user: {
        id: 'user-123',
        email: 'admin@example.com',
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

  describe('getCompany', () => {
    it('should get company successfully', async () => {
      const company = {
        id: 'company-456',
        name: 'Test Company',
        plan: 'professional',
        settings: {
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD'
        },
        features: ['feature1', 'feature2'],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockCompanyService.getCompanyById.mockResolvedValue(company);

      await companyController.getCompany(req as Request, res as Response);

      expect(mockCompanyService.getCompanyById).toHaveBeenCalledWith('company-456');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Company retrieved successfully',
        data: { company }
      });
    });

    it('should handle company not found', async () => {
      mockCompanyService.getCompanyById.mockResolvedValue(null);

      await companyController.getCompany(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Company not found'
      });
    });
  });

  describe('updateCompany', () => {
    it('should update company successfully', async () => {
      const updateData = {
        name: 'Updated Company Name',
        description: 'Updated description'
      };

      const updatedCompany = {
        id: 'company-456',
        name: 'Updated Company Name',
        description: 'Updated description',
        plan: 'professional',
        updatedAt: new Date()
      };

      req.body = updateData;
      mockCompanyService.updateCompany.mockResolvedValue(updatedCompany);

      await companyController.updateCompany(req as Request, res as Response);

      expect(mockCompanyService.updateCompany).toHaveBeenCalledWith('company-456', updateData);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Company updated successfully',
        data: { company: updatedCompany }
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Company updated',
        expect.objectContaining({
          companyId: 'company-456',
          updatedBy: 'user-123'
        })
      );
    });

    it('should require admin role', async () => {
      req.user!.role = 'user';
      req.body = { name: 'New Name' };

      await companyController.updateCompany(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
    });
  });

  describe('getCompanyUsers', () => {
    it('should get company users with pagination', async () => {
      const usersResult = {
        users: [
          {
            id: 'user-1',
            email: 'user1@example.com',
            firstName: 'User',
            lastName: 'One',
            role: 'user',
            isActive: true,
            joinedAt: new Date()
          },
          {
            id: 'user-2',
            email: 'user2@example.com',
            firstName: 'User',
            lastName: 'Two',
            role: 'manager',
            isActive: true,
            joinedAt: new Date()
          }
        ],
        pagination: {
          total: 2,
          totalPages: 1,
          currentPage: 1,
          limit: 10
        }
      };

      req.query = { page: '1', limit: '10', role: 'all' };
      mockCompanyService.getCompanyUsers.mockResolvedValue(usersResult);

      await companyController.getCompanyUsers(req as Request, res as Response);

      expect(mockCompanyService.getCompanyUsers).toHaveBeenCalledWith('company-456', {
        page: 1,
        limit: 10,
        role: 'all'
      });
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Company users retrieved successfully',
        data: usersResult
      });
    });
  });

  describe('inviteUser', () => {
    it('should invite user successfully', async () => {
      const inviteData = {
        email: 'newuser@example.com',
        role: 'user',
        sendEmail: true
      };

      const invitation = {
        id: 'invitation-123',
        email: inviteData.email,
        role: inviteData.role,
        companyId: 'company-456',
        invitedBy: 'user-123',
        expiresAt: new Date(),
        createdAt: new Date()
      };

      req.body = inviteData;
      mockCompanyService.inviteUser.mockResolvedValue(invitation);

      await companyController.inviteUser(req as Request, res as Response);

      expect(mockCompanyService.inviteUser).toHaveBeenCalledWith('company-456', {
        ...inviteData,
        invitedBy: 'user-123'
      });
      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'User invited successfully',
        data: { invitation }
      });
    });

    it('should require admin or manager role', async () => {
      req.user!.role = 'user';
      req.body = {
        email: 'test@example.com',
        role: 'user'
      };

      await companyController.inviteUser(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
    });
  });

  describe('bulkInviteUsers', () => {
    it('should bulk invite users successfully', async () => {
      const bulkInviteData = {
        invitations: [
          { email: 'user1@example.com', role: 'user' },
          { email: 'user2@example.com', role: 'manager' }
        ],
        sendEmails: true
      };

      const results = {
        successful: [
          { email: 'user1@example.com', invitationId: 'inv-1' },
          { email: 'user2@example.com', invitationId: 'inv-2' }
        ],
        failed: [],
        summary: {
          total: 2,
          successful: 2,
          failed: 0
        }
      };

      req.body = bulkInviteData;
      mockCompanyService.bulkInviteUsers.mockResolvedValue(results);

      await companyController.bulkInviteUsers(req as Request, res as Response);

      expect(mockCompanyService.bulkInviteUsers).toHaveBeenCalledWith('company-456', {
        ...bulkInviteData,
        invitedBy: 'user-123'
      });
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Bulk invitation completed',
        data: results
      });
    });

    it('should handle partial failures in bulk invite', async () => {
      const bulkInviteData = {
        invitations: [
          { email: 'user1@example.com', role: 'user' },
          { email: 'invalid-email', role: 'user' }
        ],
        sendEmails: true
      };

      const results = {
        successful: [
          { email: 'user1@example.com', invitationId: 'inv-1' }
        ],
        failed: [
          { email: 'invalid-email', error: 'Invalid email format' }
        ],
        summary: {
          total: 2,
          successful: 1,
          failed: 1
        }
      };

      req.body = bulkInviteData;
      mockCompanyService.bulkInviteUsers.mockResolvedValue(results);

      await companyController.bulkInviteUsers(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Bulk invitation completed',
        data: results
      });
    });
  });

  describe('removeUser', () => {
    it('should remove user successfully', async () => {
      req.params = { userId: 'user-456' };
      mockCompanyService.removeUserFromCompany.mockResolvedValue(undefined);

      await companyController.removeUser(req as Request, res as Response);

      expect(mockCompanyService.removeUserFromCompany).toHaveBeenCalledWith(
        'company-456',
        'user-456'
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'User removed from company successfully'
      });
    });

    it('should prevent self-removal', async () => {
      req.params = { userId: 'user-123' }; // Same as req.user.id

      await companyController.removeUser(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Cannot remove yourself from the company'
      });
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const roleData = { role: 'manager' };
      
      const updatedUser = {
        id: 'user-456',
        email: 'user@example.com',
        role: 'manager',
        updatedAt: new Date()
      };

      req.params = { userId: 'user-456' };
      req.body = roleData;
      mockCompanyService.updateUserRole.mockResolvedValue(updatedUser);

      await companyController.updateUserRole(req as Request, res as Response);

      expect(mockCompanyService.updateUserRole).toHaveBeenCalledWith(
        'company-456',
        'user-456',
        'manager'
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'User role updated successfully',
        data: { user: updatedUser }
      });
    });
  });

  describe('getCompanyUsage', () => {
    it('should get company usage statistics', async () => {
      const usage = {
        users: {
          current: 15,
          limit: 25
        },
        storage: {
          current: 2048,
          limit: 5120,
          unit: 'MB'
        },
        apiCalls: {
          current: 1500,
          limit: 10000,
          period: 'monthly'
        },
        features: {
          used: ['feature1', 'feature2'],
          available: ['feature1', 'feature2', 'feature3']
        }
      };

      req.query = { period: 'monthly' };
      mockCompanyService.getCompanyUsage.mockResolvedValue(usage);

      await companyController.getCompanyUsage(req as Request, res as Response);

      expect(mockCompanyService.getCompanyUsage).toHaveBeenCalledWith('company-456', 'monthly');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Company usage retrieved successfully',
        data: { usage }
      });
    });
  });

  describe('updatePlan', () => {
    it('should update plan successfully', async () => {
      const planData = {
        plan: 'enterprise',
        billingCycle: 'annual'
      };

      const updatedCompany = {
        id: 'company-456',
        name: 'Test Company',
        plan: 'enterprise',
        billingCycle: 'annual',
        updatedAt: new Date()
      };

      req.body = planData;
      mockCompanyService.updatePlan.mockResolvedValue(updatedCompany);

      await companyController.updatePlan(req as Request, res as Response);

      expect(mockCompanyService.updatePlan).toHaveBeenCalledWith('company-456', planData);
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Plan updated successfully',
        data: { company: updatedCompany }
      });
    });

    it('should require admin role for plan updates', async () => {
      req.user!.role = 'manager';
      req.body = { plan: 'enterprise' };

      await companyController.updatePlan(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
    });
  });

  describe('getSettings', () => {
    it('should get company settings', async () => {
      const settings = {
        general: {
          timezone: 'UTC',
          dateFormat: 'YYYY-MM-DD',
          language: 'en'
        },
        security: {
          passwordPolicy: 'strong',
          mfaRequired: false,
          sessionTimeout: 30
        },
        features: {
          enabledFeatures: ['feature1', 'feature2'],
          featureFlags: {
            'new-ui': true,
            'beta-features': false
          }
        }
      };

      mockCompanyService.getCompanySettings.mockResolvedValue(settings);

      await companyController.getSettings(req as Request, res as Response);

      expect(mockCompanyService.getCompanySettings).toHaveBeenCalledWith('company-456');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Company settings retrieved successfully',
        data: { settings }
      });
    });
  });

  describe('updateSettings', () => {
    it('should update company settings successfully', async () => {
      const settingsData = {
        general: {
          timezone: 'America/New_York',
          dateFormat: 'MM/DD/YYYY'
        },
        security: {
          mfaRequired: true,
          sessionTimeout: 60
        }
      };

      const updatedSettings = {
        ...settingsData,
        updatedAt: new Date(),
        updatedBy: 'user-123'
      };

      req.body = settingsData;
      mockCompanyService.updateCompanySettings.mockResolvedValue(updatedSettings);

      await companyController.updateSettings(req as Request, res as Response);

      expect(mockCompanyService.updateCompanySettings).toHaveBeenCalledWith(
        'company-456',
        settingsData
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Company settings updated successfully',
        data: { settings: updatedSettings }
      });
    });
  });

  describe('toggleFeature', () => {
    it('should toggle feature successfully', async () => {
      const featureData = {
        featureName: 'new-ui',
        enabled: true
      };

      const result = {
        featureName: 'new-ui',
        enabled: true,
        updatedAt: new Date()
      };

      req.body = featureData;
      mockCompanyService.toggleFeature.mockResolvedValue(result);

      await companyController.toggleFeature(req as Request, res as Response);

      expect(mockCompanyService.toggleFeature).toHaveBeenCalledWith(
        'company-456',
        'new-ui',
        true
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Feature toggled successfully',
        data: result
      });
    });

    it('should require admin role for feature toggles', async () => {
      req.user!.role = 'user';
      req.body = { featureName: 'feature1', enabled: false };

      await companyController.toggleFeature(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
    });
  });

  describe('getCompanyFeatures', () => {
    it('should get company features successfully', async () => {
      const features = {
        available: [
          {
            name: 'feature1',
            enabled: true,
            description: 'Feature 1 description'
          },
          {
            name: 'feature2',
            enabled: false,
            description: 'Feature 2 description'
          }
        ],
        plan: 'professional',
        limits: {
          users: 25,
          storage: 5120,
          apiCalls: 10000
        }
      };

      mockFeatureFlagService.getCompanyFeatures.mockResolvedValue(features);

      await companyController.getCompanyFeatures(req as Request, res as Response);

      expect(mockFeatureFlagService.getCompanyFeatures).toHaveBeenCalledWith('company-456');
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Company features retrieved successfully',
        data: features
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockCompanyService.getCompanyById.mockRejectedValue(new Error('Database error'));

      await companyController.getCompany(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve company information'
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      req.body = {
        name: '',  // Invalid: empty name
        invalidField: 'should not be here'
      };

      const mockValidate = jest.fn().mockResolvedValue([
        {
          property: 'name',
          constraints: { isNotEmpty: 'Company name is required' }
        }
      ]);

      jest.doMock('class-validator', () => ({
        validate: mockValidate,
        plainToInstance: jest.fn().mockReturnValue(req.body)
      }));

      await companyController.updateCompany(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.stringContaining('Company name is required')
        ])
      });
    });
  });
});