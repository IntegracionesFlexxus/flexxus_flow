/**
 * Notification Service
 * Sprint 3 - Backend Team
 * Implementación siguiendo lineamientos Nivel 2: SOLID, Clean Code, y patrones de diseño
 * Sistema de notificaciones multi-canal con procesamiento asíncrono
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { INotificationRepository } from '@/modules/notifications/interfaces/INotificationRepository';
import { IEmailService } from '@/modules/auth/interfaces/IEmailService';
import { ICacheService } from '@/interfaces/IServices';
import { IQueueService } from '@/interfaces/IQueueService';
import { environment } from '@/config/environment';

// Enums para tipos y estados
export enum NotificationChannel {
  EMAIL = 'email',
  IN_APP = 'in_app',
  SMS = 'sms',
  PUSH = 'push',
  WEBHOOK = 'webhook'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum NotificationStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum NotificationType {
  // Auth notifications
  WELCOME = 'welcome',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  PASSWORD_CHANGED = 'password_changed',
  LOGIN_SUSPICIOUS = 'login_suspicious',

  // User management
  USER_INVITED = 'user_invited',
  USER_ACTIVATED = 'user_activated',
  USER_DEACTIVATED = 'user_deactivated',
  ROLE_CHANGED = 'role_changed',

  // Company notifications
  COMPANY_CREATED = 'company_created',
  COMPANY_SETTINGS_UPDATED = 'company_settings_updated',
  SUBSCRIPTION_EXPIRING = 'subscription_expiring',

  // System notifications
  MAINTENANCE_SCHEDULED = 'maintenance_scheduled',
  FEATURE_ANNOUNCEMENT = 'feature_announcement',
  SECURITY_ALERT = 'security_alert',

  // Custom notifications
  CUSTOM = 'custom'
}

// DTOs siguiendo principio de responsabilidad única
export interface NotificationRequest {
  type: NotificationType;
  channels: NotificationChannel[];
  recipients: NotificationRecipient[];
  priority?: NotificationPriority;
  templateData?: Record<string, any>;
  metadata?: Record<string, any>;
  scheduledAt?: Date;
  expiresAt?: Date;
  groupId?: string; // Para agrupar notificaciones relacionadas
  deduplicationId?: string; // Para evitar duplicados
}

export interface NotificationRecipient {
  userId?: string;
  email?: string;
  phone?: string;
  deviceToken?: string;
  webhookUrl?: string;
  preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  channels?: NotificationChannel[];
  doNotDisturb?: {
    enabled: boolean;
    startTime?: string; // HH:mm
    endTime?: string; // HH:mm
    timezone?: string;
  };
  frequency?: 'realtime' | 'daily' | 'weekly';
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  body: string;
  htmlBody?: string;
  metadata?: Record<string, any>;
}

export interface NotificationResponse {
  id: string;
  type: NotificationType;
  channels: NotificationChannel[];
  status: NotificationStatus;
  priority: NotificationPriority;
  recipients: number;
  sentCount: number;
  failedCount: number;
  scheduledAt?: Date;
  processedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationDelivery {
  notificationId: string;
  recipientId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  attempts: number;
  metadata?: Record<string, any>;
}

/**
 * NotificationService implementa sistema de notificaciones multi-canal
 * Patrones aplicados:
 * - Strategy: diferentes estrategias para cada canal
 * - Observer: para eventos de notificación
 * - Template Method: para procesamiento de notificaciones
 * - Factory: para crear notificaciones según tipo
 */
@injectable()
export class NotificationService {
  // Cache TTL en segundos
  private readonly CACHE_TTL = 3600; // 1 hora
  private readonly CACHE_PREFIX = 'notifications:';

  // Límites de rate limiting
  private readonly RATE_LIMITS = {
    email: { perMinute: 10, perHour: 100 },
    sms: { perMinute: 5, perHour: 50 },
    push: { perMinute: 20, perHour: 200 }
  };

  // Templates de notificación
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor(
    @inject(TYPES.NotificationRepository) private notificationRepository: INotificationRepository,
    @inject(TYPES.EmailService) private emailService: IEmailService,
    @inject(TYPES.QueueService) private queueService: IQueueService,
    @inject(TYPES.CacheService) private cacheService: ICacheService,
    @inject(TYPES.Logger) private logger: Logger
  ) {
    this.initializeTemplates();
  }

  /**
   * Inicializar templates predefinidos
   * Patrón Factory para templates
   */
  private initializeTemplates(): void {
    // Template de bienvenida
    this.templates.set('welcome_email', {
      id: 'welcome_email',
      type: NotificationType.WELCOME,
      channel: NotificationChannel.EMAIL,
      subject: '¡Bienvenido a {{companyName}}!',
      body: 'Hola {{firstName}}, te damos la bienvenida a {{companyName}}.',
      htmlBody: '<h1>Bienvenido {{firstName}}</h1><p>Estamos emocionados de tenerte con nosotros.</p>',
      metadata: { category: 'onboarding' }
    });

    // Template de verificación de email
    this.templates.set('email_verification', {
      id: 'email_verification',
      type: NotificationType.EMAIL_VERIFICATION,
      channel: NotificationChannel.EMAIL,
      subject: 'Verifica tu email',
      body: 'Por favor verifica tu email haciendo clic en el siguiente enlace: {{verificationUrl}}',
      htmlBody: '<p>Por favor <a href="{{verificationUrl}}">haz clic aquí</a> para verificar tu email.</p>',
      metadata: { category: 'security' }
    });

    // Template de reset de password
    this.templates.set('password_reset', {
      id: 'password_reset',
      type: NotificationType.PASSWORD_RESET,
      channel: NotificationChannel.EMAIL,
      subject: 'Restablecer contraseña',
      body: 'Has solicitado restablecer tu contraseña. Usa el siguiente código: {{resetCode}}',
      htmlBody: '<p>Tu código de restablecimiento es: <strong>{{resetCode}}</strong></p>',
      metadata: { category: 'security', expiry: 3600 }
    });

    this.logger.info('Templates de notificación inicializados', {
      count: this.templates.size
    });
  }

  /**
   * Enviar notificación
   * Implementa patrón Template Method
   */
  async sendNotification(request: NotificationRequest): Promise<NotificationResponse> {
    try {
      // Validar y deduplicar
      if (request.deduplicationId) {
        const isDuplicate = await this.checkDuplication(request.deduplicationId);
        if (isDuplicate) {
          this.logger.warn('Notificación duplicada detectada', {
            deduplicationId: request.deduplicationId
          });
          return await this.getNotificationByDeduplicationId(request.deduplicationId);
        }
      }

      // Crear registro de notificación
      const notification = await this.notificationRepository.create({
        type: request.type,
        channels: request.channels,
        priority: request.priority || NotificationPriority.NORMAL,
        status: NotificationStatus.PENDING,
        recipientCount: request.recipients.length,
        metadata: request.metadata,
        scheduledAt: request.scheduledAt,
        expiresAt: request.expiresAt,
        groupId: request.groupId,
        deduplicationId: request.deduplicationId
      });

      // Procesar según prioridad
      if (request.priority === NotificationPriority.URGENT) {
        await this.processNotificationImmediately(notification.id, request);
      } else if (request.scheduledAt && request.scheduledAt > new Date()) {
        await this.scheduleNotification(notification.id, request);
      } else {
        await this.queueNotification(notification.id, request);
      }

      this.logger.info('Notificación creada', {
        notificationId: notification.id,
        type: request.type,
        channels: request.channels,
        recipientCount: request.recipients.length,
        priority: request.priority
      });

      return this.mapToResponse(notification);
    } catch (error) {
      this.logger.error('Error al enviar notificación', {
        error: error.message,
        request: {
          type: request.type,
          channels: request.channels,
          recipientCount: request.recipients.length
        }
      });
      throw error;
    }
  }

  /**
   * Procesar notificación inmediatamente
   * Implementa patrón Strategy para diferentes canales
   */
  private async processNotificationImmediately(
    notificationId: string,
    request: NotificationRequest
  ): Promise<void> {
    const deliveryPromises = [];

    for (const recipient of request.recipients) {
      // Verificar preferencias del usuario
      const effectiveChannels = await this.getEffectiveChannels(
        recipient,
        request.channels
      );

      for (const channel of effectiveChannels) {
        // Verificar rate limiting
        if (await this.checkRateLimit(recipient, channel)) {
          deliveryPromises.push(
            this.sendToChannel(notificationId, channel, recipient, request)
          );
        }
      }
    }

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Enviar notificación a un canal específico
   * Patrón Strategy: diferentes estrategias por canal
   */
  private async sendToChannel(
    notificationId: string,
    channel: NotificationChannel,
    recipient: NotificationRecipient,
    request: NotificationRequest
  ): Promise<NotificationDelivery> {
    let delivery: NotificationDelivery = {
      notificationId,
      recipientId: recipient.userId || recipient.email || 'unknown',
      channel,
      status: NotificationStatus.PROCESSING,
      attempts: 1,
      metadata: {}
    };

    try {
      switch (channel) {
        case NotificationChannel.EMAIL:
          delivery = await this.sendEmail(notificationId, recipient, request);
          break;

        case NotificationChannel.IN_APP:
          delivery = await this.sendInApp(notificationId, recipient, request);
          break;

        case NotificationChannel.SMS:
          delivery = await this.sendSMS(notificationId, recipient, request);
          break;

        case NotificationChannel.PUSH:
          delivery = await this.sendPushNotification(notificationId, recipient, request);
          break;

        case NotificationChannel.WEBHOOK:
          delivery = await this.sendWebhook(notificationId, recipient, request);
          break;

        default:
          throw new Error(`Canal no soportado: ${channel}`);
      }

      // Guardar resultado de entrega
      await this.notificationRepository.saveDelivery(delivery);

      return delivery;
    } catch (error) {
      this.logger.error('Error al enviar notificación por canal', {
        error: error.message,
        notificationId,
        channel,
        recipientId: delivery.recipientId
      });

      delivery.status = NotificationStatus.FAILED;
      delivery.failureReason = error.message;

      await this.notificationRepository.saveDelivery(delivery);

      // Reintentar si es necesario
      if (delivery.attempts < 3) {
        await this.scheduleRetry(delivery);
      }

      return delivery;
    }
  }

  /**
   * Enviar email
   */
  private async sendEmail(
    notificationId: string,
    recipient: NotificationRecipient,
    request: NotificationRequest
  ): Promise<NotificationDelivery> {
    const template = this.getTemplate(request.type, NotificationChannel.EMAIL);

    if (!recipient.email) {
      throw new Error('Email del destinatario no disponible');
    }

    const emailContent = this.renderTemplate(template, request.templateData || {});

    await this.emailService.sendEmail({
      to: recipient.email,
      subject: emailContent.subject,
      text: emailContent.body,
      html: emailContent.htmlBody
    });

    return {
      notificationId,
      recipientId: recipient.userId || recipient.email,
      channel: NotificationChannel.EMAIL,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      attempts: 1,
      metadata: { email: recipient.email }
    };
  }

  /**
   * Enviar notificación in-app
   */
  private async sendInApp(
    notificationId: string,
    recipient: NotificationRecipient,
    request: NotificationRequest
  ): Promise<NotificationDelivery> {
    if (!recipient.userId) {
      throw new Error('ID de usuario no disponible para notificación in-app');
    }

    // Guardar en base de datos para que el usuario la vea cuando acceda
    await this.notificationRepository.createInAppNotification({
      userId: recipient.userId,
      notificationId,
      type: request.type,
      data: request.templateData,
      read: false,
      createdAt: new Date()
    });

    // Emitir evento en tiempo real si hay conexión websocket
    // this.websocketService.emit(`user:${recipient.userId}`, 'notification', { ... });

    return {
      notificationId,
      recipientId: recipient.userId,
      channel: NotificationChannel.IN_APP,
      status: NotificationStatus.DELIVERED,
      sentAt: new Date(),
      deliveredAt: new Date(),
      attempts: 1,
      metadata: { userId: recipient.userId }
    };
  }

  /**
   * Enviar SMS (placeholder)
   */
  private async sendSMS(
    notificationId: string,
    recipient: NotificationRecipient,
    request: NotificationRequest
  ): Promise<NotificationDelivery> {
    if (!recipient.phone) {
      throw new Error('Teléfono del destinatario no disponible');
    }

    // Aquí se integraría con un servicio de SMS como Twilio
    this.logger.info('SMS enviado (simulado)', {
      phone: recipient.phone,
      type: request.type
    });

    return {
      notificationId,
      recipientId: recipient.userId || recipient.phone,
      channel: NotificationChannel.SMS,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      attempts: 1,
      metadata: { phone: recipient.phone }
    };
  }

  /**
   * Enviar push notification (placeholder)
   */
  private async sendPushNotification(
    notificationId: string,
    recipient: NotificationRecipient,
    request: NotificationRequest
  ): Promise<NotificationDelivery> {
    if (!recipient.deviceToken) {
      throw new Error('Token de dispositivo no disponible');
    }

    // Aquí se integraría con Firebase FCM o similar
    this.logger.info('Push notification enviada (simulada)', {
      deviceToken: recipient.deviceToken,
      type: request.type
    });

    return {
      notificationId,
      recipientId: recipient.userId || recipient.deviceToken,
      channel: NotificationChannel.PUSH,
      status: NotificationStatus.SENT,
      sentAt: new Date(),
      attempts: 1,
      metadata: { deviceToken: recipient.deviceToken }
    };
  }

  /**
   * Enviar webhook
   */
  private async sendWebhook(
    notificationId: string,
    recipient: NotificationRecipient,
    request: NotificationRequest
  ): Promise<NotificationDelivery> {
    if (!recipient.webhookUrl) {
      throw new Error('URL de webhook no disponible');
    }

    // Realizar llamada HTTP al webhook
    const response = await fetch(recipient.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Notification-Type': request.type,
        'X-Notification-Id': notificationId
      },
      body: JSON.stringify({
        type: request.type,
        data: request.templateData,
        metadata: request.metadata
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook falló con status ${response.status}`);
    }

    return {
      notificationId,
      recipientId: recipient.userId || recipient.webhookUrl,
      channel: NotificationChannel.WEBHOOK,
      status: NotificationStatus.DELIVERED,
      sentAt: new Date(),
      deliveredAt: new Date(),
      attempts: 1,
      metadata: { 
        webhookUrl: recipient.webhookUrl,
        responseStatus: response.status
      }
    };
  }

  // Métodos auxiliares

  /**
   * Verificar duplicación
   */
  private async checkDuplication(deduplicationId: string): Promise<boolean> {
    const cacheKey = `${this.CACHE_PREFIX}dedup:${deduplicationId}`;
    const exists = await this.cacheService.get(cacheKey);

    if (!exists) {
      await this.cacheService.set(cacheKey, true, this.CACHE_TTL);
      return false;
    }

    return true;
  }

  /**
   * Verificar rate limiting
   */
  private async checkRateLimit(
    recipient: NotificationRecipient,
    channel: NotificationChannel
  ): Promise<boolean> {
    const limits = this.RATE_LIMITS[channel];
    if (!limits) return true;

    const recipientId = recipient.userId || recipient.email || 'unknown';
    const cacheKey = `${this.CACHE_PREFIX}rate:${channel}:${recipientId}`;

    const current = await this.cacheService.get<number>(cacheKey) || 0;

    if (current >= limits.perMinute) {
      this.logger.warn('Rate limit excedido', {
        channel,
        recipientId,
        current,
        limit: limits.perMinute
      });
      return false;
    }

    await this.cacheService.increment(cacheKey, 60); // TTL de 60 segundos
    return true;
  }

  /**
   * Obtener canales efectivos según preferencias
   */
  private async getEffectiveChannels(
    recipient: NotificationRecipient,
    requestedChannels: NotificationChannel[]
  ): Promise<NotificationChannel[]> {
    if (!recipient.preferences) {
      return requestedChannels;
    }

    // Verificar Do Not Disturb
    if (recipient.preferences.doNotDisturb?.enabled) {
      const isDND = this.isInDoNotDisturbPeriod(recipient.preferences.doNotDisturb);
      if (isDND) {
        // Durante DND, solo notificaciones urgentes por canales críticos
        return requestedChannels.filter(channel => 
          channel === NotificationChannel.IN_APP
        );
      }
    }

    // Aplicar preferencias de canal
    if (recipient.preferences.channels) {
      return requestedChannels.filter(channel =>
        recipient.preferences!.channels!.includes(channel)
      );
    }

    return requestedChannels;
  }

  /**
   * Verificar si está en periodo Do Not Disturb
   */
  private isInDoNotDisturbPeriod(dnd: any): boolean {
    // Implementación simplificada
    const now = new Date();
    const currentHour = now.getHours();

    if (dnd.startTime && dnd.endTime) {
      const startHour = parseInt(dnd.startTime.split(':')[0]);
      const endHour = parseInt(dnd.endTime.split(':')[0]);

      if (startHour <= endHour) {
        return currentHour >= startHour && currentHour < endHour;
      } else {
        // Periodo que cruza medianoche
        return currentHour >= startHour || currentHour < endHour;
      }
    }

    return false;
  }

  /**
   * Obtener template
   */
  private getTemplate(type: NotificationType, channel: NotificationChannel): NotificationTemplate {
    const templateKey = `${type}_${channel}`.toLowerCase();
    const template = this.templates.get(templateKey);

    if (!template) {
      // Template genérico por defecto
      return {
        id: 'default',
        type,
        channel,
        subject: 'Notificación',
        body: 'Tienes una nueva notificación',
        htmlBody: '<p>Tienes una nueva notificación</p>'
      };
    }

    return template;
  }

  /**
   * Renderizar template con datos
   */
  private renderTemplate(
    template: NotificationTemplate,
    data: Record<string, any>
  ): { subject?: string; body: string; htmlBody?: string } {
    let subject = template.subject;
    let body = template.body;
    let htmlBody = template.htmlBody;

    // Reemplazar variables {{variable}}
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      if (subject) subject = subject.replace(regex, String(value));
      body = body.replace(regex, String(value));
      if (htmlBody) htmlBody = htmlBody.replace(regex, String(value));
    });

    return { subject, body, htmlBody };
  }

  /**
   * Programar notificación
   */
  private async scheduleNotification(
    notificationId: string,
    request: NotificationRequest
  ): Promise<void> {
    await this.queueService.schedule({
      queue: 'notifications',
      job: {
        id: notificationId,
        data: request,
        priority: request.priority
      },
      scheduledAt: request.scheduledAt!
    });

    await this.notificationRepository.updateStatus(
      notificationId,
      NotificationStatus.QUEUED
    );
  }

  /**
   * Encolar notificación
   */
  private async queueNotification(
    notificationId: string,
    request: NotificationRequest
  ): Promise<void> {
    await this.queueService.enqueue({
      queue: 'notifications',
      job: {
        id: notificationId,
        data: request,
        priority: request.priority
      }
    });

    await this.notificationRepository.updateStatus(
      notificationId,
      NotificationStatus.QUEUED
    );
  }

  /**
   * Programar reintento
   */
  private async scheduleRetry(delivery: NotificationDelivery): Promise<void> {
    const delaySeconds = Math.pow(2, delivery.attempts) * 60; // Backoff exponencial

    await this.queueService.schedule({
      queue: 'notification-retry',
      job: {
        id: `${delivery.notificationId}_${delivery.recipientId}`,
        data: delivery
      },
      scheduledAt: new Date(Date.now() + delaySeconds * 1000)
    });
  }

  /**
   * Obtener notificación por ID de deduplicación
   */
  private async getNotificationByDeduplicationId(
    deduplicationId: string
  ): Promise<NotificationResponse> {
    const notification = await this.notificationRepository.findByDeduplicationId(deduplicationId);
    if (!notification) {
      throw new Error('Notificación no encontrada');
    }
    return this.mapToResponse(notification);
  }

  /**
   * Mapear a respuesta
   */
  private mapToResponse(notification: any): NotificationResponse {
    return {
      id: notification.id,
      type: notification.type,
      channels: notification.channels,
      status: notification.status,
      priority: notification.priority,
      recipients: notification.recipientCount,
      sentCount: notification.sentCount || 0,
      failedCount: notification.failedCount || 0,
      scheduledAt: notification.scheduledAt,
      processedAt: notification.processedAt,
      completedAt: notification.completedAt,
      metadata: notification.metadata
    };
  }
}
