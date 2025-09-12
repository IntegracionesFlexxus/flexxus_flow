/**
 * Enhanced Email Service - Sprint 3
 * Servicio completo de emails con soporte para múltiples providers
 * Siguiendo principios SOLID y Clean Code del Nivel 2
 */
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TYPES } from '@/container/types';
import { AppError } from '@/shared/errors/AppError';
import { ILoggerService } from '@/shared/services/logger/LoggerService';
import { environment } from '@/config/environment';

// Email Provider Interface - Strategy Pattern
export interface IEmailProvider {
  sendEmail(options: EmailOptions): Promise<EmailResult>;
  validateConnection(): Promise<boolean>;
  getName(): string;
}
// Types and DTOs
export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  priority?: 'high' | 'normal' | 'low';
  replyTo?: string;
  tags?: string[];
}
export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
  encoding?: string;
}
export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  envelope?: {
    from: string;
    to: string[];
  };
  response?: string;
}
export interface EmailTemplate {
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
  variables: string[];
}
export interface EmailQueueItem extends EmailOptions {
  id: string;
  attempts: number;
  maxAttempts: number;
  lastAttempt?: Date;
  nextRetry?: Date;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  error?: string;
  metadata?: Record<string, any>;
}
// Template Data Types
export interface InvitationEmailData {
  recipientEmail: string;
  recipientName?: string;
  companyName: string;
  inviterName: string;
  inviterEmail: string;
  roleName: string;
  personalMessage?: string;
  invitationToken: string;
  invitationUrl: string;
  expiresAt: Date;
  companyLogo?: string;
}
export interface WelcomeEmailData {
  recipientEmail: string;
  firstName: string;
  lastName: string;
  companyName: string;
  roleName: string;
  dashboardUrl: string;
  setupProfileUrl: string;
  helpCenterUrl: string;
  companyLogo?: string;
}
export interface PasswordResetEmailData {
  recipientEmail: string;
  firstName: string;
  resetToken: string;
  resetUrl: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}
export interface OnboardingEmailData {
  recipientEmail: string;
  firstName: string;
  companyName: string;
  currentStep: number;
  totalSteps: number;
  nextStepUrl: string;
  progressPercentage: number;
  completedTasks: string[];
  pendingTasks: string[];
}
/**
 * SMTP Email Provider Implementation
 */
class SMTPProvider implements IEmailProvider {
  private transporter: Transporter;
  private readonly fromEmail: string;
  private readonly fromName: string;
  constructor(
    host: string,
    port: number,
    secure: boolean,
    user: string,
    pass: string,
    fromEmail: string,
    fromName: string
  ,
    @inject(TYPES.LoggerService) private logger: ILoggerService) {
    this.fromEmail = fromEmail;
    this.fromName = fromName;
    this.transporter = nodemailer.createTransporter({
      host,
      port,
      secure,
      auth: { user, pass },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 10 // max 10 messages per second
    });
  }
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const mailOptions = {
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
      headers: options.headers,
      priority: options.priority,
      replyTo: options.replyTo
    };
    const info = await this.transporter.sendMail(mailOptions);
    return {
      messageId: info.messageId,
      accepted: info.accepted || [],
      rejected: info.rejected || [],
      envelope: info.envelope,
      response: info.response
    };
  }
  async validateConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch {
      return false;
    }
  }
  getName(): string {
    return 'SMTP';
  }
}
/**
 * Development Console Provider
 */
class ConsoleProvider implements IEmailProvider {
  private readonly logger: Logger;
  constructor(logger: Logger) {
    this.logger = logger;
  }
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    this.logger.info('📧 EMAIL (DEVELOPMENT MODE)', {
      to: options.to,
      subject: options.subject,
      priority: options.priority,
      tags: options.tags,
      htmlLength: options.html?.length,
      textLength: options.text?.length,
      attachments: options.attachments?.length || 0
    });
    // Log email content in development
    if (environment.email.logContent) {
      this.logger.info('\n=== EMAIL CONTENT ===');
      this.logger.info('Subject:', options.subject);
      this.logger.info('To:', options.to);
      if (options.text) {
        this.logger.info('\n--- Text Content ---');
        this.logger.info(options.text.substring(0, 500));
      }
      this.logger.info('===================\n');
    }
    const recipients = Array.isArray(options.to) ? options.to : [options.to];
    return {
      messageId: `dev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      accepted: recipients,
      rejected: [],
      response: 'Email logged to console (development mode)'
    };
  }
  async validateConnection(): Promise<boolean> {
    return true;
  }
  getName(): string {
    return 'Console';
  }
}
/**
 * Enhanced Email Service
 * Responsabilidad única: Gestión completa de emails con múltiples providers
 */
@injectable()
export class EmailService {
  private provider: IEmailProvider;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();
  private queue: EmailQueueItem[] = [];
  private processing = false;
  private readonly templatesPath: string;
  private readonly maxRetries = 3;
  private readonly retryDelay = 60000; // 1 minute
  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.templatesPath = path.join(__dirname, '../templates/email');
    this.initializeProvider();
    this.loadTemplates();
    this.startQueueProcessor();
  }
  /**
   * Initialize email provider based on environment
   */
  private initializeProvider(): void {
    const env = environment.nodeEnv || 'development';
    if (env === 'development' || env === 'test') {
      this.provider = new ConsoleProvider(this.logger);
    } else {
      // Production SMTP configuration
      this.provider = new SMTPProvider(
        environment.email.smtp.host,
        parseInt(environment.email.smtp.port),
        process.env.SMTP_SECURE === 'true',
        environment.email.smtp.user,
        environment.email.smtp.pass,
        environment.email.fromEmail,
        environment.email.fromName
      );
    }
    // Validate connection on startup
    this.validateProvider();
  }
  /**
   * Validate provider connection
   */
  private async validateProvider(): Promise<void> {
    try {
      const isValid = await this.provider.validateConnection();
      if (isValid) {
        this.logger.info(`Email provider ${this.provider.getName()} connected successfully`);
      } else {
        this.logger.warn(`Email provider ${this.provider.getName()} connection validation failed`);
      }
    } catch (error) {
      this.logger.error('Error validating email provider', { error: error.message });
    }
  }
  /**
   * Load and compile email templates
   */
  private async loadTemplates(): Promise<void> {
    try {
      // Register Handlebars helpers
      this.registerHandlebarsHelpers();
      // Load template files
      const templateFiles = [
        'invitation.hbs',
        'welcome.hbs',
        'password-reset.hbs',
        'onboarding.hbs',
        'invitation-reminder.hbs',
        'account-activation.hbs'
      ];
      for (const file of templateFiles) {
        try {
          const templatePath = path.join(this.templatesPath, file);
          const templateContent = await fs.readFile(templatePath, 'utf-8');
          const compiled = handlebars.compile(templateContent);
          const templateName = path.basename(file, '.hbs');
          this.templates.set(templateName, compiled);
          this.logger.debug(`Loaded email template: ${templateName}`);
        } catch (error) {
          this.logger.warn(`Could not load template ${file}:`, error.message);
        }
      }
    } catch (error) {
      this.logger.error('Error loading email templates:', error);
    }
  }
  /**
   * Register Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    handlebars.registerHelper('formatDate', (date: Date) => {
      return date.toLocaleDateString('es-AR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });
    handlebars.registerHelper('formatTime', (date: Date) => {
      return date.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    });
    handlebars.registerHelper('ifEquals', (a: any, b: any, options: any) => {
      return a === b ? options.fn(this) : options.inverse(this);
    });
    handlebars.registerHelper('percentage', (value: number) => {
      return Math.round(value * 100);
    });
  }
  /**
   * Send invitation email
   */
  async sendInvitationEmail(data: InvitationEmailData): Promise<void> {
    try {
      const template = this.templates.get('invitation');
      if (!template) {
        throw new AppError('Invitation template not found', 500);
      }
      const html = template({
        ...data,
        year: new Date().getFullYear(),
        supportEmail: environment.email.supportEmail
      });
      const emailOptions: EmailOptions = {
        to: data.recipientEmail,
        subject: `${data.inviterName} te ha invitado a ${data.companyName}`,
        html,
        priority: 'normal',
        tags: ['invitation', 'onboarding'],
        headers: {
          'X-Invitation-Token': data.invitationToken
        }
      };
      await this.sendEmail(emailOptions);
      this.logger.info('Invitation email sent', {
        recipient: data.recipientEmail,
        company: data.companyName,
        inviter: data.inviterEmail
      });
    } catch (error) {
      this.logger.error('Failed to send invitation email', {
        error: error.message,
        recipient: data.recipientEmail
      });
      throw error;
    }
  }
  /**
   * Send welcome email
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
    try {
      const template = this.templates.get('welcome');
      if (!template) {
        throw new AppError('Welcome template not found', 500);
      }
      const html = template({
        ...data,
        year: new Date().getFullYear(),
        supportEmail: environment.email.supportEmail
      });
      const emailOptions: EmailOptions = {
        to: data.recipientEmail,
        subject: `¡Bienvenido a ${data.companyName}!`,
        html,
        priority: 'high',
        tags: ['welcome', 'onboarding']
      };
      await this.sendEmail(emailOptions);
      this.logger.info('Welcome email sent', {
        recipient: data.recipientEmail,
        company: data.companyName
      });
    } catch (error) {
      this.logger.error('Failed to send welcome email', {
        error: error.message,
        recipient: data.recipientEmail
      });
      throw error;
    }
  }
  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<void> {
    try {
      const template = this.templates.get('password-reset');
      if (!template) {
        throw new AppError('Password reset template not found', 500);
      }
      const html = template({
        ...data,
        year: new Date().getFullYear(),
        supportEmail: environment.email.supportEmail
      });
      const emailOptions: EmailOptions = {
        to: data.recipientEmail,
        subject: 'Restablecer tu contraseña - FlexxusFlow',
        html,
        priority: 'high',
        tags: ['security', 'password-reset'],
        headers: {
          'X-Reset-Token': data.resetToken
        }
      };
      await this.sendEmail(emailOptions);
      this.logger.info('Password reset email sent', {
        recipient: data.recipientEmail,
        ipAddress: data.ipAddress
      });
    } catch (error) {
      this.logger.error('Failed to send password reset email', {
        error: error.message,
        recipient: data.recipientEmail
      });
      throw error;
    }
  }
  /**
   * Send onboarding progress email
   */
  async sendOnboardingEmail(data: OnboardingEmailData): Promise<void> {
    try {
      const template = this.templates.get('onboarding');
      if (!template) {
        throw new AppError('Onboarding template not found', 500);
      }
      const html = template({
        ...data,
        year: new Date().getFullYear(),
        supportEmail: environment.email.supportEmail
      });
      const emailOptions: EmailOptions = {
        to: data.recipientEmail,
        subject: `${data.firstName}, continúa configurando tu cuenta`,
        html,
        priority: 'normal',
        tags: ['onboarding', 'progress']
      };
      await this.sendEmail(emailOptions);
      this.logger.info('Onboarding email sent', {
        recipient: data.recipientEmail,
        step: data.currentStep,
        progress: data.progressPercentage
      });
    } catch (error) {
      this.logger.error('Failed to send onboarding email', {
        error: error.message,
        recipient: data.recipientEmail
      });
      throw error;
    }
  }
  /**
   * Send generic email with queue support
   */
  async sendEmail(options: EmailOptions, useQueue: boolean = true): Promise<EmailResult | string> {
    if (useQueue) {
      const queueItem: EmailQueueItem = {
        ...options,
        id: this.generateEmailId(),
        attempts: 0,
        maxAttempts: this.maxRetries,
        status: 'pending'
      };
      this.queue.push(queueItem);
      this.processQueue(); // Don't await, process in background
      return queueItem.id;
    }
    try {
      const result = await this.provider.sendEmail(options);
      this.logger.info('Email sent successfully', {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject
      });
      return result;
    } catch (error) {
      this.logger.error('Failed to send email', {
        error: error.message,
        to: options.to,
        subject: options.subject
      });
      throw error;
    }
  }
  /**
   * Process email queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    this.processing = true;
    try {
      const pendingItems = this.queue.filter(item => 
        item.status === 'pending' && 
        (!item.nextRetry || item.nextRetry <= new Date())
      );
      for (const item of pendingItems) {
        await this.processQueueItem(item);
      }
      // Remove successfully sent and permanently failed items
      this.queue = this.queue.filter(item => 
        item.status !== 'sent' && 
        !(item.status === 'failed' && item.attempts >= item.maxAttempts)
      );
    } finally {
      this.processing = false;
    }
  }
  /**
   * Process individual queue item
   */
  private async processQueueItem(item: EmailQueueItem): Promise<void> {
    try {
      item.status = 'processing';
      item.attempts++;
      item.lastAttempt = new Date();
      const { id, attempts, maxAttempts, status, lastAttempt, nextRetry, error, metadata, ...emailOptions } = item;
      await this.provider.sendEmail(emailOptions);
      item.status = 'sent';
      this.logger.info('Queued email sent', {
        id: item.id,
        attempts: item.attempts,
        to: item.to,
        subject: item.subject
      });
    } catch (error) {
      item.status = 'failed';
      item.error = error.message;
      if (item.attempts < item.maxAttempts) {
        item.nextRetry = new Date(Date.now() + this.retryDelay * item.attempts);
        item.status = 'pending';
        this.logger.warn('Email send failed, will retry', {
          id: item.id,
          attempt: item.attempts,
          maxAttempts: item.maxAttempts,
          nextRetry: item.nextRetry,
          error: error.message
        });
      } else {
        this.logger.error('Email permanently failed', {
          id: item.id,
          attempts: item.attempts,
          to: item.to,
          subject: item.subject,
          error: error.message
        });
      }
    }
  }
  /**
   * Start queue processor interval
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      this.processQueue();
    }, 10000); // Process queue every 10 seconds
  }
  /**
   * Generate unique email ID
   */
  private generateEmailId(): string {
    return `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  /**
   * Get queue status
   */
  getQueueStatus(): {
    total: number;
    pending: number;
    processing: number;
    failed: number;
  } {
    const pending = this.queue.filter(i => i.status === 'pending').length;
    const processing = this.queue.filter(i => i.status === 'processing').length;
    const failed = this.queue.filter(i => i.status === 'failed').length;
    return {
      total: this.queue.length,
      pending,
      processing,
      failed
    };
  }
  /**
   * Clear email queue
   */
  clearQueue(): void {
    this.queue = [];
    this.logger.info('Email queue cleared');
  }
  /**
   * Retry failed emails
   */
  retryFailed(): void {
    this.queue.forEach(item => {
      if (item.status === 'failed' && item.attempts < item.maxAttempts) {
        item.status = 'pending';
        item.nextRetry = new Date();
      }
    });
    this.processQueue();
  }
}
