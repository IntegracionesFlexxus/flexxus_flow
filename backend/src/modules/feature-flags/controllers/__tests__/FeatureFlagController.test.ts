/**
 * FeatureFlagController Tests - Sprint 2
 * Siguiendo lineamientos nivel 2: tests críticos para controllers API
 */

import 'reflect-metadata';
import { Request, Response } from 'express';
import { FeatureFlagController } from '@/modules/feature-flags/controllers/FeatureFlagController';
import { IFeatureFlagService } from '@/modules/feature-flags/interfaces/IFeatureFlagService';
import { Logger } from 'winston';

// Mock dependencies
const mockFeatureFlagService = {
  createFeatureFlag: jest.fn(),
  updateFeatureFlag: jest.fn(),
  deleteFeatureFlag: jest.fn(),
  getFeatureFlag: jest.fn(),
  getAllFeatureFlags: jest.fn(),
  evaluateFeatureFlag: jest.fn(),
  bulkToggleFeatureFlags: jest.fn(),
  cloneFeatureFlagsToEnvironment: jest.fn(),
  getFeatureFlagAnalytics: jest.fn(),
  getFeatureFlagHistory: jest.fn(),
  validateFeatureFlagAccess: jest.fn()
} as jest.Mocked<IFeatureFlagService>;

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
} as unknown as Logger;

describe('FeatureFlagController', () => {
  let featureFlagController: FeatureFlagController;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    featureFlagController = new FeatureFlagController(mockFeatureFlagService, mockLogger);

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

  describe('createFeatureFlag', () => {
    it('should create feature flag successfully', async () => {
      const flagData = {
        featureName: 'new-dashboard',
        description: 'New dashboard UI',
        enabled: true,
        environment: 'development' as const,
        category: 'ui' as const,
        rolloutPercentage: 50,
        rolloutRules: {
          roles: ['admin', 'beta-tester'],
          userAttributes: { premium: true }
        }
      };

      const createdFlag = {
        id: 'flag-123',
        ...flagData,
        companyId: 'company-456',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      req.body = flagData;
      mockFeatureFlagService.createFeatureFlag.mockResolvedValue(createdFlag);

      await featureFlagController.createFeatureFlag(req as Request, res as Response);

      expect(mockFeatureFlagService.createFeatureFlag).toHaveBeenCalledWith({
        ...flagData,
        companyId: 'company-456',
        createdBy: 'user-123'
      });
      expect(statusSpy).toHaveBeenCalledWith(201);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Feature flag created successfully',
        data: { featureFlag: createdFlag }
      });
    });

    it('should require admin role', async () => {
      req.user!.role = 'user';
      req.body = {
        featureName: 'test-feature',
        enabled: true,
        environment: 'development'
      };

      await featureFlagController.createFeatureFlag(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions. Admin role required.'
      });
      expect(mockFeatureFlagService.createFeatureFlag).not.toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      req.body = {
        featureName: '',  // Invalid: empty name
        enabled: 'invalid', // Invalid: should be boolean
        environment: 'invalid' // Invalid: not in enum
      };

      const mockValidate = jest.fn().mockResolvedValue([
        {
          property: 'featureName',
          constraints: { length: 'Feature name must be between 2 and 100 characters' }
        },
        {
          property: 'enabled',
          constraints: { isBoolean: 'Enabled status must be boolean' }
        },
        {
          property: 'environment',
          constraints: { isEnum: 'Environment must be one of: development, staging, production' }
        }
      ]);

      jest.doMock('class-validator', () => ({
        validate: mockValidate,
        plainToInstance: jest.fn().mockReturnValue(req.body)
      }));

      await featureFlagController.createFeatureFlag(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Validation failed',
        errors: expect.arrayContaining([
          expect.stringContaining('Feature name must be between 2 and 100 characters'),
          expect.stringContaining('Enabled status must be boolean'),
          expect.stringContaining('Environment must be one of')
        ])
      });
    });
  });

  describe('getFeatureFlags', () => {
    it('should get all feature flags with filters', async () => {
      const flags = {
        flags: [
          {
            id: 'flag-1',
            featureName: 'feature-one',
            description: 'First feature',
            enabled: true,
            environment: 'production',
            category: 'ui',
            rolloutPercentage: 100,
            createdAt: new Date()
          },
          {
            id: 'flag-2',
            featureName: 'feature-two',
            description: 'Second feature',
            enabled: false,
            environment: 'development',
            category: 'api',
            rolloutPercentage: 0,
            createdAt: new Date()
          }
        ],
        pagination: {
          total: 2,
          totalPages: 1,
          currentPage: 1,
          limit: 10
        },
        filters: {
          environment: 'all',
          category: 'all',
          enabled: 'all'
        }
      };

      req.query = {
        page: '1',
        limit: '10',
        environment: 'all',
        category: 'all',
        enabled: 'all',
        search: ''
      };

      mockFeatureFlagService.getAllFeatureFlags.mockResolvedValue(flags);

      await featureFlagController.getFeatureFlags(req as Request, res as Response);

      expect(mockFeatureFlagService.getAllFeatureFlags).toHaveBeenCalledWith('company-456', {
        page: 1,
        limit: 10,
        environment: 'all',
        category: 'all',
        enabled: 'all',
        search: ''
      });
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Feature flags retrieved successfully',
        data: flags
      });
    });

    it('should handle empty results', async () => {
      const emptyResult = {
        flags: [],
        pagination: { total: 0, totalPages: 0, currentPage: 1, limit: 10 },
        filters: { environment: 'all', category: 'all', enabled: 'all' }
      };

      mockFeatureFlagService.getAllFeatureFlags.mockResolvedValue(emptyResult);

      await featureFlagController.getFeatureFlags(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Feature flags retrieved successfully',
        data: emptyResult
      });
    });
  });

  describe('getFeatureFlag', () => {
    it('should get feature flag by name successfully', async () => {
      const flag = {
        id: 'flag-123',
        featureName: 'test-feature',
        description: 'Test feature description',
        enabled: true,
        environment: 'production',
        category: 'ui',
        rolloutPercentage: 75,
        rolloutRules: {
          roles: ['admin'],
          userAttributes: { plan: 'premium' }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      req.params = { featureName: 'test-feature' };
      req.query = { environment: 'production' };

      mockFeatureFlagService.getFeatureFlag.mockResolvedValue(flag);

      await featureFlagController.getFeatureFlag(req as Request, res as Response);

      expect(mockFeatureFlagService.getFeatureFlag).toHaveBeenCalledWith(
        'test-feature',
        'company-456',
        'production'
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Feature flag retrieved successfully',
        data: { featureFlag: flag }
      });
    });

    it('should handle feature flag not found', async () => {
      req.params = { featureName: 'nonexistent-feature' };
      req.query = { environment: 'production' };

      mockFeatureFlagService.getFeatureFlag.mockResolvedValue(null);

      await featureFlagController.getFeatureFlag(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(404);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Feature flag not found'
      });
    });
  });

  describe('updateFeatureFlag', () => {
    it('should update feature flag successfully', async () => {
      const updateData = {
        description: 'Updated description',
        enabled: false,
        rolloutPercentage: 25,
        rolloutRules: {
          roles: ['admin', 'manager']
        }
      };

      const updatedFlag = {
        id: 'flag-123',
        featureName: 'test-feature',
        description: 'Updated description',
        enabled: false,
        environment: 'production',
        rolloutPercentage: 25,
        rolloutRules: updateData.rolloutRules,
        updatedAt: new Date()
      };

      req.params = { featureName: 'test-feature' };
      req.body = updateData;

      mockFeatureFlagService.updateFeatureFlag.mockResolvedValue(updatedFlag);

      await featureFlagController.updateFeatureFlag(req as Request, res as Response);

      expect(mockFeatureFlagService.updateFeatureFlag).toHaveBeenCalledWith(
        'test-feature',
        'company-456',
        updateData
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Feature flag updated successfully',
        data: { featureFlag: updatedFlag }
      });
    });

    it('should require admin role for updates', async () => {
      req.user!.role = 'manager';
      req.params = { featureName: 'test-feature' };
      req.body = { enabled: false };

      await featureFlagController.updateFeatureFlag(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions. Admin role required.'
      });
    });
  });

  describe('deleteFeatureFlag', () => {
    it('should delete feature flag successfully', async () => {
      req.params = { featureName: 'test-feature' };
      req.query = { environment: 'development' };

      mockFeatureFlagService.deleteFeatureFlag.mockResolvedValue(undefined);

      await featureFlagController.deleteFeatureFlag(req as Request, res as Response);

      expect(mockFeatureFlagService.deleteFeatureFlag).toHaveBeenCalledWith(
        'test-feature',
        'company-456',
        'development'
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Feature flag deleted successfully'
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Feature flag deleted',
        expect.objectContaining({
          featureName: 'test-feature',
          environment: 'development',
          companyId: 'company-456',
          deletedBy: 'user-123'
        })
      );
    });
  });

  describe('evaluateFeatureFlag', () => {
    it('should evaluate feature flag successfully', async () => {
      const evaluationContext = {
        featureName: 'test-feature',
        userId: 'user-789',
        userRole: 'admin',
        userAttributes: { plan: 'premium' },
        environment: 'production'
      };

      const evaluation = {
        featureName: 'test-feature',
        enabled: true,
        reason: 'User matches rollout criteria',
        evaluationContext,
        timestamp: new Date()
      };

      req.body = evaluationContext;
      mockFeatureFlagService.evaluateFeatureFlag.mockResolvedValue(evaluation);

      await featureFlagController.evaluateFeatureFlag(req as Request, res as Response);

      expect(mockFeatureFlagService.evaluateFeatureFlag).toHaveBeenCalledWith(
        'test-feature',
        'company-456',
        {
          userId: 'user-789',
          userRole: 'admin',
          userAttributes: { plan: 'premium' },
          environment: 'production',
          companyId: 'company-456'
        }
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Feature flag evaluated successfully',
        data: evaluation
      });
    });

    it('should use current user context when not provided', async () => {
      req.body = {
        featureName: 'test-feature',
        environment: 'production'
      };

      const evaluation = {
        featureName: 'test-feature',
        enabled: false,
        reason: 'Feature disabled for user role',
        timestamp: new Date()
      };

      mockFeatureFlagService.evaluateFeatureFlag.mockResolvedValue(evaluation);

      await featureFlagController.evaluateFeatureFlag(req as Request, res as Response);

      expect(mockFeatureFlagService.evaluateFeatureFlag).toHaveBeenCalledWith(
        'test-feature',
        'company-456',
        {
          userId: 'user-123',
          userRole: 'admin',
          userAttributes: undefined,
          environment: 'production',
          companyId: 'company-456'
        }
      );
    });
  });

  describe('bulkToggleFeatureFlags', () => {
    it('should bulk toggle feature flags successfully', async () => {
      const bulkData = {
        featureNames: ['feature-1', 'feature-2'],
        enabled: false,
        environment: 'staging',
        reason: 'Disabling for maintenance'
      };

      const results = {
        successful: [
          { featureName: 'feature-1', enabled: false },
          { featureName: 'feature-2', enabled: false }
        ],
        failed: [],
        summary: {
          total: 2,
          successful: 2,
          failed: 0
        }
      };

      req.body = bulkData;
      mockFeatureFlagService.bulkToggleFeatureFlags.mockResolvedValue(results);

      await featureFlagController.bulkToggleFeatureFlags(req as Request, res as Response);

      expect(mockFeatureFlagService.bulkToggleFeatureFlags).toHaveBeenCalledWith(
        'company-456',
        bulkData
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Bulk toggle operation completed',
        data: results
      });
    });

    it('should handle partial failures in bulk operations', async () => {
      const bulkData = {
        featureNames: ['feature-1', 'nonexistent-feature'],
        enabled: true,
        environment: 'production'
      };

      const results = {
        successful: [
          { featureName: 'feature-1', enabled: true }
        ],
        failed: [
          { featureName: 'nonexistent-feature', error: 'Feature flag not found' }
        ],
        summary: {
          total: 2,
          successful: 1,
          failed: 1
        }
      };

      req.body = bulkData;
      mockFeatureFlagService.bulkToggleFeatureFlags.mockResolvedValue(results);

      await featureFlagController.bulkToggleFeatureFlags(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Bulk toggle operation completed',
        data: results
      });
    });
  });

  describe('cloneToEnvironment', () => {
    it('should clone feature flags to environment successfully', async () => {
      const cloneData = {
        sourceEnvironment: 'staging' as const,
        targetEnvironment: 'production' as const,
        featureNames: ['feature-1', 'feature-2'],
        overwriteExisting: true
      };

      const results = {
        cloned: [
          { featureName: 'feature-1', success: true },
          { featureName: 'feature-2', success: true }
        ],
        failed: [],
        summary: {
          total: 2,
          successful: 2,
          failed: 0
        }
      };

      req.body = cloneData;
      mockFeatureFlagService.cloneFeatureFlagsToEnvironment.mockResolvedValue(results);

      await featureFlagController.cloneToEnvironment(req as Request, res as Response);

      expect(mockFeatureFlagService.cloneFeatureFlagsToEnvironment).toHaveBeenCalledWith(
        'company-456',
        cloneData
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Feature flags cloned successfully',
        data: results
      });
    });
  });

  describe('getAnalytics', () => {
    it('should get feature flag analytics successfully', async () => {
      const analytics = {
        featureName: 'test-feature',
        environment: 'production',
        period: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          granularity: 'daily'
        },
        metrics: {
          evaluations: [
            { date: '2024-01-01', count: 150 },
            { date: '2024-01-02', count: 175 }
          ],
          enabled_count: [
            { date: '2024-01-01', count: 120 },
            { date: '2024-01-02', count: 140 }
          ],
          unique_users: [
            { date: '2024-01-01', count: 45 },
            { date: '2024-01-02', count: 52 }
          ]
        },
        summary: {
          totalEvaluations: 325,
          enabledPercentage: 80.6,
          uniqueUsers: 97
        }
      };

      req.params = { featureName: 'test-feature' };
      req.query = {
        environment: 'production',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        granularity: 'daily'
      };

      mockFeatureFlagService.getFeatureFlagAnalytics.mockResolvedValue(analytics);

      await featureFlagController.getAnalytics(req as Request, res as Response);

      expect(mockFeatureFlagService.getFeatureFlagAnalytics).toHaveBeenCalledWith(
        'test-feature',
        'company-456',
        {
          environment: 'production',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          granularity: 'daily',
          metrics: ['evaluations', 'enabled_count', 'disabled_count']
        }
      );
      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: true,
        message: 'Feature flag analytics retrieved successfully',
        data: analytics
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockFeatureFlagService.getAllFeatureFlags.mockRejectedValue(new Error('Database error'));

      await featureFlagController.getFeatureFlags(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(500);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve feature flags'
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error in getFeatureFlags',
        expect.objectContaining({
          error: 'Database error',
          companyId: 'company-456',
          userId: 'user-123'
        })
      );
    });

    it('should require authentication', async () => {
      req.user = undefined;

      await featureFlagController.getFeatureFlags(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required'
      });
    });

    it('should handle feature flag access validation', async () => {
      req.params = { featureName: 'restricted-feature' };
      
      mockFeatureFlagService.validateFeatureFlagAccess.mockResolvedValue(false);

      await featureFlagController.getFeatureFlag(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Access denied to feature flag'
      });
    });
  });

  describe('Permission Checks', () => {
    it('should allow managers to read feature flags', async () => {
      req.user!.role = 'manager';

      const flags = {
        flags: [],
        pagination: { total: 0, totalPages: 0, currentPage: 1, limit: 10 },
        filters: {}
      };

      mockFeatureFlagService.getAllFeatureFlags.mockResolvedValue(flags);

      await featureFlagController.getFeatureFlags(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(200);
      expect(mockFeatureFlagService.getAllFeatureFlags).toHaveBeenCalled();
    });

    it('should deny users from reading feature flags', async () => {
      req.user!.role = 'user';

      await featureFlagController.getFeatureFlags(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions'
      });
    });

    it('should deny non-admins from modifying feature flags', async () => {
      req.user!.role = 'manager';
      req.params = { featureName: 'test-feature' };
      req.body = { enabled: false };

      await featureFlagController.updateFeatureFlag(req as Request, res as Response);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        message: 'Insufficient permissions. Admin role required.'
      });
    });
  });
});