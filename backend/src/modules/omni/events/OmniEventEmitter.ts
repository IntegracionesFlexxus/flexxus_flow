// events/OmniEventEmitter.ts
import { EventEmitter } from 'events';
import { injectable } from 'inversify';

export enum OmniEvents {
  // Channels
  CHANNEL_CREATED = 'channel.created',
  CHANNEL_UPDATED = 'channel.updated',
  CHANNEL_DELETED = 'channel.deleted',
  CHANNEL_HEALTH_CHANGED = 'channel.health.changed',

  // Conversations
  CONVERSATION_CREATED = 'conversation.created',
  CONVERSATION_ASSIGNED = 'conversation.assigned',
  CONVERSATION_RESOLVED = 'conversation.resolved',
  CONVERSATION_REOPENED = 'conversation.reopened',
  CONVERSATION_STATUS_CHANGED = 'conversation.status.changed',

  // Messages
  MESSAGE_RECEIVED = 'message.received',
  MESSAGE_SENT = 'message.sent',
  MESSAGE_DELIVERED = 'message.delivered',
  MESSAGE_READ = 'message.read',
  MESSAGE_FAILED = 'message.failed',
  MESSAGE_STATUS_CHANGED = 'message.status.changed',

  // Customers
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_MERGED = 'customer.merged',
  CUSTOMER_IDENTITY_CREATED = 'customer.identity.created',

  // Templates
  TEMPLATE_CREATED = 'template.created',
  TEMPLATE_UPDATED = 'template.updated',
  TEMPLATE_DELETED = 'template.deleted',
  TEMPLATE_USED = 'template.used',

  // Auto Responses
  AUTO_RESPONSE_CREATED = 'auto.response.created',
  AUTO_RESPONSE_TRIGGERED = 'auto.response.triggered',

  // SLA
  SLA_WARNING = 'sla.warning',
  SLA_BREACHED = 'sla.breached',

  // Integration
  INTEGRATION_ERROR = 'integration.error',
  INTEGRATION_SUCCESS = 'integration.success'
}

export interface OmniEventData {
  timestamp: Date;
  event: OmniEvents;
  data: any;
  companyId?: string;
  userId?: string;
}

@injectable()
export class OmniEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Aumentar límite de listeners
  }

  emitOmniEvent(event: OmniEvents, data: any, companyId?: string, userId?: string): void {
    const eventData: OmniEventData = {
      timestamp: new Date(),
      event,
      data,
      companyId,
      userId
    };

    this.emit(event, eventData);

    // También emitir un evento genérico para logging/monitoring
    this.emit('omni.event', eventData);
  }

  // Métodos de conveniencia para eventos específicos
  channelCreated(data: any): void {
    this.emitOmniEvent(OmniEvents.CHANNEL_CREATED, data, data.companyId);
  }

  channelUpdated(data: any): void {
    this.emitOmniEvent(OmniEvents.CHANNEL_UPDATED, data, data.companyId);
  }

  channelDeleted(data: any): void {
    this.emitOmniEvent(OmniEvents.CHANNEL_DELETED, data, data.companyId);
  }

  conversationCreated(data: any): void {
    this.emitOmniEvent(OmniEvents.CONVERSATION_CREATED, data, data.companyId);
  }

  conversationAssigned(data: any): void {
    this.emitOmniEvent(OmniEvents.CONVERSATION_ASSIGNED, data, data.companyId, data.userId);
  }

  messageReceived(data: any): void {
    this.emitOmniEvent(OmniEvents.MESSAGE_RECEIVED, data, data.companyId);
  }

  messageSent(data: any): void {
    this.emitOmniEvent(OmniEvents.MESSAGE_SENT, data, data.companyId, data.userId);
  }

  customerCreated(data: any): void {
    this.emitOmniEvent(OmniEvents.CUSTOMER_CREATED, data, data.companyId);
  }

  templateUsed(data: any): void {
    this.emitOmniEvent(OmniEvents.TEMPLATE_USED, data, data.companyId, data.userId);
  }

  slaWarning(data: any): void {
    this.emitOmniEvent(OmniEvents.SLA_WARNING, data, data.companyId);
  }

  slaBreached(data: any): void {
    this.emitOmniEvent(OmniEvents.SLA_BREACHED, data, data.companyId);
  }

  integrationError(data: any): void {
    this.emitOmniEvent(OmniEvents.INTEGRATION_ERROR, data, data.companyId);
  }

  // Método para registrar handlers de eventos
  onChannelEvent(event: OmniEvents, handler: (data: OmniEventData) => void): void {
    this.on(event, handler);
  }

  // Método para remover handlers
  removeChannelEventHandler(event: OmniEvents, handler: (data: OmniEventData) => void): void {
    this.removeListener(event, handler);
  }

  // Método para obtener estadísticas de eventos
  getEventStats(): any {
    return {
      maxListeners: this.getMaxListeners(),
      eventNames: this.eventNames(),
      listenerCount: this.eventNames().reduce((acc, event) => {
        acc[event.toString()] = this.listenerCount(event);
        return acc;
      }, {} as Record<string, number>)
    };
  }
}