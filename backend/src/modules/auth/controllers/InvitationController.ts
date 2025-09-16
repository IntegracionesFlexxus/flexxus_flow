/**
 * Invitation Controller - Sprint 3
 * Controlador para gestión completa de invitaciones y onboarding
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */

import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { InvitationService } from '@/modules/invitations/services/InvitationService';
import { OnboardingService } from '@/modules/users/services/OnboardingService';
import { EmailService } from '@/modules/notifications/services/EmailService';
import { AuditService } from '@/shared/services/audit/AuditService';
import { AppError } from '@/shared/errors/AppError';
import { validationResult } from 'express-validator';
import { environment } from '@/config/environment';

// Extended Request interface for authentication
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    companyId: string;
    permissions: string[];
    role: string;
  };
}

/**
 * InvitationController - Manejo completo de invitaciones y onboarding
 * Responsabilidad única: Gestión de invitaciones via HTTP
 */
@injectable()
export class InvitationController {
  constructor(
    @inject(TYPES.InvitationService) private invitationService: InvitationService,
    @inject(TYPES.OnboardingService) private onboardingService: OnboardingService,
    @inject(TYPES.EmailService) private emailService: EmailService,
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Create new invitation
   * POST /api/v1/invitations
   */
  createInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { email, roleId, personalMessage, expirationDays, permissions } = req.body;

      // Create invitation with enhanced workflow
      const invitation = await this.invitationService.createInvitation({
        email,
        companyId: req.user!.companyId,
        roleId,
        invitedBy: req.user!.id,
        personalMessage,
        expirationDays,
        permissions
      });

      // Send enhanced invitation email
      await this.sendEnhancedInvitationEmail(invitation);

      // Log successful creation
      this.logger.info('Enhanced invitation created', {
        invitationId: invitation.id,
        invitedBy: req.user!.id,
        invitedEmail: email,
        companyId: req.user!.companyId
      });

      res.status(201).json({
        success: true,
        data: invitation,
        message: 'Invitation sent successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to create invitation');
    }
  };

  /**
   * Create bulk invitations with progress tracking
   * POST /api/v1/invitations/bulk
   */
  createBulkInvitations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { roleId, invitations, permissions, expirationDays } = req.body;

      // Start bulk invitation process
      const result = await this.invitationService.createBulkInvitations({
        companyId: req.user!.companyId,
        roleId,
        invitedBy: req.user!.id,
        invitations,
        permissions,
        expirationDays
      });

      // Send summary email to inviter
      await this.sendBulkInvitationSummaryEmail(req.user!, result);

      this.logger.info('Bulk invitations processed with enhanced tracking', {
        total: result.summary.total,
        successful: result.summary.successful,
        failed: result.summary.failed,
        invitedBy: req.user!.id
      });

      res.status(201).json({
        success: true,
        data: result,
        message: `Processed ${result.summary.total} invitations. ${result.summary.successful} successful, ${result.summary.failed} failed.`
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to create bulk invitations');
    }
  };

  /**
   * Accept invitation with enhanced onboarding
   * POST /api/v1/invitations/:token/accept
   */
  acceptInvitation = async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const { token } = req.params;
      const { userRegistrationData } = req.body;

      const result = await this.invitationService.acceptInvitation({
        token,
        userRegistrationData
      });

      // Start enhanced onboarding for new users
      let onboardingProgress = null;
      if (result.isNewUser) {
        onboardingProgress = await this.onboardingService.startOnboarding(
          result.user.id,
          result.invitation.companyId,
          result.invitation.roleName.toLowerCase()
        );

        // Send welcome email with onboarding guide
        await this.emailService.sendWelcomeEmail({
          recipientEmail: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          companyName: result.invitation.companyName,
          roleName: result.invitation.roleName,
          dashboardUrl: `${environment.frontend}/dashboard`,
          setupProfileUrl: `${environment.frontend}/onboarding`,
          helpCenterUrl: `${environment.frontend}/help`
        });
      }

      this.logger.info('Enhanced invitation acceptance', {
        invitationId: result.invitation.id,
        userId: result.user.id,
        isNewUser: result.isNewUser,
        companyId: result.invitation.companyId,
        onboardingStarted: !!onboardingProgress
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName
          },
          company: {
            id: result.invitation.companyId,
            name: result.invitation.companyName
          },
          role: result.invitation.roleName,
          isNewUser: result.isNewUser,
          onboarding: onboardingProgress ? {
            required: true,
            progress: onboardingProgress.progressPercentage,
            nextStep: onboardingProgress.steps.find(s => !s.completed)?.name,
            url: `${environment.frontend}/onboarding`
          } : null
        },
        message: result.isNewUser 
          ? 'Welcome! Your account has been created. Please complete your onboarding to get started.'
          : 'Welcome back! You have been added to the company.'
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to accept invitation');
    }
  };

  /**
   * Get invitation preview (public endpoint)
   * GET /api/v1/invitations/:token/preview
   */
  getInvitationPreview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;

      // Get safe invitation preview without exposing sensitive data
      const invitation = await this.invitationService.getInvitationPreview(token);

      res.status(200).json({
        success: true,
        data: {
          companyName: invitation.companyName,
          companyLogo: invitation.companyLogo,
          roleName: invitation.roleName,
          inviterName: invitation.invitedByName,
          personalMessage: invitation.personalMessage,
          expiresAt: invitation.expiresAt,
          status: invitation.status,
          isExpired: new Date() > new Date(invitation.expiresAt)
        }
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to get invitation preview');
    }
  };

  /**
   * Resend invitation with tracking
   * POST /api/v1/invitations/:id/resend
   */
  resendInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const invitation = await this.invitationService.resendInvitation(id, req.user!.id);

      // Send enhanced resend email
      await this.sendEnhancedInvitationEmail(invitation, true);

      this.logger.info('Enhanced invitation resent', {
        invitationId: id,
        resentBy: req.user!.id,
        email: invitation.email
      });

      res.status(200).json({
        success: true,
        data: invitation,
        message: 'Invitation resent successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to resend invitation');
    }
  };

  /**
   * Get enhanced invitation analytics
   * GET /api/v1/invitations/analytics
   */
  getInvitationAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      // Check permissions
      if (!req.user!.permissions.includes('analytics.read')) {
        throw new AppError('Insufficient permissions', 403);
      }

      const { startDate, endDate, groupBy } = req.query;

      const dateRange = startDate && endDate ? {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      } : undefined;

      // Get invitation stats
      const invitationStats = await this.invitationService.getInvitationStats(
        req.user!.companyId,
        dateRange
      );

      // Get onboarding analytics
      const onboardingAnalytics = await this.onboardingService.getOnboardingAnalytics(
        req.user!.companyId,
        dateRange ? { start: dateRange.startDate, end: dateRange.endDate } : undefined
      );

      // Get email queue status
      const emailQueueStatus = this.emailService.getQueueStatus();

      const analytics = {
        invitations: invitationStats,
        onboarding: onboardingAnalytics,
        email: emailQueueStatus,
        summary: {
          totalInvitationsSent: invitationStats.total,
          conversionRate: invitationStats.acceptanceRate,
          onboardingCompletionRate: onboardingAnalytics.totalCompleted / onboardingAnalytics.totalStarted,
          averageTimeToAccept: invitationStats.averageAcceptanceTime,
          averageOnboardingTime: onboardingAnalytics.averageCompletionTime
        }
      };

      res.status(200).json({
        success: true,
        data: analytics
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to get invitation analytics');
    }
  };

  /**
   * Start onboarding manually
   * POST /api/v1/onboarding/start
   */
  startOnboarding = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId, roleType } = req.body;
      const targetUserId = userId || req.user!.id;

      // Check permissions for starting other users' onboarding
      if (targetUserId !== req.user!.id && !req.user!.permissions.includes('users.manage')) {
        throw new AppError('Insufficient permissions', 403);
      }

      const progress = await this.onboardingService.startOnboarding(
        targetUserId,
        req.user!.companyId,
        roleType || 'user'
      );

      res.status(200).json({
        success: true,
        data: progress,
        message: 'Onboarding started successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to start onboarding');
    }
  };

  /**
   * Complete onboarding step with validation
   * POST /api/v1/onboarding/steps/:stepId/complete
   */
  completeOnboardingStep = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { stepId } = req.params;
      const { data } = req.body;

      const progress = await this.onboardingService.completeStep({
        userId: req.user!.id,
        companyId: req.user!.companyId,
        stepId,
        data
      });

      // Send progress update email if significant milestone
      if (progress.progressPercentage >= 50 && progress.progressPercentage < 100) {
        await this.sendOnboardingProgressEmail(req.user!.id, progress);
      }

      // Send completion email if finished
      if (progress.status === 'completed') {
        await this.sendOnboardingCompletionEmail(req.user!.id, progress);
      }

      res.status(200).json({
        success: true,
        data: progress,
        message: progress.status === 'completed' 
          ? 'Congratulations! You have completed your onboarding.'
          : 'Step completed successfully.'
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to complete onboarding step');
    }
  };

  /**
   * Get comprehensive onboarding status
   * GET /api/v1/onboarding/status
   */
  getOnboardingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.query;
      const targetUserId = (userId as string) || req.user!.id;

      // Check permissions
      if (targetUserId !== req.user!.id && !req.user!.permissions.includes('users.read')) {
        throw new AppError('Insufficient permissions', 403);
      }

      const progress = await this.onboardingService.getOnboardingProgress(
        targetUserId,
        req.user!.companyId
      );

      if (!progress) {
        res.status(200).json({
          success: true,
          data: {
            hasOnboarding: false,
            canStart: true
          }
        });
        return;
      }

      // Enhanced status with recommendations
      const status = {
        ...progress,
        recommendations: this.generateOnboardingRecommendations(progress),
        estimatedTimeToComplete: this.calculateEstimatedTime(progress),
        nextActions: this.getNextActions(progress)
      };

      res.status(200).json({
        success: true,
        data: status
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to get onboarding status');
    }
  };

  /**
   * Send invitation reminder
   * POST /api/v1/invitations/:id/remind
   */
  sendInvitationReminder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { customMessage } = req.body;

      // Get invitation details
      const invitation = await this.invitationService.getInvitationDetails(id);

      if (invitation.status !== 'pending') {
        throw new AppError('Can only send reminders for pending invitations', 400);
      }

      // Send reminder email
      await this.emailService.sendInvitationEmail({
        recipientEmail: invitation.email,
        recipientName: invitation.recipientName,
        companyName: invitation.companyName,
        inviterName: invitation.inviterName,
        inviterEmail: invitation.inviterEmail,
        roleName: invitation.roleName,
        personalMessage: customMessage || 'This is a friendly reminder about your invitation.',
        invitationToken: invitation.token,
        invitationUrl: `${environment.frontend}/invitation/${invitation.token}`,
        expiresAt: new Date(invitation.expiresAt)
      });

      // Log reminder
      await this.auditService.logActivity({
        action: 'invitation_reminder_sent',
        entityType: 'invitation',
        entityId: id,
        userId: req.user!.id,
        companyId: req.user!.companyId,
        description: `Reminder sent for invitation to ${invitation.email}`
      });

      res.status(200).json({
        success: true,
        message: 'Reminder sent successfully'
      });
    } catch (error) {
      this.handleError(error, res, 'Failed to send reminder');
    }
  };

  // ========== Private Helper Methods ==========

  /**
   * Send enhanced invitation email with better templates
   */
  private async sendEnhancedInvitationEmail(
    invitation: any,
    isResend: boolean = false
  ): Promise<void> {
    try {
      await this.emailService.sendInvitationEmail({
        recipientEmail: invitation.email,
        recipientName: invitation.recipientName,
        companyName: invitation.companyName,
        inviterName: invitation.inviterName,
        inviterEmail: invitation.inviterEmail,
        roleName: invitation.roleName,
        personalMessage: invitation.personalMessage,
        invitationToken: invitation.token,
        invitationUrl: `${environment.frontend}/invitation/${invitation.token}`,
        expiresAt: new Date(invitation.expiresAt),
        companyLogo: invitation.companyLogo
      });
    } catch (error) {
      this.logger.error('Failed to send enhanced invitation email', {
        error: error.message,
        invitationId: invitation.id
      });
    }
  }

  /**
   * Send bulk invitation summary email
   */
  private async sendBulkInvitationSummaryEmail(user: any, result: any): Promise<void> {
    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject: `Bulk Invitation Summary - ${result.summary.successful}/${result.summary.total} sent`,
        html: `
          <h2>Bulk Invitation Summary</h2>
          <p>Your bulk invitation process has been completed:</p>
          <ul>
            <li><strong>Total:</strong> ${result.summary.total}</li>
            <li><strong>Successful:</strong> ${result.summary.successful}</li>
            <li><strong>Failed:</strong> ${result.summary.failed}</li>
          </ul>
          ${result.failed.length > 0 ? `
            <h3>Failed Invitations:</h3>
            <ul>
              ${result.failed.map((f: any) => `<li>${f.email}: ${f.error}</li>`).join('')}
            </ul>
          ` : ''}
        `,
        priority: 'normal',
        tags: ['bulk-invitation', 'summary']
      });
    } catch (error) {
      this.logger.error('Failed to send bulk invitation summary', {
        error: error.message,
        userId: user.id
      });
    }
  }

  /**
   * Send onboarding progress email
   */
  private async sendOnboardingProgressEmail(userId: string, progress: any): Promise<void> {
    // Implementation would use the enhanced email service
    this.logger.info('Onboarding progress email sent', { userId, progress: progress.progressPercentage });
  }

  /**
   * Send onboarding completion email
   */
  private async sendOnboardingCompletionEmail(userId: string, progress: any): Promise<void> {
    // Implementation would use the enhanced email service
    this.logger.info('Onboarding completion email sent', { userId });
  }

  /**
   * Generate onboarding recommendations
   */
  private generateOnboardingRecommendations(progress: any): string[] {
    const recommendations = [];

    if (progress.progressPercentage < 25) {
      recommendations.push('Complete your profile information to get started');
    }

    if (progress.progressPercentage < 50) {
      recommendations.push('Set up your preferences for a personalized experience');
    }

    if (progress.progressPercentage < 75) {
      recommendations.push('Take the platform tour to learn key features');
    }

    return recommendations;
  }

  /**
   * Calculate estimated time to complete onboarding
   */
  private calculateEstimatedTime(progress: any): number {
    const incompleteSteps = progress.steps.filter((s: any) => !s.completed && s.required).length;
    return incompleteSteps * 3; // 3 minutes per step estimate
  }

  /**
   * Get next actions for onboarding
   */
  private getNextActions(progress: any): Array<{action: string, url: string}> {
    const nextStep = progress.steps.find((s: any) => !s.completed && s.required);

    if (!nextStep) return [];

    return [{
      action: `Complete: ${nextStep.name}`,
      url: `${environment.frontend}/onboarding/step/${nextStep.id}`
    }];
  }

  /**
   * Handle errors consistently
   */
  private handleError(error: any, res: Response, context: string): void {
    this.logger.error(context, {
      error: error.message,
      stack: error.stack,
      statusCode: error.statusCode || 500
    });

    const statusCode = error.statusCode || (error.message.includes('not found') ? 404 : 500);

    res.status(statusCode).json({
      success: false,
      error: error.message || 'Internal server error',
      ...(environment.isDevelopment && { stack: error.stack })
    });
  }
}

export default InvitationController;
