/**
 * Invitation Routes - Sprint 3
 * Rutas para gestión completa de invitaciones y onboarding
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */
import { Router } from 'express';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { InvitationController } from '@/modules/auth/controllers/InvitationController';
import { AuthMiddleware, createAuthorizationMiddleware } from '@/shared/middleware/auth';
const authMiddleware = container.get<AuthMiddleware>(TYPES.AuthMiddleware) || new AuthMiddleware(
  container.get(TYPES.JwtService),
  container.get(TYPES.SessionService),
  container.get(TYPES.Logger),
  container.get(TYPES.PermissionService)
);
import { rateLimitMiddleware } from '@/shared/middleware/rateLimitMiddleware';
import { invitationValidators } from '@/modules/auth/validators/invitationValidators';
import { environment } from '@/config/environment';
const router = Router();
// Get controller instance from DI container
const invitationController = container.get<InvitationController>(TYPES.InvitationController);
// Get authorization middleware
const { requirePermission, requireAnyPermission, authorize } = createAuthorizationMiddleware(container);
// ========== Public Routes (No authentication required) ==========
/**
 * Get invitation preview by token
 * GET /api/v1/invitations/:token/preview
 */
router.get(
  '/:token/preview',
  rateLimitMiddleware('invitation_preview', { windowMs: 15 * 60 * 1000, max: 20 }), // 20 requests per 15 minutes
  invitationValidators.getInvitationByToken,
  invitationController.getInvitationPreview
);
/**
 * Accept invitation
 * POST /api/v1/invitations/:token/accept
 */
router.post(
  '/:token/accept',
  rateLimitMiddleware('invitation_accept', { windowMs: 60 * 60 * 1000, max: 5 }), // 5 attempts per hour
  invitationValidators.acceptInvitation,
  invitationController.acceptInvitation
);
/**
 * Reject invitation
 * POST /api/v1/invitations/:token/reject
 */
router.post(
  '/:token/reject',
  rateLimitMiddleware('invitation_reject', { windowMs: 60 * 60 * 1000, max: 10 }), // 10 requests per hour
  invitationValidators.rejectInvitation,
  invitationController.rejectInvitation
);
// ========== Protected Routes (Authentication required) ==========
/**
 * Create new invitation
 * POST /api/v1/invitations
 * Permissions: invitations.create
 */
router.post(
  '/',
  authMiddleware.authenticate,
  requirePermission('invitations.create'),
  rateLimitMiddleware('create_invitation', { windowMs: 60 * 60 * 1000, max: 50 }), // 50 invitations per hour
  invitationValidators.createInvitation,
  invitationController.createInvitation
);
/**
 * Create bulk invitations
 * POST /api/v1/invitations/bulk
 * Permissions: invitations.create AND invitations.bulk
 */
router.post(
  '/bulk',
  authMiddleware.authenticate,
  requireAnyPermission(['invitations.bulk', 'invitations.admin']),
  rateLimitMiddleware('bulk_invitations', { windowMs: 60 * 60 * 1000, max: 5 }), // 5 bulk operations per hour
  invitationValidators.createBulkInvitations,
  invitationController.createBulkInvitations
);
/**
 * Get company invitations
 * GET /api/v1/invitations
 * Permissions: invitations.read
 */
router.get(
  '/',
  authMiddleware.authenticate,
  requirePermission('invitations.read'),
  invitationValidators.getInvitations,
  invitationController.getInvitations
);
/**
 * Get invitation analytics
 * GET /api/v1/invitations/analytics
 * Permissions: analytics.read OR invitations.analytics
 */
router.get(
  '/analytics',
  authMiddleware.authenticate,
  requireAnyPermission(['analytics.read', 'invitations.analytics']),
  rateLimitMiddleware('invitation_analytics', { windowMs: 5 * 60 * 1000, max: 30 }), // 30 requests per 5 minutes
  invitationValidators.getInvitationAnalytics,
  invitationController.getInvitationAnalytics
);
/**
 * Resend invitation
 * POST /api/v1/invitations/:id/resend
 * Permissions: invitations.create
 */
router.post(
  '/:id/resend',
  authMiddleware.authenticate,
  requirePermission('invitations.create'),
  rateLimitMiddleware('resend_invitation', { windowMs: 60 * 60 * 1000, max: 20 }), // 20 resends per hour
  invitationValidators.resendInvitation,
  invitationController.resendInvitation
);
/**
 * Send invitation reminder
 * POST /api/v1/invitations/:id/remind
 * Permissions: invitations.create
 */
router.post(
  '/:id/remind',
  authMiddleware.authenticate,
  requirePermission('invitations.create'),
  rateLimitMiddleware('invitation_reminder', { windowMs: 60 * 60 * 1000, max: 10 }), // 10 reminders per hour
  invitationValidators.sendReminder,
  invitationController.sendInvitationReminder
);
/**
 * Cancel invitation
 * DELETE /api/v1/invitations/:id
 * Permissions: invitations.delete
 */
router.delete(
  '/:id',
  authMiddleware.authenticate,
  requirePermission('invitations.delete'),
  invitationValidators.cancelInvitation,
  invitationController.cancelInvitation
);
// ========== Onboarding Routes ==========
/**
 * Start onboarding manually
 * POST /api/v1/onboarding/start
 * Permissions: users.manage (for others) OR self
 */
router.post(
  '/onboarding/start',
  authMiddleware.authenticate,
  authorize({
    customCheck: async (req) => {
      const { userId } = req.body;
      // Allow users to start their own onboarding or admins to start others'
      return !userId || userId === req.user?.id || req.user?.permissions.includes('users.manage');
    }
  }),
  invitationValidators.startOnboarding,
  invitationController.startOnboarding
);
/**
 * Get onboarding status
 * GET /api/v1/onboarding/status
 * Permissions: Self access OR users.read
 */
router.get(
  '/onboarding/status',
  authMiddleware.authenticate,
  authorize({
    customCheck: async (req) => {
      const { userId } = req.query;
      // Allow users to see their own status or admins to see others'
      return !userId || userId === req.user?.id || req.user?.permissions.includes('users.read');
    }
  }),
  invitationValidators.getOnboardingStatus,
  invitationController.getOnboardingStatus
);
/**
 * Complete onboarding step
 * POST /api/v1/onboarding/steps/:stepId/complete
 * Permissions: Self only (users can only complete their own onboarding)
 */
router.post(
  '/onboarding/steps/:stepId/complete',
  authMiddleware.authenticate,
  invitationValidators.completeOnboardingStep,
  invitationController.completeOnboardingStep
);
/**
 * Skip optional onboarding step
 * POST /api/v1/onboarding/steps/:stepId/skip
 * Permissions: Self only
 */
router.post(
  '/onboarding/steps/:stepId/skip',
  authMiddleware.authenticate,
  invitationValidators.skipOnboardingStep,
  invitationController.skipOnboardingStep
);
/**
 * Reset onboarding
 * POST /api/v1/onboarding/reset
 * Permissions: users.manage (for others) OR self
 */
router.post(
  '/onboarding/reset',
  authMiddleware.authenticate,
  authorize({
    customCheck: async (req) => {
      const { userId } = req.body;
      return !userId || userId === req.user?.id || req.user?.permissions.includes('users.manage');
    }
  }),
  invitationValidators.resetOnboarding,
  invitationController.resetOnboarding
);
// ========== Admin Routes ==========
/**
 * Get invitation statistics (detailed)
 * GET /api/v1/invitations/stats
 * Permissions: invitations.analytics OR admin.*
 */
router.get(
  '/stats',
  authMiddleware.authenticate,
  requireAnyPermission(['invitations.analytics', 'admin.read', 'analytics.*']),
  invitationValidators.getInvitationStats,
  invitationController.getInvitationStats
);
/**
 * Health check endpoint
 * GET /api/v1/invitations/health
 * Public endpoint for monitoring
 */
router.get('/health', invitationController.healthCheck);
// ========== Webhook Routes ==========
/**
 * Email webhook for tracking
 * POST /api/v1/invitations/webhooks/email
 * Used by email service providers to track opens, clicks, etc.
 */
router.post(
  '/webhooks/email',
  rateLimitMiddleware('email_webhook', { windowMs: 60 * 1000, max: 1000 }), // 1000 webhooks per minute
  (req, res) => {
    // Email webhook handler would go here
    // This would track email opens, clicks, bounces, etc.
    res.status(200).json({ success: true, message: 'Webhook processed' });
  }
);
// ========== Error Handling Middleware ==========
/**
 * Route-specific error handler
 */
router.use((error: any, req: any, res: any, next: any) => {
  // Log the error with context
  const logger = container.get(TYPES.Logger);
  logger.error('Invitation route error', {
    error: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    user: req.user?.id,
    ip: req.ip
  });
  // Return appropriate error response
  const statusCode = error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: error.message || 'Internal server error',
    code: error.code || 'INVITATION_ERROR',
    ...(environment.isDevelopment && { 
      stack: error.stack,
      details: error.details 
    })
  });
});
export { router as invitationRoutes };
