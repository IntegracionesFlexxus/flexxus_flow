/**
 * Feature Flag Routes
 * Sprint 2 - Backend Team
 * Rutas para gestión y evaluación de feature flags
 */
import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { FeatureFlagController } from '@/modules/feature-flags/controllers/FeatureFlagController';
import { authenticateToken, requireRole } from '@/shared/middleware/auth';
const router = Router();
// Obtener controller del container
const featureFlagController = container.get<FeatureFlagController>(TYPES.FeatureFlagController);
// ========== Public Routes (No auth required for evaluation) ==========
/**
 * Evaluate a single feature flag
 * GET /api/feature-flags/:featureName/evaluate
 * 
 * This endpoint can be called without authentication for public feature flags
 * If authenticated, will use user context for better evaluation
 */
router.get(
  '/:featureName/evaluate',
  featureFlagController.evaluateFeatureFlag.bind(featureFlagController)
);
/**
 * Evaluate a single feature flag via POST
 * POST /api/feature-flags/:featureName/evaluate
 * 
 * This endpoint accepts context in the request body
 * Body: { context?: FeatureFlagContext }
 */
router.post(
  '/:featureName/evaluate',
  featureFlagController.evaluateFeatureFlagPost.bind(featureFlagController)
);
/**
 * Evaluate multiple feature flags at once
 * POST /api/feature-flags/evaluate-multiple
 * 
 * Body: { flagNames: string[], context?: FeatureFlagContext }
 */
router.post(
  '/evaluate-multiple',
  featureFlagController.evaluateMultipleFlags.bind(featureFlagController)
);
// ========== Protected Routes (Auth required) ==========
// Apply authentication middleware to all routes below
router.use(authenticateToken);
/**
 * Get all feature flags for the authenticated user's company
 * GET /api/feature-flags
 * 
 * Query params:
 * - environment: string (default: 'production')
 * - category: string (optional)
 * - enabled: boolean (optional)
 */
router.get(
  '/',
  featureFlagController.getFeatureFlags.bind(featureFlagController)
);
/**
 * Get specific feature flag details
 * GET /api/feature-flags/:featureName
 * 
 * Query params:
 * - environment: string (default: 'production')
 * 
 * Requires: Admin or Manager role
 */
router.get(
  '/:featureName',
  requireRole(['admin', 'manager']),
  featureFlagController.getFeatureFlag.bind(featureFlagController)
);
/**
 * Create new feature flag
 * POST /api/feature-flags
 * 
 * Body: CreateFeatureFlagDto
 * Requires: Admin role
 */
router.post(
  '/',
  requireRole(['admin']),
  featureFlagController.createFeatureFlag.bind(featureFlagController)
);
/**
 * Update feature flag
 * PUT /api/feature-flags/:featureName
 * 
 * Query params:
 * - environment: string (default: 'production')
 * 
 * Body: UpdateFeatureFlagDto
 * Requires: Admin or Manager role
 */
router.put(
  '/:featureName',
  requireRole(['admin', 'manager']),
  featureFlagController.updateFeatureFlag.bind(featureFlagController)
);
/**
 * Delete feature flag
 * DELETE /api/feature-flags/:featureName
 * 
 * Query params:
 * - environment: string (default: 'production')
 * 
 * Requires: Admin role
 */
router.delete(
  '/:featureName',
  requireRole(['admin']),
  featureFlagController.deleteFeatureFlag.bind(featureFlagController)
);
// ========== Bulk Operations (Admin only) ==========
/**
 * Bulk toggle feature flags
 * PATCH /api/feature-flags/bulk-toggle
 * 
 * Body: BulkFeatureFlagDto
 * Requires: Admin role
 */
router.patch(
  '/bulk-toggle',
  requireRole(['admin']),
  featureFlagController.bulkToggleFlags.bind(featureFlagController)
);
/**
 * Clone feature flags between environments
 * POST /api/feature-flags/clone
 * 
 * Body: CloneFeatureFlagDto
 * Requires: Admin role
 */
router.post(
  '/clone',
  requireRole(['admin']),
  featureFlagController.cloneFlags.bind(featureFlagController)
);
// ========== Analytics Routes ==========
/**
 * Get feature flag analytics
 * GET /api/feature-flags/:featureName/analytics
 * 
 * Query params:
 * - environment: string (default: 'production')
 * - startDate: Date (optional)
 * - endDate: Date (optional)
 * - granularity: 'hour' | 'day' | 'week' | 'month' (default: 'day')
 * - metrics: string[] (optional, e.g., ['evaluations', 'uniqueUsers', 'variations'])
 * 
 * Requires: Admin or Manager role
 */
router.get(
  '/:featureName/analytics',
  requireRole(['admin', 'manager']),
  featureFlagController.getAnalytics.bind(featureFlagController)
);
/**
 * Get aggregated analytics for all feature flags
 * GET /api/feature-flags/analytics/summary
 * 
 * Query params:
 * - environment: string (default: 'production')
 * - startDate: Date (optional)
 * - endDate: Date (optional)
 * 
 * Requires: Admin or Manager role
 */
router.get(
  '/analytics/summary',
  requireRole(['admin', 'manager']),
  async (req, res) => {
    try {
      const featureFlagService = container.get<any>(TYPES.FeatureFlagService);
      const timeRange = {
        start: req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: req.query.endDate ? new Date(req.query.endDate as string) : new Date()
      };
      const analytics = await featureFlagService.getAnalytics(
        undefined, // All flags
        req.user?.companyId,
        timeRange
      );
      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: 'Failed to get analytics summary',
        error: error.message
      });
    }
  }
);
// ========== Health Check ==========
/**
 * Feature flag module health check
 * GET /api/feature-flags/health
 */
router.get('/health', (req, res) => {
  res.json({
    module: 'feature-flags',
    status: 'active',
    message: 'Feature flag module is operational',
    timestamp: new Date().toISOString()
  });
});
export default router;
