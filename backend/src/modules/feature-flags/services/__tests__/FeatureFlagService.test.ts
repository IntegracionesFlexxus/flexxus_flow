/**
 * Feature Flag Service Tests - Sprint 2
 * Siguiendo lineamientos nivel 2: tests críticos para funcionalidad core
 */

import 'reflect-metadata';
import { FeatureFlagService } from '@/modules/feature-flags/services/FeatureFlagService';
import { IFeatureFlagRepository, FeatureFlag } from '@/modules/feature-flags/interfaces/IFeatureFlagRepository';
import { ICacheService } from '@/interfaces/IServices';
import { Logger } from 'winston';

// Mock dependencies
const mockRepository = {
  create: jest.fn(),
  findByCompany: jest.fn(),
  findByName: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  updateById: jest.fn(),
  delete: jest.fn(),
  deleteById: jest.fn(),
  findWithFilters: jest.fn(),
  getCompanyStats: jest.fn(),
  findExpiringFlags: jest.fn(),
  cloneToEnvironment: jest.fn(),
  getChangeHistory: jest.fn(),
  bulkToggle: jest.fn(),
  cleanupExpired: jest.fn()
} as jest.Mocked<IFeatureFlagRepository>;

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  deletePattern: jest.fn(),
  size: jest.fn(),
  clear: jest.fn()
} as jest.Mocked<ICacheService>;

const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
} as unknown as Logger;

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;

  const mockFlag: FeatureFlag = {
    id: 'flag-123',
    companyId: 'company-456',
    featureName: 'test_feature',
    enabled: true,
    config: { maxUsers: 100 },
    rolloutPercentage: 50,
    rolloutRules: { roles: ['admin'] },
    environment: 'production',
    description: 'Test feature',
    category: 'ui',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockContext = {
    userId: 'user-789',
    companyId: 'company-456',
    userRole: 'admin',
    environment: 'production',
    userAttributes: { role: 'admin' }
  };

  beforeEach(() => {
    service = new FeatureFlagService(mockRepository, mockCacheService, mockLogger);
    jest.clearAllMocks();
  });

  describe('isEnabled', () => {
    it('should return enabled true when all conditions are met', async () => {
      mockCacheService.get.mockResolvedValue(null); // Cache miss
      mockRepository.findByCompany.mockResolvedValue([mockFlag]);
      mockCacheService.set.mockResolvedValue();

      const result = await service.isEnabled('test_feature', mockContext);

      expect(result.enabled).toBe(true);
      expect(result.flag).toEqual(mockFlag);
      expect(result.reason).toContain('enabled and user matches criteria');
      expect(typeof result.evaluationTime).toBe('number');
    });

    it('should return enabled false when feature flag not found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.findByCompany.mockResolvedValue([]);
      
      const result = await service.isEnabled('nonexistent_feature', mockContext);

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('Feature flag not found');
      expect(result.flag).toBeUndefined();
    });

    it('should return enabled false when feature flag is disabled', async () => {
      const disabledFlag = { ...mockFlag, enabled: false };
      mockCacheService.get.mockResolvedValue([disabledFlag]);
      
      const result = await service.isEnabled('test_feature', mockContext);

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('Feature flag disabled');
      expect(result.flag).toEqual(disabledFlag);
    });

    it('should respect rollout percentage', async () => {
      // Create a flag with 0% rollout
      const zeroRolloutFlag = { ...mockFlag, rolloutPercentage: 0 };
      mockCacheService.get.mockResolvedValue([zeroRolloutFlag]);
      
      const result = await service.isEnabled('test_feature', mockContext);

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('User not in rollout percentage');
    });

    it('should respect rollout rules - roles', async () => {
      const restrictedFlag = { 
        ...mockFlag, 
        rolloutRules: { roles: ['superadmin'] } 
      };
      mockCacheService.get.mockResolvedValue([restrictedFlag]);
      
      const userContext = { ...mockContext, userRole: 'user' };
      const result = await service.isEnabled('test_feature', userContext);

      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('User does not match rollout rules');
    });

    it('should handle time constraints - not started', async () => {
      const futureFlag = { 
        ...mockFlag, 
        startsAt: new Date(Date.now() + 86400000) // Tomorrow
      };
      mockCacheService.get.mockResolvedValue([futureFlag]);
      
      const result = await service.isEnabled('test_feature', mockContext);

      expect(result.enabled).toBe(false);
      expect(result.reason).toContain('time constraints');
    });

    it('should handle time constraints - expired', async () => {
      const expiredFlag = { 
        ...mockFlag, 
        expiresAt: new Date(Date.now() - 86400000) // Yesterday
      };
      mockCacheService.get.mockResolvedValue([expiredFlag]);
      
      const result = await service.isEnabled('test_feature', mockContext);

      expect(result.enabled).toBe(false);
      expect(result.reason).toContain('time constraints');
    });

    it('should use cache when available', async () => {
      mockCacheService.get.mockResolvedValue([mockFlag]);
      
      const result = await service.isEnabled('test_feature', mockContext);

      expect(result.enabled).toBe(true);
      expect(mockRepository.findByCompany).not.toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should handle evaluation errors gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));
      mockRepository.findByCompany.mockRejectedValue(new Error('Database error'));
      
      const result = await service.isEnabled('test_feature', mockContext);

      expect(result.enabled).toBe(false);
      expect(result.reason).toContain('Evaluation error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getFeatureConfig', () => {
    it('should return config when feature is enabled', async () => {
      mockCacheService.get.mockResolvedValue([mockFlag]);
      
      const result = await service.getFeatureConfig('test_feature', mockContext);

      expect(result).not.toBeNull();
      expect(result!.enabled).toBe(true);
      expect(result!.config).toEqual(mockFlag.config);
      expect(result!.metadata.rolloutPercentage).toBe(50);
    });

    it('should return null when feature is disabled', async () => {
      const disabledFlag = { ...mockFlag, enabled: false };
      mockCacheService.get.mockResolvedValue([disabledFlag]);
      
      const result = await service.getFeatureConfig('test_feature', mockContext);

      expect(result).toBeNull();
    });

    it('should return typed config', async () => {
      interface TestConfig {
        maxUsers: number;
        theme: string;
      }

      const typedFlag = {
        ...mockFlag,
        config: { maxUsers: 100, theme: 'dark' }
      };
      mockCacheService.get.mockResolvedValue([typedFlag]);
      
      const result = await service.getFeatureConfig<TestConfig>('test_feature', mockContext);

      expect(result!.config.maxUsers).toBe(100);
      expect(result!.config.theme).toBe('dark');
    });
  });

  describe('evaluateMultiple', () => {
    it('should evaluate multiple feature flags concurrently', async () => {
      const flag2 = { ...mockFlag, featureName: 'feature2', enabled: false };
      mockCacheService.get.mockResolvedValue([mockFlag, flag2]);
      
      const result = await service.evaluateMultiple(
        ['test_feature', 'feature2'], 
        mockContext
      );

      expect(result.test_feature).toBe(true);
      expect(result.feature2).toBe(false);
    });

    it('should handle partial failures gracefully', async () => {
      mockCacheService.get.mockResolvedValue([mockFlag]);
      // Second evaluation will fail because flag not found
      
      const result = await service.evaluateMultiple(
        ['test_feature', 'nonexistent'], 
        mockContext
      );

      expect(result.test_feature).toBe(true);
      expect(result.nonexistent).toBe(false);
    });
  });

  describe('createFeatureFlag', () => {
    it('should create feature flag and invalidate cache', async () => {
      const newFlagData = {
        companyId: 'company-456',
        featureName: 'new_feature',
        enabled: true,
        environment: 'production'
      };

      mockRepository.create.mockResolvedValue({ ...mockFlag, ...newFlagData });
      mockCacheService.delete.mockResolvedValue();

      const result = await service.createFeatureFlag(newFlagData);

      expect(result.featureName).toBe('new_feature');
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...newFlagData,
        config: {},
        rolloutPercentage: 100,
        rolloutRules: {}
      });
      expect(mockCacheService.delete).toHaveBeenCalled();
    });

    it('should handle creation errors', async () => {
      const newFlagData = {
        companyId: 'company-456',
        featureName: 'new_feature',
        enabled: true,
        environment: 'production'
      };

      mockRepository.create.mockRejectedValue(new Error('Creation failed'));

      await expect(service.createFeatureFlag(newFlagData))
        .rejects
        .toThrow('Failed to create feature flag');

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateFeatureFlag', () => {
    it('should update feature flag and invalidate cache', async () => {
      const updates = { enabled: false, rolloutPercentage: 25 };
      const updatedFlag = { ...mockFlag, ...updates };

      mockRepository.update.mockResolvedValue(updatedFlag);
      mockCacheService.delete.mockResolvedValue();

      const result = await service.updateFeatureFlag(
        'company-456',
        'test_feature',
        updates
      );

      expect(result.enabled).toBe(false);
      expect(result.rolloutPercentage).toBe(25);
      expect(mockRepository.update).toHaveBeenCalledWith(
        'company-456',
        'test_feature',
        updates,
        'production'
      );
      expect(mockCacheService.delete).toHaveBeenCalled();
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache for specific company and environment', async () => {
      mockCacheService.delete.mockResolvedValue();

      await service.invalidateCache('company-456', 'production');

      expect(mockCacheService.delete).toHaveBeenCalledWith('ff:company-456:production');
    });

    it('should invalidate all environments for company when no environment specified', async () => {
      mockCacheService.deletePattern.mockResolvedValue();

      await service.invalidateCache('company-456');

      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('ff:company-456:*');
    });

    it('should handle cache invalidation errors gracefully', async () => {
      mockCacheService.delete.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await service.invalidateCache('company-456', 'production');

      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      mockCacheService.size.mockResolvedValue(10);

      const health = await service.healthCheck();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('cacheSize');
      expect(health).toHaveProperty('avgEvaluationTime');
      expect(health).toHaveProperty('errorRate');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('getAllFlags', () => {
    it('should return all flags with simple evaluation when no context', async () => {
      const flags = [
        mockFlag,
        { ...mockFlag, featureName: 'feature2', enabled: false }
      ];
      mockCacheService.get.mockResolvedValue(flags);

      const result = await service.getAllFlags('company-456');

      expect(result.test_feature).toBe(true);
      expect(result.feature2).toBe(false);
    });

    it('should return evaluated flags with full context', async () => {
      const flags = [mockFlag];
      mockCacheService.get.mockResolvedValue(flags);

      const result = await service.getAllFlags(
        'company-456', 
        'production', 
        { 
          userId: 'user-789', 
          userRole: 'admin' 
        }
      );

      expect(result.test_feature).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));
      mockRepository.findByCompany.mockRejectedValue(new Error('DB error'));

      const result = await service.getAllFlags('company-456');

      expect(result).toEqual({});
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});