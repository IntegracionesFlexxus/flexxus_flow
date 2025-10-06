/**
 * Onboarding Service - Sprint 3
 * Servicio completo de onboarding para nuevos usuarios
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IUserRepository } from '@/shared/interfaces/repositories/IUserRepository';
import { ICompanyRepository } from '@/shared/interfaces/repositories/ICompanyRepository';
import { EmailService } from '@/modules/users/services/EmailService';
import { AuditService } from '@/modules/users/services/AuditService';
import { AppError, ErrorCode } from '@/shared/errors/AppError';
import { environment } from '@/config/environment';
// Types and DTOs
export interface OnboardingStep {
  id: string;
  name: string;
  description: string;
  order: number;
  required: boolean;
  completed: boolean;
  completedAt?: Date;
  data?: any;
}
export interface OnboardingProgress {
  userId: string;
  companyId: string;
  currentStep: number;
  totalSteps: number;
  steps: OnboardingStep[];
  progressPercentage: number;
  startedAt: Date;
  completedAt?: Date;
  status: 'in_progress' | 'completed' | 'abandoned';
}
export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  roleType: string;
  steps: OnboardingStepTemplate[];
  estimatedMinutes: number;
}
export interface OnboardingStepTemplate {
  id: string;
  name: string;
  description: string;
  order: number;
  required: boolean;
  component: string;
  validations?: any[];
  helpContent?: string;
}
export interface CompleteStepRequest {
  userId: string;
  companyId: string;
  stepId: string;
  data: any;
}
export interface OnboardingAnalytics {
  totalStarted: number;
  totalCompleted: number;
  totalAbandoned: number;
  averageCompletionTime: number;
  stepCompletionRates: Record<string, number>;
  dropOffPoints: Array<{
    stepId: string;
    stepName: string;
    dropOffRate: number;
  }>;
}
/**
 * OnboardingService - Gestión completa del proceso de onboarding
 * Implementa patrón State para el flujo de onboarding
 */
@injectable()
export class OnboardingService {
  private onboardingCache: Map<string, OnboardingProgress> = new Map();
  private templates: Map<string, OnboardingTemplate> = new Map();
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.CompanyRepository) private companyRepository: ICompanyRepository,
    @inject(TYPES.EmailService) private emailService: EmailService,
    @inject(TYPES.AuditService) private auditService: AuditService,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.initializeTemplates();
  }
  /**
   * Initialize onboarding templates
   */
  private initializeTemplates(): void {
    // Admin onboarding template
    this.templates.set('admin', {
      id: 'admin-onboarding',
      name: 'Administrator Onboarding',
      description: 'Complete onboarding process for administrators',
      roleType: 'admin',
      estimatedMinutes: 30,
      steps: [
        {
          id: 'personal-info',
          name: 'Personal Information',
          description: 'Complete your profile information',
          order: 1,
          required: true,
          component: 'PersonalInfoForm',
          validations: ['required_fields', 'phone_format']
        },
        {
          id: 'company-setup',
          name: 'Company Setup',
          description: 'Configure your company settings',
          order: 2,
          required: true,
          component: 'CompanySetupForm',
          validations: ['company_name', 'industry', 'size']
        },
        {
          id: 'team-invitations',
          name: 'Invite Team Members',
          description: 'Invite your team to join',
          order: 3,
          required: false,
          component: 'TeamInvitationForm',
          helpContent: 'You can skip this step and invite team members later'
        },
        {
          id: 'preferences',
          name: 'Preferences',
          description: 'Set your notification and display preferences',
          order: 4,
          required: true,
          component: 'PreferencesForm'
        },
        {
          id: 'security-setup',
          name: 'Security Setup',
          description: 'Configure two-factor authentication',
          order: 5,
          required: true,
          component: 'SecuritySetupForm',
          validations: ['2fa_setup']
        },
        {
          id: 'welcome-tour',
          name: 'Platform Tour',
          description: 'Take a quick tour of the platform',
          order: 6,
          required: false,
          component: 'WelcomeTour'
        }
      ]
    });
    // Regular user onboarding template
    this.templates.set('user', {
      id: 'user-onboarding',
      name: 'User Onboarding',
      description: 'Onboarding process for regular users',
      roleType: 'user',
      estimatedMinutes: 15,
      steps: [
        {
          id: 'personal-info',
          name: 'Personal Information',
          description: 'Complete your profile',
          order: 1,
          required: true,
          component: 'PersonalInfoForm'
        },
        {
          id: 'preferences',
          name: 'Preferences',
          description: 'Set your preferences',
          order: 2,
          required: true,
          component: 'PreferencesForm'
        },
        {
          id: 'welcome-tour',
          name: 'Platform Tour',
          description: 'Learn the basics',
          order: 3,
          required: false,
          component: 'WelcomeTour'
        }
      ]
    });
    this.logger.info('Onboarding templates initialized', {
      templates: Array.from(this.templates.keys())
    });
  }
  /**
   * Start onboarding process for a user
   */
  async startOnboarding(
    userId: string,
    companyId: string,
    roleType: string = 'user'
  ): Promise<OnboardingProgress> {
    try {
      // Check if onboarding already exists
      const existingProgress = await this.getOnboardingProgress(userId, companyId);
      if (existingProgress && existingProgress.status === 'in_progress') {
        return existingProgress;
      }
      // Get template based on role
      const template = this.templates.get(roleType) || this.templates.get('user')!;
      // Create onboarding progress
      const progress: OnboardingProgress = {
        userId,
        companyId,
        currentStep: 0,
        totalSteps: template.steps.length,
        steps: template.steps.map(step => ({
          id: step.id,
          name: step.name,
          description: step.description,
          order: step.order,
          required: step.required,
          completed: false
        })),
        progressPercentage: 0,
        startedAt: new Date(),
        status: 'in_progress'
      };
      // Save to database
      await this.saveOnboardingProgress(progress);
      // Send welcome email with onboarding link
      await this.sendOnboardingStartEmail(userId, companyId, template);
      // Audit
      await this.auditService.logActivity({
        action: 'onboarding_started',
        entityType: 'onboarding',
        entityId: userId,
        userId,
        companyId,
        description: 'User started onboarding process',
        metadata: { roleType, templateId: template.id }
      });
      this.logger.info('Onboarding started', {
        userId,
        companyId,
        roleType,
        totalSteps: template.steps.length
      });
      return progress;
    } catch (error) {
      this.logger.error('Failed to start onboarding', {
        error: error.message,
        userId,
        companyId,
        roleType
      });
      throw error;
    }
  }
  /**
   * Complete an onboarding step
   */
  async completeStep(request: CompleteStepRequest): Promise<OnboardingProgress> {
    try {
      const progress = await this.getOnboardingProgress(
        request.userId,
        request.companyId
      );
      if (!progress) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Onboarding not found', 404);
      }
      if (progress.status === 'completed') {
        throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Onboarding already completed', 400);
      }
      // Find and update step
      const stepIndex = progress.steps.findIndex(s => s.id === request.stepId);
      if (stepIndex === -1) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Step not found', 404);
      }
      const step = progress.steps[stepIndex];
      // Validate step data
      await this.validateStepData(step, request.data);
      // Mark step as completed
      step.completed = true;
      step.completedAt = new Date();
      step.data = request.data;
      // Update current step
      const nextIncompleteStep = progress.steps.find(s => !s.completed && s.required);
      if (nextIncompleteStep) {
        progress.currentStep = nextIncompleteStep.order;
      } else {
        progress.currentStep = progress.totalSteps;
      }
      // Calculate progress
      const completedSteps = progress.steps.filter(s => s.completed).length;
      const requiredSteps = progress.steps.filter(s => s.required).length;
      const completedRequired = progress.steps.filter(s => s.required && s.completed).length;
      progress.progressPercentage = Math.round((completedRequired / requiredSteps) * 100);
      // Check if onboarding is complete
      if (completedRequired === requiredSteps) {
        progress.status = 'completed';
        progress.completedAt = new Date();
        await this.onOnboardingComplete(request.userId, request.companyId);
      }
      // Save progress
      await this.saveOnboardingProgress(progress);
      // Send progress email if milestone reached
      if (completedSteps % 2 === 0 && progress.status === 'in_progress') {
        await this.sendProgressEmail(request.userId, request.companyId, progress);
      }
      // Audit
      await this.auditService.logActivity({
        action: 'onboarding_step_completed',
        entityType: 'onboarding',
        entityId: request.userId,
        userId: request.userId,
        companyId: request.companyId,
        description: `Completed onboarding step: ${step.name}`,
        metadata: {
          stepId: step.id,
          stepOrder: step.order,
          progressPercentage: progress.progressPercentage
        }
      });
      this.logger.info('Onboarding step completed', {
        userId: request.userId,
        companyId: request.companyId,
        stepId: request.stepId,
        progress: progress.progressPercentage
      });
      return progress;
    } catch (error) {
      this.logger.error('Failed to complete onboarding step', {
        error: error.message,
        request
      });
      throw error;
    }
  }
  /**
   * Skip an optional onboarding step
   */
  async skipStep(
    userId: string,
    companyId: string,
    stepId: string
  ): Promise<OnboardingProgress> {
    try {
      const progress = await this.getOnboardingProgress(userId, companyId);
      if (!progress) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Onboarding not found', 404);
      }
      const step = progress.steps.find(s => s.id === stepId);
      if (!step) {
        throw new AppError(ErrorCode.RESOURCE_NOT_FOUND, 'Step not found', 404);
      }
      if (step.required) {
        throw new AppError(ErrorCode.BUSINESS_RULE_VIOLATION, 'Cannot skip required step', 400);
      }
      step.completed = true;
      step.completedAt = new Date();
      step.data = { skipped: true };
      // Update progress
      const completedRequired = progress.steps.filter(s => s.required && s.completed).length;
      const requiredSteps = progress.steps.filter(s => s.required).length;
      progress.progressPercentage = Math.round((completedRequired / requiredSteps) * 100);
      await this.saveOnboardingProgress(progress);
      this.logger.info('Onboarding step skipped', {
        userId,
        companyId,
        stepId
      });
      return progress;
    } catch (error) {
      this.logger.error('Failed to skip onboarding step', {
        error: error.message,
        userId,
        companyId,
        stepId
      });
      throw error;
    }
  }
  /**
   * Get onboarding progress for a user
   */
  async getOnboardingProgress(
    userId: string,
    companyId: string
  ): Promise<OnboardingProgress | null> {
    try {
      // Check cache first
      const cacheKey = `${userId}-${companyId}`;
      if (this.onboardingCache.has(cacheKey)) {
        return this.onboardingCache.get(cacheKey)!;
      }
      // Load from database
      const progress = await this.loadOnboardingProgress(userId, companyId);
      if (progress) {
        this.onboardingCache.set(cacheKey, progress);
      }
      return progress;
    } catch (error) {
      this.logger.error('Failed to get onboarding progress', {
        error: error.message,
        userId,
        companyId
      });
      return null;
    }
  }
  /**
   * Reset onboarding for a user
   */
  async resetOnboarding(
    userId: string,
    companyId: string
  ): Promise<OnboardingProgress> {
    try {
      // Delete existing progress
      await this.deleteOnboardingProgress(userId, companyId);
      // Clear cache
      const cacheKey = `${userId}-${companyId}`;
      this.onboardingCache.delete(cacheKey);
      // Start fresh onboarding
      const user = await this.userRepository.findById(userId);
      const roleType = user?.role || 'user';
      return await this.startOnboarding(userId, companyId, roleType);
    } catch (error) {
      this.logger.error('Failed to reset onboarding', {
        error: error.message,
        userId,
        companyId
      });
      throw error;
    }
  }
  /**
   * Get onboarding analytics
   */
  async getOnboardingAnalytics(
    companyId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<OnboardingAnalytics> {
    try {
      // This would query the database for analytics
      // For now, returning mock data
      const analytics: OnboardingAnalytics = {
        totalStarted: 150,
        totalCompleted: 120,
        totalAbandoned: 30,
        averageCompletionTime: 25 * 60 * 1000, // 25 minutes in ms
        stepCompletionRates: {
          'personal-info': 0.95,
          'company-setup': 0.88,
          'team-invitations': 0.65,
          'preferences': 0.92,
          'security-setup': 0.78,
          'welcome-tour': 0.45
        },
        dropOffPoints: [
          {
            stepId: 'team-invitations',
            stepName: 'Invite Team Members',
            dropOffRate: 0.12
          },
          {
            stepId: 'security-setup',
            stepName: 'Security Setup',
            dropOffRate: 0.10
          }
        ]
      };
      return analytics;
    } catch (error) {
      this.logger.error('Failed to get onboarding analytics', {
        error: error.message,
        companyId
      });
      throw error;
    }
  }
  // ========== Private Helper Methods ==========
  /**
   * Validate step data
   */
  private async validateStepData(step: OnboardingStep, data: any): Promise<void> {
    // Implement validation logic based on step requirements
    if (!data) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Step data is required', 400);
    }
    // Step-specific validations would go here
    switch (step.id) {
      case 'personal-info':
        if (!data.firstName || !data.lastName) {
          throw new AppError(ErrorCode.VALIDATION_ERROR, 'First name and last name are required', 400);
        }
        break;
      case 'company-setup':
        if (!data.companyName) {
          throw new AppError(ErrorCode.VALIDATION_ERROR, 'Company name is required', 400);
        }
        break;
      // Add more validations as needed
    }
  }
  /**
   * Handle onboarding completion
   */
  private async onOnboardingComplete(userId: string, companyId: string): Promise<void> {
    try {
      // Update user status
      await this.userRepository.update(userId, {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date()
      });
      // Send completion email
      await this.sendCompletionEmail(userId, companyId);
      // Grant completion rewards (if any)
      await this.grantCompletionRewards(userId, companyId);
      // Audit
      await this.auditService.logActivity({
        action: 'onboarding_completed',
        entityType: 'onboarding',
        entityId: userId,
        userId,
        companyId,
        description: 'User completed onboarding process'
      });
      this.logger.info('Onboarding completed', {
        userId,
        companyId
      });
    } catch (error) {
      this.logger.error('Error in onboarding completion handler', {
        error: error.message,
        userId,
        companyId
      });
    }
  }
  /**
   * Grant rewards for completing onboarding
   */
  private async grantCompletionRewards(userId: string, companyId: string): Promise<void> {
    // Implement reward logic
    // Could include: badges, extended trial, feature unlocks, etc.
    this.logger.info('Completion rewards granted', {
      userId,
      companyId
    });
  }
  /**
   * Send onboarding start email
   */
  private async sendOnboardingStartEmail(
    userId: string,
    companyId: string,
    template: OnboardingTemplate
  ): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      const company = await this.companyRepository.findById(companyId);
      if (!user || !company) return;
      await this.emailService.sendWelcomeEmail({
        recipientEmail: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: company.name,
        roleName: user.role,
        dashboardUrl: `${environment.frontend}/onboarding`,
        setupProfileUrl: `${environment.frontend}/onboarding/profile`,
        helpCenterUrl: `${environment.frontend}/help`
      });
    } catch (error) {
      this.logger.error('Failed to send onboarding start email', {
        error: error.message,
        userId
      });
    }
  }
  /**
   * Send progress email
   */
  private async sendProgressEmail(
    userId: string,
    companyId: string,
    progress: OnboardingProgress
  ): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      const company = await this.companyRepository.findById(companyId);
      if (!user || !company) return;
      const completedTasks = progress.steps
        .filter(s => s.completed)
        .map(s => s.name);
      const pendingTasks = progress.steps
        .filter(s => !s.completed && s.required)
        .map(s => s.name);
      await this.emailService.sendOnboardingEmail({
        recipientEmail: user.email,
        firstName: user.firstName,
        companyName: company.name,
        currentStep: progress.currentStep,
        totalSteps: progress.totalSteps,
        nextStepUrl: `${environment.frontend}/onboarding/step/${progress.currentStep}`,
        progressPercentage: progress.progressPercentage,
        completedTasks,
        pendingTasks
      });
    } catch (error) {
      this.logger.error('Failed to send progress email', {
        error: error.message,
        userId,
        progress: progress.progressPercentage
      });
    }
  }
  /**
   * Send completion email
   */
  private async sendCompletionEmail(userId: string, companyId: string): Promise<void> {
    try {
      const user = await this.userRepository.findById(userId);
      const company = await this.companyRepository.findById(companyId);
      if (!user || !company) return;
      // Send a special completion email
      await this.emailService.sendEmail({
        to: user.email,
        subject: `¡Felicitaciones ${user.firstName}! Has completado tu onboarding`,
        html: `
          <h2>¡Onboarding Completado!</h2>
          <p>Has completado exitosamente el proceso de onboarding en ${company.name}.</p>
          <p>Ahora tienes acceso completo a todas las funcionalidades de la plataforma.</p>
          <a href="${environment.frontend}/dashboard">Ir al Dashboard</a>
        `,
        priority: 'normal',
        tags: ['onboarding', 'completion']
      });
    } catch (error) {
      this.logger.error('Failed to send completion email', {
        error: error.message,
        userId
      });
    }
  }
  /**
   * Save onboarding progress to database
   */
  private async saveOnboardingProgress(progress: OnboardingProgress): Promise<void> {
    // Save to database
    // This would be implemented with the actual repository
    const cacheKey = `${progress.userId}-${progress.companyId}`;
    this.onboardingCache.set(cacheKey, progress);
  }
  /**
   * Load onboarding progress from database
   */
  private async loadOnboardingProgress(
    userId: string,
    companyId: string
  ): Promise<OnboardingProgress | null> {
    // Load from database
    // This would be implemented with the actual repository
    return null;
  }
  /**
   * Delete onboarding progress
   */
  private async deleteOnboardingProgress(
    userId: string,
    companyId: string
  ): Promise<void> {
    // Delete from database
    // This would be implemented with the actual repository
    const cacheKey = `${userId}-${companyId}`;
    this.onboardingCache.delete(cacheKey);
  }
}
