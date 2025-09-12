/**
 * Enhanced Email Service with Templates
 * Sprint 4 - Servicio de email con templates y queue
 */
import { injectable, inject, optional } from 'inversify';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { EnhancedCacheService } from '@/shared/services/cache/EnhancedCacheService';
import { environment } from '@/config/environment';
import Bull from 'bull';
import juice from 'juice';
import { htmlToText } from 'html-to-text';
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: {
    name: string;
    email: string;
  };
  templates?: {
    directory: string;
    cache: boolean;
  };
  queue?: {
    enabled: boolean;
    redis: {
      host: string;
      port: number;
    };
    retryAttempts: number;
    retryDelay: number;
  };
}
export interface EmailTemplate {
  name: string;
  subject: string;
  html?: string;
  text?: string;
  layout?: string;
}
export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  template?: string;
  data?: Record<string, any>;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  priority?: 'high' | 'normal' | 'low';
  headers?: Record<string, string>;
  replyTo?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}
export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
  encoding?: string;
  cid?: string;
}
export interface EmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response: string;
  timestamp: Date;
}
export interface EmailQueueJob {
  id: string;
  options: EmailOptions;
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  result?: EmailResult;
  createdAt: Date;
  processedAt?: Date;
}
@injectable()
export class EmailService {
  private transporter?: Transporter;
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();
  private layouts: Map<string, handlebars.TemplateDelegate> = new Map();
  private queue?: Bull.Queue<EmailOptions>;
  private config: EmailConfig;
  private logger?: Logger;
  private cache?: EnhancedCacheService;
  private isInitialized: boolean = false;
  constructor(
    @inject(TYPES.Logger) @optional() logger?: Logger,
    @inject(TYPES.CacheService) @optional() cache?: EnhancedCacheService
  ) {
    this.logger = logger;
    this.cache = cache;
    // Load configuration
    this.config = {
      host: environment.smtp?.host || 'localhost',
      port: environment.smtp?.port || 587,
      secure: environment.smtp?.secure || false,
      auth: {
        user: environment.smtp?.auth?.user || '',
        pass: environment.smtp?.auth?.pass || ''
      },
      from: {
        name: environment.smtp?.from?.name || 'System',
        email: environment.smtp?.from?.email || 'noreply@example.com'
      },
      templates: {
        directory: path.join(process.cwd(), 'templates', 'email'),
        cache: true
      },
      queue: {
        enabled: environment.email?.queue?.enabled || false,
        redis: environment.redis || { host: 'localhost', port: 6379 },
        retryAttempts: 3,
        retryDelay: 60000 // 1 minute
      }
    };
    // Initialize asynchronously
    this.initialize().catch(error => {
      this.logger?.error('Failed to initialize EmailService:', error);
    });
  }
  /**
   * Initialize the email service
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;
    try {
      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5
      });
      // Verify connection
      await this.transporter.verify();
      this.logger?.info('Email transporter configured successfully');
      // Initialize queue if enabled
      if (this.config.queue?.enabled) {
        this.initializeQueue();
      }
      // Register Handlebars helpers
      this.registerHandlebarsHelpers();
      // Load templates
      await this.loadTemplates();
      this.isInitialized = true;
    } catch (error) {
      this.logger?.error('Failed to initialize email service:', error);
      throw error;
    }
  }
  /**
   * Initialize email queue
   */
  private initializeQueue(): void {
    this.queue = new Bull('email-queue', {
      redis: this.config.queue!.redis,
      defaultJobOptions: {
        attempts: this.config.queue!.retryAttempts,
        backoff: {
          type: 'exponential',
          delay: this.config.queue!.retryDelay
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    });
    // Process queue
    this.queue.process(async (job) => {
      return this.sendDirectly(job.data);
    });
    // Queue event handlers
    this.queue.on('completed', (job, result) => {
      this.logger?.info(`Email job ${job.id} completed:`, result.messageId);
    });
    this.queue.on('failed', (job, error) => {
      this.logger?.error(`Email job ${job.id} failed:`, error);
    });
    this.queue.on('stalled', (job) => {
      this.logger?.warn(`Email job ${job.id} stalled`);
    });
    this.logger?.info('Email queue initialized');
  }
  /**
   * Register Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    // Date formatting
    handlebars.registerHelper('formatDate', (date: Date, format: string) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    });
    // Currency formatting
    handlebars.registerHelper('formatCurrency', (amount: number, currency: string = 'USD') => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
      }).format(amount);
    });
    // Conditional helpers
    handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    handlebars.registerHelper('lt', (a: any, b: any) => a < b);
    handlebars.registerHelper('gt', (a: any, b: any) => a > b);
    handlebars.registerHelper('lte', (a: any, b: any) => a <= b);
    handlebars.registerHelper('gte', (a: any, b: any) => a >= b);
    // Array helpers
    handlebars.registerHelper('each', handlebars.helpers.each);
    handlebars.registerHelper('length', (array: any[]) => array?.length || 0);
    // String helpers
    handlebars.registerHelper('uppercase', (str: string) => str?.toUpperCase());
    handlebars.registerHelper('lowercase', (str: string) => str?.toLowerCase());
    handlebars.registerHelper('capitalize', (str: string) => {
      return str?.charAt(0).toUpperCase() + str?.slice(1);
    });
    // URL helpers
    handlebars.registerHelper('url', (path: string) => {
      const baseUrl = environment.app?.baseUrl || 'http://localhost:3000';
      return `${baseUrl}${path}`;
    });
    // Asset helpers
    handlebars.registerHelper('asset', (path: string) => {
      const cdnUrl = environment.cdn?.url || '';
      return cdnUrl ? `${cdnUrl}${path}` : path;
    });
  }
  /**
   * Load email templates
   */
  private async loadTemplates(): Promise<void> {
    try {
      const templatesDir = this.config.templates!.directory;
      // Check if templates directory exists
      try {
        await fs.access(templatesDir);
      } catch {
        this.logger?.warn(`Templates directory does not exist: ${templatesDir}`);
        return;
      }
      // Load layouts
      const layoutsDir = path.join(templatesDir, 'layouts');
      try {
        const layoutFiles = await fs.readdir(layoutsDir);
        for (const file of layoutFiles) {
          if (file.endsWith('.hbs') || file.endsWith('.handlebars')) {
            const name = path.basename(file, path.extname(file));
            const content = await fs.readFile(path.join(layoutsDir, file), 'utf-8');
            this.layouts.set(name, handlebars.compile(content));
            this.logger?.debug(`Loaded layout: ${name}`);
          }
        }
      } catch {
        this.logger?.debug('No layouts directory found');
      }
      // Load templates
      const templateFiles = await fs.readdir(templatesDir);
      for (const file of templateFiles) {
        if (file.endsWith('.hbs') || file.endsWith('.handlebars')) {
          const name = path.basename(file, path.extname(file));
          const content = await fs.readFile(path.join(templatesDir, file), 'utf-8');
          // Parse template metadata
          const template = this.parseTemplate(content);
          this.templates.set(name, handlebars.compile(template.html || content));
          this.logger?.debug(`Loaded template: ${name}`);
        }
      }
      this.logger?.info(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      this.logger?.error('Failed to load email templates:', error);
    }
  }
  /**
   * Parse template with front matter
   */
  private parseTemplate(content: string): EmailTemplate {
    const frontMatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
    const match = content.match(frontMatterRegex);
    if (match) {
      const metadata = this.parseFrontMatter(match[1]);
      return {
        name: metadata.name || 'default',
        subject: metadata.subject || '',
        layout: metadata.layout,
        html: match[2]
      };
    }
    return {
      name: 'default',
      subject: '',
      html: content
    };
  }
  /**
   * Parse front matter
   */
  private parseFrontMatter(content: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = content.split('\n');
    for (const line of lines) {
      const [key, value] = line.split(':').map(s => s.trim());
      if (key && value) {
        result[key] = value;
      }
    }
    return result;
  }
  /**
   * Send email
   */
  async send(options: EmailOptions): Promise<EmailResult> {
    // Ensure service is initialized
    if (!this.isInitialized) {
      await this.initialize();
    }
    // Queue email if queue is enabled
    if (this.config.queue?.enabled && this.queue) {
      const job = await this.queue.add(options, {
        priority: this.getPriority(options.priority),
        delay: 0
      });
      this.logger?.debug(`Email queued with job ID: ${job.id}`);
      // Return placeholder result for queued email
      return {
        messageId: `queued-${job.id}`,
        accepted: Array.isArray(options.to) ? options.to : [options.to],
        rejected: [],
        response: 'Email queued for delivery',
        timestamp: new Date()
      };
    }
    // Send directly
    return this.sendDirectly(options);
  }
  /**
   * Send email directly
   */
  private async sendDirectly(options: EmailOptions): Promise<EmailResult> {
    try {
      // Build email content
      const emailContent = await this.buildEmailContent(options);
      // Prepare mail options
      const mailOptions: nodemailer.SendMailOptions = {
        from: `${this.config.from.name} <${this.config.from.email}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc) : undefined,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        attachments: options.attachments,
        priority: options.priority,
        headers: options.headers,
        replyTo: options.replyTo
      };
      // Send email
      const result = await this.transporter!.sendMail(mailOptions);
      // Log success
      this.logger?.info(`Email sent successfully: ${result.messageId}`);
      // Store in cache for tracking
      if (this.cache && options.tags) {
        await this.cache.setWithTags(
          `email:${result.messageId}`,
          {
            options,
            result,
            timestamp: new Date()
          },
          options.tags,
          86400 // 24 hours
        );
      }
      return {
        messageId: result.messageId,
        accepted: result.accepted || [],
        rejected: result.rejected || [],
        response: result.response,
        timestamp: new Date()
      };
    } catch (error) {
      this.logger?.error('Failed to send email:', error);
      throw error;
    }
  }
  /**
   * Build email content
   */
  private async buildEmailContent(options: EmailOptions): Promise<{
    subject: string;
    html: string;
    text: string;
  }> {
    let subject = options.subject;
    let html = options.html || '';
    let text = options.text || '';
    // Use template if specified
    if (options.template) {
      const cacheKey = `email-template:${options.template}:${JSON.stringify(options.data || {})}`;
      // Check cache
      if (this.cache && this.config.templates?.cache) {
        const cached = await this.cache.get<{ subject: string; html: string; text: string }>(cacheKey);
        if (cached) {
          return cached;
        }
      }
      // Render template
      const template = this.templates.get(options.template);
      if (template) {
        const data = {
          ...options.data,
          year: new Date().getFullYear(),
          company: this.config.from.name,
          unsubscribeUrl: options.data?.unsubscribeUrl || '#'
        };
        html = template(data);
        // Apply layout if specified
        const layoutName = options.data?.layout || 'default';
        const layout = this.layouts.get(layoutName);
        if (layout) {
          html = layout({
            ...data,
            content: html
          });
        }
        // Inline CSS
        html = juice(html);
        // Generate text version
        text = htmlToText(html, {
          wordwrap: 130,
          preserveNewlines: true,
          format: {
            heading: (elem, fn, options) => {
              const text = fn(elem.children, options);
              return '\n' + text.toUpperCase() + '\n' + '='.repeat(text.length) + '\n';
            }
          }
        });
        // Cache rendered template
        if (this.cache && this.config.templates?.cache) {
          await this.cache.set(cacheKey, { subject, html, text }, 3600); // 1 hour
        }
      } else {
        this.logger?.warn(`Template not found: ${options.template}`);
      }
    }
    return { subject, html, text };
  }
  /**
   * Send bulk emails
   */
  async sendBulk(
    recipients: Array<{ email: string; data?: Record<string, any> }>,
    options: Omit<EmailOptions, 'to'>
  ): Promise<Array<{ email: string; result?: EmailResult; error?: string }>> {
    const results: Array<{ email: string; result?: EmailResult; error?: string }> = [];
    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      const batchPromises = batch.map(async (recipient) => {
        try {
          const result = await this.send({
            ...options,
            to: recipient.email,
            data: { ...options.data, ...recipient.data }
          });
          return { email: recipient.email, result };
        } catch (error) {
          this.logger?.error(`Failed to send email to ${recipient.email}:`, error);
          return { email: recipient.email, error: error.message };
        }
      });
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      // Rate limiting delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    return results;
  }
  /**
   * Send verification email
   */
  async sendVerificationEmail(
    to: string,
    data: {
      name: string;
      verificationUrl: string;
      expiresIn?: string;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'Verify your email address',
      template: 'verification',
      data: {
        ...data,
        expiresIn: data.expiresIn || '24 hours'
      },
      priority: 'high'
    });
  }
  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    data: {
      name: string;
      resetUrl: string;
      expiresIn?: string;
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: 'Reset your password',
      template: 'password-reset',
      data: {
        ...data,
        expiresIn: data.expiresIn || '1 hour'
      },
      priority: 'high'
    });
  }
  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    to: string,
    data: {
      name: string;
      loginUrl?: string;
      features?: string[];
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: `Welcome to ${this.config.from.name}!`,
      template: 'welcome',
      data
    });
  }
  /**
   * Send notification email
   */
  async sendNotificationEmail(
    to: string,
    data: {
      title: string;
      message: string;
      actionUrl?: string;
      actionText?: string;
      type?: 'info' | 'success' | 'warning' | 'error';
    }
  ): Promise<EmailResult> {
    return this.send({
      to,
      subject: data.title,
      template: 'notification',
      data: {
        ...data,
        type: data.type || 'info'
      }
    });
  }
  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    if (!this.queue) {
      throw new Error('Email queue is not enabled');
    }
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount()
    ]);
    return { waiting, active, completed, failed, delayed };
  }
  /**
   * Retry failed emails
   */
  async retryFailed(): Promise<number> {
    if (!this.queue) {
      throw new Error('Email queue is not enabled');
    }
    const failed = await this.queue.getFailed();
    let retried = 0;
    for (const job of failed) {
      await job.retry();
      retried++;
    }
    this.logger?.info(`Retried ${retried} failed email jobs`);
    return retried;
  }
  /**
   * Clear completed jobs
   */
  async clearCompleted(): Promise<void> {
    if (!this.queue) {
      throw new Error('Email queue is not enabled');
    }
    await this.queue.clean(0, 'completed');
    this.logger?.info('Cleared completed email jobs');
  }
  /**
   * Get priority value
   */
  private getPriority(priority?: 'high' | 'normal' | 'low'): number {
    switch (priority) {
      case 'high': return 1;
      case 'normal': return 5;
      case 'low': return 10;
      default: return 5;
    }
  }
  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter!.verify();
      return true;
    } catch (error) {
      this.logger?.error('Email connection test failed:', error);
      return false;
    }
  }
  /**
   * Destroy service
   */
  async destroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
    if (this.transporter) {
      this.transporter.close();
    }
    this.templates.clear();
    this.layouts.clear();
    this.isInitialized = false;
    this.logger?.info('Email service destroyed');
  }
}
export default EmailService;
