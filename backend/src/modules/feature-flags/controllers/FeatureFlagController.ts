/**
 * Feature Flag Controller - Sprint 2
 * Siguiendo lineamientos nivel 2: controlador administrativo para gestión de feature flags
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { TYPES } from '@/container/types';
import { IFeatureFlagService } from '@/modules/feature-flags/interfaces/IFeatureFlagService';
import { environment } from '@/config/environment';
import { 
  CreateFeatureFlagDto, 
  UpdateFeatureFlagDto, 
  EvaluateFeatureFlagDto,
  BulkFeatureFlagDto,
  CloneFeatureFlagDto,
  FeatureFlagAnalyticsDto 
} from '@/shared/validators/featureFlag.validators';

@injectable()
export class FeatureFlagController {
  constructor(
    @inject(TYPES.FeatureFlagService) private featureFlagService: IFeatureFlagService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Get all feature flags for company
   * GET /api/feature-flags
   */
  getFeatureFlags = async (req: Request, res: Response): Promise<void> => {
    try {
      // Require authentication
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const environment = req.query.environment as string || 'production';
      const category = req.query.category as string;
      const enabled = req.query.enabled === 'true' ? true : 
                     req.query.enabled === 'false' ? false : undefined;

      // Get feature flags with context
      const flags = await this.featureFlagService.getAllFlags(
        req.user.companyId,
        environment,
        {
          userId: req.user.id,
          userRole: req.user.role
        }
      );

      // If admin/manager, get additional flag details
      let flagDetails = null;
      if (['admin', 'manager'].includes(req.user.role)) {
        flagDetails = await this.featureFlagService.getCompanyFlags(
          req.user.companyId,
          {
            environment,
            category,
            enabled
          }
        );
      }

      res.status(200).json({
        success: true,
        data: {
          flags,
          details: flagDetails,
          context: {
            environment,
            userId: req.user.id,
            userRole: req.user.role,
            companyId: req.user.companyId
          }
        }
      });

    } catch (error) {
      this.logger.error('Get feature flags error', {
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
   * Get specific feature flag
   * GET /api/feature-flags/:featureName
   */
  getFeatureFlag = async (req: Request, res: Response): Promise<void> => {
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
          message: 'Admin or Manager role required'
        });
        return;
      }

      const featureName = req.params.featureName;
      const environment = req.query.environment as string || 'production';

      // Get feature flag details
      const flag = await this.featureFlagService.getFeatureFlag(
        req.user.companyId,
        featureName,
        environment
      );

      if (!flag) {
        res.status(404).json({
          success: false,
          message: 'Feature flag not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          flag: {
            id: flag.id,
            featureName: flag.featureName,
            description: flag.description,
            enabled: flag.enabled,
            config: flag.config,
            rolloutPercentage: flag.rolloutPercentage,
            rolloutRules: flag.rolloutRules,
            environment: flag.environment,
            category: flag.category,
            startsAt: flag.startsAt,
            expiresAt: flag.expiresAt,
            createdAt: flag.createdAt,
            updatedAt: flag.updatedAt
          }
        }
      });

    } catch (error) {
      this.logger.error('Get feature flag error', {
        error: error.message,
        featureName: req.params.featureName,
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
   * Create new feature flag
   * POST /api/feature-flags
   */
  createFeatureFlag = async (req: Request, res: Response): Promise<void> => {
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
          message: 'Admin role required'
        });
        return;
      }

      // Validate input
      const createDto = plainToInstance(CreateFeatureFlagDto, req.body);
      const errors = await validate(createDto);

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

      // Check if feature flag already exists
      const existingFlag = await this.featureFlagService.getFeatureFlag(
        req.user.companyId,
        createDto.featureName,
        createDto.environment
      );

      if (existingFlag) {
        res.status(400).json({
          success: false,
          message: `Feature flag '${createDto.featureName}' already exists in ${createDto.environment} environment`
        });
        return;
      }

      // Create feature flag
      const flag = await this.featureFlagService.createFeatureFlag({
        companyId: req.user.companyId,
        featureName: createDto.featureName,
        description: createDto.description,
        enabled: createDto.enabled,
        config: createDto.config || {},
        rolloutPercentage: createDto.rolloutPercentage || 100,
        rolloutRules: createDto.rolloutRules || {},
        environment: createDto.environment,
        category: createDto.category,
        startsAt: createDto.startsAt,
        expiresAt: createDto.expiresAt
      });

      this.logger.info('Feature flag created', {
        flagId: flag.id,
        featureName: createDto.featureName,
        environment: createDto.environment,
        enabled: createDto.enabled,
        companyId: req.user.companyId,
        createdBy: req.user.id
      });

      res.status(201).json({
        success: true,
        message: 'Feature flag created successfully',
        data: {
          flag: {
            id: flag.id,
            featureName: flag.featureName,
            description: flag.description,
            enabled: flag.enabled,
            environment: flag.environment,
            category: flag.category,
            createdAt: flag.createdAt
          }
        }
      });

    } catch (error) {
      this.logger.error('Create feature flag error', {
        error: error.message,
        featureName: req.body?.featureName,
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
   * Update feature flag
   * PUT /api/feature-flags/:featureName
   */
  updateFeatureFlag = async (req: Request, res: Response): Promise<void> => {
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
          message: 'Admin or Manager role required'
        });
        return;
      }

      const featureName = req.params.featureName;
      const environment = req.query.environment as string || 'production';

      // Validate input
      const updateDto = plainToInstance(UpdateFeatureFlagDto, req.body);
      const errors = await validate(updateDto);

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

      // Update feature flag
      const updatedFlag = await this.featureFlagService.updateFeatureFlag(
        req.user.companyId,
        featureName,
        updateDto,
        environment
      );

      if (!updatedFlag) {
        res.status(404).json({
          success: false,
          message: 'Feature flag not found'
        });
        return;
      }

      this.logger.info('Feature flag updated', {
        featureName,
        environment,
        updatedFields: Object.keys(updateDto),
        companyId: req.user.companyId,
        updatedBy: req.user.id
      });

      res.status(200).json({
        success: true,
        message: 'Feature flag updated successfully',
        data: {
          flag: {
            id: updatedFlag.id,
            featureName: updatedFlag.featureName,
            description: updatedFlag.description,
            enabled: updatedFlag.enabled,
            config: updatedFlag.config,
            rolloutPercentage: updatedFlag.rolloutPercentage,
            rolloutRules: updatedFlag.rolloutRules,
            environment: updatedFlag.environment,
            category: updatedFlag.category,
            updatedAt: updatedFlag.updatedAt
          }
        }
      });

    } catch (error) {
      this.logger.error('Update feature flag error', {
        error: error.message,
        featureName: req.params.featureName,
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
   * Delete feature flag
   * DELETE /api/feature-flags/:featureName
   */
  deleteFeatureFlag = async (req: Request, res: Response): Promise<void> => {
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
          message: 'Admin role required'
        });
        return;
      }

      const featureName = req.params.featureName;
      const environment = req.query.environment as string || 'production';

      // Delete feature flag
      const deleted = await this.featureFlagService.deleteFeatureFlag(
        req.user.companyId,
        featureName,
        environment
      );

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Feature flag not found'
        });
        return;
      }

      this.logger.warn('Feature flag deleted', {
        featureName,
        environment,
        companyId: req.user.companyId,
        deletedBy: req.user.id
      });

      res.status(200).json({
        success: true,
        message: 'Feature flag deleted successfully'
      });

    } catch (error) {
      this.logger.error('Delete feature flag error', {
        error: error.message,
        featureName: req.params.featureName,
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
   * Evaluate feature flag
   * GET /api/feature-flags/:featureName/evaluate
   */
  /**
   * Helper method to evaluate feature flag with given context
   */
  private async evaluateFlagWithContext(featureName: string, context: any) {
    return await this.featureFlagService.evaluateFlag(featureName, context);
  }

  /**
   * Format evaluation response
   */
  private formatEvaluationResponse(featureName: string, evaluation: any, context: any) {
    return {
      success: true,
      data: {
        featureName,
        enabled: evaluation.enabled,
        variation: evaluation.variation,
        value: evaluation.value,
        reason: evaluation.reason,
        ruleMatches: evaluation.ruleMatches,
        evaluationTime: evaluation.evaluationTime,
        cacheHit: evaluation.cacheHit,
        context: {
          userId: context.userId,
          companyId: context.companyId,
          userRole: context.userRole,
          environment: context.environment
        }
      }
    };
  }

  /**
   * Evaluate feature flag via GET
   * GET /api/feature-flags/:featureName/evaluate
   */
  evaluateFeatureFlag = async (req: Request, res: Response): Promise<void> => {
    try {
      const featureName = req.params.featureName;

      // Build context from query params and user session
      const context = {
        userId: req.query.userId as string || req.user?.id,
        companyId: req.query.companyId as string || req.user?.companyId || '',
        userRole: req.query.userRole as string || req.user?.role,
        environment: req.query.environment as string || environment.nodeEnv || 'production',
        userAttributes: req.query.userAttributes ? JSON.parse(req.query.userAttributes as string) : {},
        deviceInfo: {
          userAgent: req.get('User-Agent'),
          type: req.query.deviceType as string,
          os: req.query.os as string,
          browser: req.query.browser as string
        },
        geoLocation: req.query.country ? {
          country: req.query.country as string,
          region: req.query.region as string,
          city: req.query.city as string,
          timezone: req.query.timezone as string
        } : undefined,
        requestMetadata: {
          ipAddress: req.ip,
          timestamp: new Date(),
          source: 'api'
        }
      };

      // Evaluate flag
      const evaluation = await this.evaluateFlagWithContext(featureName, context);

      // Send response
      const response = this.formatEvaluationResponse(featureName, evaluation, context);
      res.status(200).json(response);

    } catch (error) {
      this.logger.error('Evaluate feature flag error', {
        error: error.message,
        featureName: req.params?.featureName,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Evaluate feature flag via POST with context in body
   * POST /api/feature-flags/:featureName/evaluate
   */
  evaluateFeatureFlagPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const featureName = req.params.featureName;
      
      // Get context from body (sent by frontend)
      const bodyContext = req.body.context || {};
      
      // Merge body context with session context and defaults
      const context = {
        userId: bodyContext.userId || req.user?.id,
        companyId: bodyContext.companyId || req.user?.companyId || '',
        userRole: bodyContext.userRole || req.user?.role,
        environment: bodyContext.environment || environment.nodeEnv || 'production',
        userAttributes: bodyContext.userAttributes || {},
        deviceInfo: {
          userAgent: req.get('User-Agent'),
          type: bodyContext.deviceInfo?.type,
          os: bodyContext.deviceInfo?.os,
          browser: bodyContext.deviceInfo?.browser
        },
        geoLocation: bodyContext.geoLocation,
        requestMetadata: {
          ipAddress: req.ip,
          timestamp: new Date(),
          source: 'api'
        }
      };

      // Use shared evaluation logic
      const evaluation = await this.evaluateFlagWithContext(featureName, context);

      // Send response using shared formatter
      const response = this.formatEvaluationResponse(featureName, evaluation, context);
      res.status(200).json(response);

    } catch (error) {
      this.logger.error('Evaluate feature flag POST error', {
        error: error.message,
        featureName: req.params?.featureName,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Bulk toggle feature flags
   * PATCH /api/feature-flags/bulk-toggle
   */
  bulkToggleFlags = async (req: Request, res: Response): Promise<void> => {
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
          message: 'Admin role required'
        });
        return;
      }

      // Validate input
      const bulkDto = plainToInstance(BulkFeatureFlagDto, req.body);
      const errors = await validate(bulkDto);

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

      // Bulk toggle feature flags
      const results = await this.featureFlagService.bulkToggleFlags(
        req.user.companyId,
        bulkDto.featureNames,
        bulkDto.enabled,
        bulkDto.environment || 'production'
      );

      this.logger.info('Bulk feature flag toggle', {
        featureNames: bulkDto.featureNames,
        enabled: bulkDto.enabled,
        environment: bulkDto.environment,
        reason: bulkDto.reason,
        companyId: req.user.companyId,
        performedBy: req.user.id,
        results
      });

      res.status(200).json({
        success: true,
        message: `Bulk toggle ${bulkDto.enabled ? 'enabled' : 'disabled'} feature flags successfully`,
        data: {
          results: results.map(result => ({
            featureName: result.featureName,
            success: result.success,
            message: result.message
          })),
          summary: {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
          }
        }
      });

    } catch (error) {
      this.logger.error('Bulk toggle feature flags error', {
        error: error.message,
        featureNames: req.body?.featureNames,
        companyId: req.user?.companyId,
        performedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Clone feature flags between environments
   * POST /api/feature-flags/clone
   */
  cloneFlags = async (req: Request, res: Response): Promise<void> => {
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
          message: 'Admin role required'
        });
        return;
      }

      // Validate input
      const cloneDto = plainToInstance(CloneFeatureFlagDto, req.body);
      const errors = await validate(cloneDto);

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

      if (cloneDto.sourceEnvironment === cloneDto.targetEnvironment) {
        res.status(400).json({
          success: false,
          message: 'Source and target environments must be different'
        });
        return;
      }

      // Clone feature flags
      const cloneResult = await this.featureFlagService.cloneToEnvironment(
        req.user.companyId,
        cloneDto.sourceEnvironment,
        cloneDto.targetEnvironment,
        cloneDto.featureNames,
        cloneDto.overwriteExisting
      );

      this.logger.info('Feature flags cloned between environments', {
        sourceEnvironment: cloneDto.sourceEnvironment,
        targetEnvironment: cloneDto.targetEnvironment,
        featureNames: cloneDto.featureNames,
        overwriteExisting: cloneDto.overwriteExisting,
        companyId: req.user.companyId,
        performedBy: req.user.id,
        results: cloneResult
      });

      res.status(200).json({
        success: true,
        message: `Feature flags cloned from ${cloneDto.sourceEnvironment} to ${cloneDto.targetEnvironment} successfully`,
        data: {
          results: cloneResult.map(result => ({
            featureName: result.featureName,
            success: result.success,
            action: result.action, // 'created', 'updated', 'skipped'
            message: result.message
          })),
          summary: {
            total: cloneResult.length,
            created: cloneResult.filter(r => r.action === 'created').length,
            updated: cloneResult.filter(r => r.action === 'updated').length,
            skipped: cloneResult.filter(r => r.action === 'skipped').length
          }
        }
      });

    } catch (error) {
      this.logger.error('Clone feature flags error', {
        error: error.message,
        sourceEnvironment: req.body?.sourceEnvironment,
        targetEnvironment: req.body?.targetEnvironment,
        companyId: req.user?.companyId,
        performedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Evaluate multiple feature flags at once
   * POST /api/feature-flags/evaluate-multiple
   */
  evaluateMultipleFlags = async (req: Request, res: Response): Promise<void> => {
    try {
      const { flagNames, context } = req.body;

      if (!flagNames || !Array.isArray(flagNames) || flagNames.length === 0) {
        res.status(400).json({
          success: false,
          message: 'flagNames array is required'
        });
        return;
      }

      // Build evaluation context
      const evaluationContext = {
        userId: context?.userId || req.user?.id,
        companyId: context?.companyId || req.user?.companyId || '',
        userRole: context?.userRole || req.user?.role,
        environment: context?.environment || environment.nodeEnv || 'production',
        userAttributes: context?.userAttributes || {},
        deviceInfo: context?.deviceInfo || { userAgent: req.get('User-Agent') },
        geoLocation: context?.geoLocation,
        sessionAttributes: context?.sessionAttributes,
        requestMetadata: {
          ipAddress: req.ip,
          timestamp: new Date(),
          source: 'api'
        }
      };

      // Evaluate multiple flags
      const results = await this.featureFlagService.evaluateMultipleFlags(
        flagNames,
        evaluationContext
      );

      res.status(200).json({
        success: true,
        data: {
          results,
          context: evaluationContext
        }
      });

    } catch (error) {
      this.logger.error('Evaluate multiple flags error', {
        error: error.message,
        flagNames: req.body?.flagNames,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };

  /**
   * Get feature flag analytics
   * GET /api/feature-flags/:featureName/analytics
   */
  getAnalytics = async (req: Request, res: Response): Promise<void> => {
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
          message: 'Admin or Manager role required'
        });
        return;
      }

      // Validate query parameters
      const analyticsQuery = plainToInstance(FeatureFlagAnalyticsDto, {
        featureName: req.params.featureName,
        ...req.query
      });
      const errors = await validate(analyticsQuery);

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

      // Get analytics data
      const analytics = await this.featureFlagService.getAnalytics(
        req.user.companyId,
        analyticsQuery.featureName,
        {
          environment: analyticsQuery.environment,
          startDate: analyticsQuery.startDate,
          endDate: analyticsQuery.endDate,
          granularity: analyticsQuery.granularity,
          metrics: analyticsQuery.metrics
        }
      );

      res.status(200).json({
        success: true,
        data: {
          featureName: analyticsQuery.featureName,
          environment: analyticsQuery.environment,
          period: {
            startDate: analyticsQuery.startDate,
            endDate: analyticsQuery.endDate,
            granularity: analyticsQuery.granularity
          },
          analytics: analytics
        }
      });

    } catch (error) {
      this.logger.error('Get feature flag analytics error', {
        error: error.message,
        featureName: req.params.featureName,
        companyId: req.user?.companyId,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
}
