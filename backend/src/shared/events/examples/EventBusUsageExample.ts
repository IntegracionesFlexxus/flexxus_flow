import { Container } from 'inversify';
import { TYPES } from '@container/types';
import { EnhancedEventBus } from '@/shared/events/EnhancedEventBus';
import { EventStore } from '@/shared/events/EventStore';
import { DeadLetterQueue } from '@/shared/events/DeadLetterQueue';
import { EventReplayManager } from '@/shared/events/EventReplayManager';
import { DomainEvents, DomainEvent } from '@/shared/events/EventBus';
import { Logger } from 'winston';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

// Logger instance
const logger = LoggerFactory.create({ file: __filename });

/**
 * Event Bus Usage Example
 * Sprint 4 - Ejemplo de uso del sistema de eventos mejorado
 */

/**
 * Ejemplo de configuración e inicialización
 */
export class EventBusExample {
  private container: Container;
  private eventBus: EnhancedEventBus;
  constructor(container: Container) {
    this.container = container;
    this.setupEventBus();
  }
  /**
   * Configura el Event Bus con todas sus características
   */
  private setupEventBus(): void {
    // Obtener instancias del container
    const eventStore = this.container.get<EventStore>(TYPES.EventStore);
    const dlq = this.container.get<DeadLetterQueue>(TYPES.DeadLetterQueue);
    const replayManager = this.container.get<EventReplayManager>(TYPES.EventReplayManager);
    const logger = this.container.get<Logger>(TYPES.Logger);
    // Crear e inicializar el Enhanced Event Bus
    this.eventBus = new EnhancedEventBus();
    this.eventBus.initialize(eventStore, dlq, replayManager, logger, {
      persistEvents: true,
      enableDLQ: true,
      enableReplay: true,
      batchSize: 10,
      maxRetries: 3
    });
    // Registrar handlers
    this.registerEventHandlers();
  }
  /**
   * Registra handlers para diferentes tipos de eventos
   */
  private registerEventHandlers(): void {
    // Handler para usuario creado con retry automático
    this.eventBus.subscribeEnhanced(
      DomainEvents.USER_CREATED,
      async (event: DomainEvent) => {
        logger.info('Processing user created event:', event);
        // Simular procesamiento
        await this.sendWelcomeEmail(event.payload.email);
        await this.createDefaultSettings(event.aggregateId);
        await this.notifyAdmins(event);
      },
      { maxRetries: 5, retryDelay: 2000 }
    );
    // Handler para cambio de rol
    this.eventBus.subscribeEnhanced(
      DomainEvents.USER_ROLE_CHANGED,
      async (event: DomainEvent) => {
        logger.info('Processing role change:', event);
        // Actualizar permisos en cache
        await this.updatePermissionsCache(event.aggregateId, event.payload.newRole);
        // Auditar cambio
        await this.auditRoleChange(event);
      }
    );
    // Handler para empresa eliminada
    this.eventBus.subscribeEnhanced(
      DomainEvents.COMPANY_DELETED,
      async (event: DomainEvent) => {
        logger.info('Processing company deletion:', event);
        // Limpiar datos relacionados
        await this.cleanupCompanyData(event.aggregateId);
        // Notificar servicios externos
        await this.notifyExternalServices(event);
      }
    );
  }
  /**
   * Ejemplo de publicación de evento
   */
  async publishUserCreatedEvent(userId: string, userData: any): Promise<void> {
    const event: DomainEvent = {
      eventName: DomainEvents.USER_CREATED,
      aggregateId: userId,
      occurredAt: new Date(),
      payload: userData,
      metadata: {
        userId: userData.createdBy,
        companyId: userData.companyId,
        correlationId: this.generateCorrelationId()
      }
    };
    await this.eventBus.publish(event);
  }
  /**
   * Ejemplo de publicación en batch
   */
  async publishBatchEvents(users: any[]): Promise<void> {
    const events: DomainEvent[] = users.map(user => ({
      eventName: DomainEvents.USER_CREATED,
      aggregateId: user.id,
      occurredAt: new Date(),
      payload: user,
      metadata: {
        batchId: this.generateCorrelationId(),
        batchSize: users.length
      }
    }));
    await this.eventBus.publishBatch(events);
  }
  /**
   * Ejemplo de replay de eventos
   */
  async replayEventsExample(): Promise<void> {
    // Replay de eventos del último día
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    await this.eventBus.replay({
      fromDate: yesterday,
      eventTypes: [
        DomainEvents.USER_CREATED,
        DomainEvents.USER_UPDATED
      ]
    });
  }
  /**
   * Ejemplo de procesamiento de DLQ
   */
  async processDLQExample(): Promise<void> {
    const result = await this.eventBus.processDLQ();
    logger.info(`DLQ Processing - Success: ${result.success}, Failed: ${result.failed}`);
  }
  /**
   * Ejemplo de obtención de estadísticas
   */
  async getStatsExample(): Promise<void> {
    const stats = await this.eventBus.getStats();
    logger.info('Event Bus Statistics:', stats);
  }
  // Métodos auxiliares simulados
  private async sendWelcomeEmail(email: string): Promise<void> {
    logger.info(`Sending welcome email to ${email}`);
    // Simular envío de email
  }
  private async createDefaultSettings(userId: string): Promise<void> {
    logger.info(`Creating default settings for user ${userId}`);
    // Simular creación de configuración
  }
  private async notifyAdmins(event: DomainEvent): Promise<void> {
    logger.info('Notifying admins about new user');
    // Simular notificación
  }
  private async updatePermissionsCache(userId: string, newRole: string): Promise<void> {
    logger.info(`Updating permissions cache for user ${userId} with role ${newRole}`);
    // Simular actualización de cache
  }
  private async auditRoleChange(event: DomainEvent): Promise<void> {
    logger.info('Auditing role change event');
    // Simular auditoría
  }
  private async cleanupCompanyData(companyId: string): Promise<void> {
    logger.info(`Cleaning up data for company ${companyId}`);
    // Simular limpieza
  }
  private async notifyExternalServices(event: DomainEvent): Promise<void> {
    logger.info('Notifying external services');
    // Simular notificación
  }
  private generateCorrelationId(): string {
    return `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
/**
 * Ejemplo de uso con manejo de errores
 */
export class RobustEventHandler {
  constructor(private eventBus: EnhancedEventBus) {}
  /**
   * Handler robusto con manejo de errores específicos
   */
  async handlePaymentProcessed(event: DomainEvent): Promise<void> {
    try {
      const { orderId, amount, customerId } = event.payload;
      // Validar datos
      if (!orderId || !amount || !customerId) {
        throw new Error('Invalid payment data');
      }
      // Procesar pago
      await this.processPayment(orderId, amount);
      // Actualizar inventario
      await this.updateInventory(orderId);
      // Enviar confirmación
      await this.sendConfirmation(customerId, orderId);
    } catch (error) {
      // Determinar si el error es recuperable
      if (this.isRetryableError(error)) {
        // El Enhanced Event Bus manejará el retry
        throw error;
      } else {
        // Error no recuperable, registrar y continuar
        logger.error('Non-retryable error:', error);
        // Publicar evento de fallo
        await this.publishPaymentFailed(event, error);
      }
    }
  }
  private isRetryableError(error: any): boolean {
    // Errores temporales que se pueden reintentar
    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'DB_CONNECTION_ERROR'
    ];
    return retryableErrors.some(code => 
      error.message?.includes(code) || error.code === code
    );
  }
  private async processPayment(orderId: string, amount: number): Promise<void> {
    // Lógica de procesamiento
  }
  private async updateInventory(orderId: string): Promise<void> {
    // Lógica de actualización
  }
  private async sendConfirmation(customerId: string, orderId: string): Promise<void> {
    // Lógica de confirmación
  }
  private async publishPaymentFailed(originalEvent: DomainEvent, error: any): Promise<void> {
    const failedEvent: DomainEvent = {
      eventName: 'payment.failed',
      aggregateId: originalEvent.aggregateId,
      occurredAt: new Date(),
      payload: {
        originalEvent: originalEvent.payload,
        error: error.message,
        timestamp: new Date()
      },
      metadata: {
        ...originalEvent.metadata,
        failureReason: error.message
      }
    };
    await this.eventBus.publish(failedEvent);
  }
}
