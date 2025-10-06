/**
 * Enhanced Feature Flag Middleware - Sprint 3
 * Middleware mejorado para evaluación automática de feature flags
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */
import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { FeatureFlagService, FeatureFlagContext } from '@/modules/feature-flags/services/FeatureFlagService';
import { AppError, ErrorCode } from '@/shared/errors/AppError';
import { environment } from '@/config/environment';
// Extended Request interface to include feature flags
declare global {
  namespace Express {
    interface Request {
      featureFlags?: {
        [key: string]: {
          enabled: boolean;
          value?: any;
          variation?: string;
          reason: string;
        };
      };
      flagContext?: FeatureFlagContext;
    }
  }
}
export interface FeatureFlagMiddlewareOptions {
  flags?: string[];
  required?: boolean;
  environment?: string;
  cacheResults?: boolean;
  onFlagMissing?: 'error' | 'warn' | 'ignore';
  onEvaluationError?: 'error' | 'warn' | 'continue';
}
@injectable()
export class FeatureFlagMiddleware {
  constructor(
    @inject(TYPES.FeatureFlagService) private featureFlagService: FeatureFlagService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}
  /**
   * Create middleware for automatic flag evaluation
   */
  evaluate(options: FeatureFlagMiddlewareOptions = {}) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Build evaluation context from request
        const context = this.buildContextFromRequest(req, options);
        req.flagContext = context;
        // Initialize feature flags object
        req.featureFlags = {};
        // If specific flags are requested, evaluate them
        if (options.flags && options.flags.length > 0) {
          await this.evaluateSpecificFlags(req, options.flags, context, options);
        }
        next();
      } catch (error) {
        this.handleMiddlewareError(error, options, next);
      }
    };
  }
  /**
   * Create middleware for single flag evaluation
   */
  requireFlag(flagName: string, options: Omit<FeatureFlagMiddlewareOptions, 'flags'> = {}) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const context = this.buildContextFromRequest(req, options);
        req.flagContext = context;
        const evaluation = await this.featureFlagService.evaluateFlag(flagName, context);
        // Initialize feature flags if not exists
        if (!req.featureFlags) {
          req.featureFlags = {};
        }
        req.featureFlags[flagName] = {
          enabled: evaluation.enabled,
          value: evaluation.value,
          variation: evaluation.variation,
          reason: evaluation.reason
        };
        // Check if flag is required to be enabled
        if (options.required && !evaluation.enabled) {
          const error = new AppError(
            ErrorCode.FEATURE_NOT_AVAILABLE,
            'Feature not available',
            403
          );
          if (options.onFlagMissing === 'error') {
            throw error;
          } else if (options.onFlagMissing === 'warn') {
            this.logger.warn('Required feature flag disabled', { flagName, evaluation });
          }
        }
        next();
      } catch (error) {
        this.handleMiddlewareError(error, options, next);
      }
    };
  }
  /**
   * Create middleware for conditional execution based on flag
   */
  conditionalRoute(
    flagName: string,
    enabledHandler: (req: Request, res: Response, next: NextFunction) => void,
    disabledHandler?: (req: Request, res: Response, next: NextFunction) => void
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const context = this.buildContextFromRequest(req);
        const evaluation = await this.featureFlagService.evaluateFlag(flagName, context);
        if (evaluation.enabled) {
          enabledHandler(req, res, next);
        } else if (disabledHandler) {
          disabledHandler(req, res, next);
        } else {
          res.status(404).json({
            error: 'Feature not available',
            flagName,
            reason: evaluation.reason
          });
        }
      } catch (error) {
        this.logger.error('Conditional route evaluation failed', { error, flagName });
        next(error);
      }
    };
  }
  /**
   * Create middleware for A/B testing variations
   */
  abTest(flagName: string, handlers: { [variation: string]: (req: Request, res: Response, next: NextFunction) => void }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const context = this.buildContextFromRequest(req);
        const evaluation = await this.featureFlagService.evaluateFlag(flagName, context);
        if (evaluation.enabled && evaluation.variation && handlers[evaluation.variation]) {
          handlers[evaluation.variation](req, res, next);
        } else if (handlers.default) {
          handlers.default(req, res, next);
        } else {
          next();
        }
      } catch (error) {
        this.logger.error('A/B test evaluation failed', { error, flagName });
        if (handlers.default) {
          handlers.default(req, res, next);
        } else {
          next(error);
        }
      }
    };
  }
  /**
   * Utility method to evaluate flag within route handler
   */
  async evaluateInRoute(req: Request, flagName: string): Promise<{ enabled: boolean; value?: any; variation?: string; reason: string }> {
    const context = req.flagContext || this.buildContextFromRequest(req);
    const evaluation = await this.featureFlagService.evaluateFlag(flagName, context);
    return {
      enabled: evaluation.enabled,
      value: evaluation.value,
      variation: evaluation.variation,
      reason: evaluation.reason
    };
  }
  /**
   * Build feature flag context from Express request
   */
  private buildContextFromRequest(req: Request, options?: FeatureFlagMiddlewareOptions): FeatureFlagContext {
    const user = (req as any).user; // Assuming user is attached by auth middleware
    const company = (req as any).company;
    // Extract device info from user agent
    const userAgent = req.headers['user-agent'] || '';
    const deviceInfo = this.parseUserAgent(userAgent);
    // Extract geo location (assuming it's available from IP or previous middleware)
    const geoLocation = (req as any).geoLocation || this.extractGeoFromHeaders(req);
    return {
      userId: user?.id || user?.userId,
      companyId: company?.id || user?.companyId,
      environment: options?.environment || environment.nodeEnv || 'production',
      userRole: user?.role || user?.userRole,
      userAttributes: {
        ...user,
        email: user?.email,
        isActive: user?.isActive,
        subscription: user?.subscription,
        plan: user?.plan
      },
      deviceInfo,
      geoLocation,
      sessionAttributes: {
        sessionId: req.sessionID,
        isAuthenticated: !!user,
        userAgent
      },
      requestMetadata: {
        ipAddress: req.ip || req.connection.remoteAddress,
        timestamp: new Date(),
        source: 'web',
        path: req.path,
        method: req.method,
        headers: {
          'accept-language': req.headers['accept-language'],
          'referer': req.headers.referer
        }
      }
    };
  }
  /**
   * Parse user agent for device information
   */
  private parseUserAgent(userAgent: string): FeatureFlagContext['deviceInfo'] {
    const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
    const isTablet = /iPad|Tablet/.test(userAgent);
    let deviceType = 'desktop';
    if (isTablet) deviceType = 'tablet';
    else if (isMobile) deviceType = 'mobile';
    let os = 'unknown';
    if (/Windows/.test(userAgent)) os = 'windows';
    else if (/Mac OS X/.test(userAgent)) os = 'macos';
    else if (/Linux/.test(userAgent)) os = 'linux';
    else if (/Android/.test(userAgent)) os = 'android';
    else if (/iOS/.test(userAgent)) os = 'ios';
    let browser = 'unknown';
    if (/Chrome/.test(userAgent)) browser = 'chrome';
    else if (/Firefox/.test(userAgent)) browser = 'firefox';
    else if (/Safari/.test(userAgent)) browser = 'safari';
    else if (/Edge/.test(userAgent)) browser = 'edge';
    return {
      type: deviceType,
      os,
      browser,
      userAgent
    };
  }
  /**
   * Extract geo location from request headers
   */
  private extractGeoFromHeaders(req: Request): FeatureFlagContext['geoLocation'] {
    return {
      country: req.headers['cf-ipcountry'] as string || req.headers['x-country'] as string,
      region: req.headers['cf-region'] as string || req.headers['x-region'] as string,
      city: req.headers['cf-ipcity'] as string || req.headers['x-city'] as string,
      timezone: req.headers['cf-timezone'] as string || req.headers['x-timezone'] as string
    };
  }
  /**
   * Evaluate specific flags requested
   */
  private async evaluateSpecificFlags(
    req: Request, 
    flags: string[], 
    context: FeatureFlagContext, 
    options: FeatureFlagMiddlewareOptions
  ): Promise<void> {
    for (const flagName of flags) {
      try {
        const evaluation = await this.featureFlagService.evaluateFlag(flagName, context);
        req.featureFlags![flagName] = {
          enabled: evaluation.enabled,
          value: evaluation.value,
          variation: evaluation.variation,
          reason: evaluation.reason
        };
      } catch (error) {
        this.logger.error('Flag evaluation failed in middleware', { error, flagName, userId: context.userId });
        if (options.onEvaluationError === 'error') {
          throw error;
        } else if (options.onEvaluationError === 'warn') {
          this.logger.warn('Flag evaluation failed, using default', { flagName, error });
        }
        // Set default values on error
        req.featureFlags![flagName] = {
          enabled: false,
          reason: `Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
      }
    }
  }
  /**
   * Handle middleware errors consistently
   */
  private handleMiddlewareError(
    error: unknown, 
    options: FeatureFlagMiddlewareOptions, 
    next: NextFunction
  ): void {
    this.logger.error('Feature flag middleware error', { error });
    if (options.onEvaluationError === 'error') {
      next(error);
    } else {
      // Continue with empty feature flags on error
      next();
    }
  }
}
/**
 * Decorator for route-level feature flag requirements
 */
export function RequireFeatureFlag(flagName: string, options?: { required?: boolean; variation?: string }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args: any[]) {
      const req = args[0] as Request;
      const res = args[1] as Response;
      if (!req.featureFlags || !req.featureFlags[flagName]) {
        if (options?.required !== false) {
          return res.status(403).json({
            error: 'Feature not available',
            flagName,
            reason: 'Feature flag not evaluated or missing'
          });
        }
      }
      const flag = req.featureFlags[flagName];
      if (options?.required && !flag.enabled) {
        return res.status(403).json({
          error: 'Feature not available',
          flagName,
          reason: flag.reason
        });
      }
      if (options?.variation && flag.variation !== options.variation) {
        return res.status(403).json({
          error: 'Feature variation not available',
          flagName,
          requiredVariation: options.variation,
          actualVariation: flag.variation
        });
      }
      return originalMethod.apply(this, args);
    };
    return descriptor;
  };
}
// Helper function for quick flag evaluation in routes
export async function checkFeatureFlag(req: Request, flagName: string): Promise<boolean> {
  return req.featureFlags?.[flagName]?.enabled || false;
}
// Helper function to get flag value
export function getFeatureFlagValue<T = any>(req: Request, flagName: string, defaultValue?: T): T {
  return req.featureFlags?.[flagName]?.value ?? defaultValue;
}
// Export alias for backward compatibility
export { FeatureFlagMiddleware as EnhancedFeatureFlagMiddleware };
