/**
 * Event Bus - Sistema de eventos para comunicación entre módulos
 * Implementa patrón Publisher-Subscriber para desacoplar módulos
 */
import { injectable } from 'inversify';
import { EventEmitter } from 'events';
import { Logger } from 'winston';
export interface DomainEvent {
  eventName: string;
  aggregateId: string;
  occurredAt: Date;
  payload: any;
  metadata?: {
    userId?: string;
    companyId?: string;
    correlationId?: string;
    causationId?: string;
  };
}
export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): void;
  subscribeToAll(handler: (event: DomainEvent) => Promise<void>): void;
  unsubscribe(eventName: string, handler: Function): void;
}
@injectable()
export class EventBus implements IEventBus {
  private emitter: EventEmitter;
  private logger?: Logger;
  private eventHandlers: Map<string, Set<Function>>;
  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100); // Aumentar límite de listeners
    this.eventHandlers = new Map();
  }
  setLogger(logger: Logger): void {
    this.logger = logger;
  }
  /**
   * Publicar un evento de dominio
   */
  async publish(event: DomainEvent): Promise<void> {
    try {
      // Log del evento
      if (this.logger) {
        this.logger.info('Evento publicado', {
          eventName: event.eventName,
          aggregateId: event.aggregateId,
          metadata: event.metadata
        });
      }
      // Emitir evento específico
      this.emitter.emit(event.eventName, event);
      // Emitir a todos los suscriptores generales
      this.emitter.emit('*', event);
      // Guardar evento para auditoría (opcional)
      await this.persistEvent(event);
    } catch (error) {
      if (this.logger) {
        this.logger.error('Error al publicar evento', {
          eventName: event.eventName,
          error: error.message
        });
      }
      throw error;
    }
  }
  /**
   * Suscribirse a un evento específico
   */
  subscribe(eventName: string, handler: (event: DomainEvent) => Promise<void>): void {
    // Registrar handler
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set());
    }
    this.eventHandlers.get(eventName)!.add(handler);
    // Wrapper para manejo de errores
    const wrappedHandler = async (event: DomainEvent) => {
      try {
        await handler(event);
      } catch (error) {
        if (this.logger) {
          this.logger.error('Error en handler de evento', {
            eventName,
            error: error.message
          });
        }
      }
    };
    this.emitter.on(eventName, wrappedHandler);
  }
  /**
   * Suscribirse a todos los eventos
   */
  subscribeToAll(handler: (event: DomainEvent) => Promise<void>): void {
    this.subscribe('*', handler);
  }
  /**
   * Desuscribirse de un evento
   */
  unsubscribe(eventName: string, handler: Function): void {
    if (this.eventHandlers.has(eventName)) {
      this.eventHandlers.get(eventName)!.delete(handler);
    }
    this.emitter.removeListener(eventName, handler as any);
  }
  /**
   * Persistir evento para auditoría y replay
   */
  private async persistEvent(event: DomainEvent): Promise<void> {
    // Implementación opcional para guardar eventos en base de datos
    // Útil para Event Sourcing y auditoría
  }
}
// Eventos predefinidos del dominio
export class DomainEvents {
  // Eventos de Usuario
  static readonly USER_CREATED = 'user.created';
  static readonly USER_UPDATED = 'user.updated';
  static readonly USER_DELETED = 'user.deleted';
  static readonly USER_LOGGED_IN = 'user.logged_in';
  static readonly USER_LOGGED_OUT = 'user.logged_out';
  static readonly USER_PASSWORD_CHANGED = 'user.password_changed';
  static readonly USER_EMAIL_VERIFIED = 'user.email_verified';
  static readonly USER_ROLE_CHANGED = 'user.role_changed';
  // Eventos de Empresa
  static readonly COMPANY_CREATED = 'company.created';
  static readonly COMPANY_UPDATED = 'company.updated';
  static readonly COMPANY_DELETED = 'company.deleted';
  static readonly COMPANY_USER_ADDED = 'company.user_added';
  static readonly COMPANY_USER_REMOVED = 'company.user_removed';
  static readonly COMPANY_SETTINGS_UPDATED = 'company.settings_updated';
  // Eventos de Invitaciones
  static readonly INVITATION_SENT = 'invitation.sent';
  static readonly INVITATION_ACCEPTED = 'invitation.accepted';
  static readonly INVITATION_REJECTED = 'invitation.rejected';
  static readonly INVITATION_EXPIRED = 'invitation.expired';
  // Eventos de Roles y Permisos
  static readonly ROLE_CREATED = 'role.created';
  static readonly ROLE_UPDATED = 'role.updated';
  static readonly ROLE_DELETED = 'role.deleted';
  static readonly PERMISSION_GRANTED = 'permission.granted';
  static readonly PERMISSION_REVOKED = 'permission.revoked';
  // Eventos de Auditoría
  static readonly AUDIT_LOG_CREATED = 'audit.log_created';
  static readonly SUSPICIOUS_ACTIVITY_DETECTED = 'audit.suspicious_activity';
  // Eventos de Notificaciones
  static readonly NOTIFICATION_SENT = 'notification.sent';
  static readonly NOTIFICATION_READ = 'notification.read';
  static readonly EMAIL_SENT = 'email.sent';
  static readonly EMAIL_FAILED = 'email.failed';
  // Eventos de Feature Flags
  static readonly FEATURE_FLAG_CREATED = 'feature_flag.created';
  static readonly FEATURE_FLAG_UPDATED = 'feature_flag.updated';
  static readonly FEATURE_FLAG_TOGGLED = 'feature_flag.toggled';
}
