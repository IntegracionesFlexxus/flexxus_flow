// services/MessageService.ts
import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import { MessageRepository } from '../repositories/MessageRepository';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { IMessage, MessageStatus, SenderType } from '../interfaces/IMessage';
import { WebSocketService } from './WebSocketService';
import { OMNI_TYPES } from '../types/omni.types';

@injectable()
export class MessageService {
  constructor(
    @inject(OMNI_TYPES.MessageRepository) private messageRepo: MessageRepository,
    @inject(OMNI_TYPES.ConversationRepository) private conversationRepo: ConversationRepository,
    @inject(OMNI_TYPES.WebSocketService) private wsService: WebSocketService,
    @inject(OMNI_TYPES.EventEmitter) private eventEmitter: EventEmitter
  ) {}

  async sendMessage(data: Partial<IMessage>): Promise<IMessage> {
    // Crear el mensaje
    const message = await this.messageRepo.create({
      ...data,
      status: MessageStatus.SENT,
      createdAt: new Date()
    });

    // Actualizar última actividad de la conversación
    await this.conversationRepo.updateLastMessageAt(message.conversationId);

    // Si es la primera respuesta del agente, marcar tiempo de primera respuesta
    if (message.senderType === SenderType.AGENT) {
      await this.updateFirstResponseTime(message.conversationId);
    }

    // Notificar via WebSocket
    this.wsService.notifyNewMessage(message.conversationId, message);

    // Emitir evento
    this.eventEmitter.emit('message.sent', {
      message,
      conversationId: message.conversationId
    });

    return message;
  }

  async receiveMessage(data: Partial<IMessage>): Promise<IMessage> {
    // Verificar si el mensaje ya existe (por external_message_id)
    if (data.metadata?.externalMessageId) {
      const existing = await this.messageRepo.findByExternalId(
        data.metadata.externalMessageId
      );
      if (existing) {
        return existing;
      }
    }

    // Crear el mensaje
    const message = await this.messageRepo.create({
      ...data,
      senderType: SenderType.CUSTOMER,
      status: MessageStatus.DELIVERED,
      createdAt: new Date(),
      deliveredAt: new Date()
    });

    // Actualizar última actividad de la conversación
    await this.conversationRepo.updateLastMessageAt(message.conversationId);

    // Notificar via WebSocket
    this.wsService.notifyNewMessage(message.conversationId, message);

    // Emitir evento
    this.eventEmitter.emit('message.received', {
      message,
      conversationId: message.conversationId
    });

    return message;
  }

  async getConversationMessages(
    conversationId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<IMessage[]> {
    return this.messageRepo.findByConversation(conversationId, limit, offset);
  }

  async updateMessageStatus(
    messageId: string,
    status: MessageStatus
  ): Promise<IMessage | null> {
    const message = await this.messageRepo.updateStatus(messageId, status);

    if (message) {
      // Notificar cambio de estado
      this.wsService.broadcastToRoom(message.conversationId, 'message:status', {
        messageId: message.id,
        status,
        timestamp: new Date()
      });

      this.eventEmitter.emit('message.status.changed', {
        messageId,
        status,
        message
      });
    }

    return message;
  }

  async markAsDelivered(messageId: string): Promise<IMessage | null> {
    return this.updateMessageStatus(messageId, MessageStatus.DELIVERED);
  }

  async markAsRead(messageId: string): Promise<IMessage | null> {
    return this.updateMessageStatus(messageId, MessageStatus.READ);
  }

  async markConversationAsRead(
    conversationId: string,
    userId: string
  ): Promise<void> {
    await this.messageRepo.markAsRead(conversationId, userId);

    // Notificar que la conversación fue leída
    this.wsService.broadcastToRoom(conversationId, 'conversation:read', {
      conversationId,
      readBy: userId,
      timestamp: new Date()
    });
  }

  async getUnreadMessages(conversationId: string): Promise<IMessage[]> {
    return this.messageRepo.findUnreadByConversation(conversationId);
  }

  async searchMessages(
    conversationId: string,
    searchTerm: string,
    limit: number = 20
  ): Promise<IMessage[]> {
    return this.messageRepo.searchInConversation(conversationId, searchTerm, limit);
  }

  async deleteMessage(messageId: string): Promise<boolean> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const result = await this.messageRepo.delete(messageId);

    if (result) {
      // Notificar eliminación
      this.wsService.broadcastToRoom(message.conversationId, 'message:deleted', {
        messageId,
        conversationId: message.conversationId,
        timestamp: new Date()
      });

      this.eventEmitter.emit('message.deleted', {
        messageId,
        conversationId: message.conversationId
      });
    }

    return result;
  }

  async getMessageById(messageId: string): Promise<IMessage | null> {
    return this.messageRepo.findById(messageId);
  }

  async retryFailedMessage(messageId: string): Promise<IMessage | null> {
    const message = await this.messageRepo.findById(messageId);
    if (!message || message.status !== MessageStatus.FAILED) {
      throw new Error('Message not found or not in failed state');
    }

    // Intentar reenviar el mensaje
    const updatedMessage = await this.updateMessageStatus(messageId, MessageStatus.PENDING);

    if (updatedMessage) {
      // Aquí iría la lógica para reenviar según el canal
      this.eventEmitter.emit('message.retry', {
        messageId,
        conversationId: updatedMessage.conversationId
      });
    }

    return updatedMessage;
  }

  private async updateFirstResponseTime(conversationId: string): Promise<void> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (conversation && !conversation.firstResponseAt) {
      const responseTime = Math.floor(
        (Date.now() - conversation.createdAt.getTime()) / 60000 // en minutos
      );

      await this.conversationRepo.update(conversationId, {
        firstResponseAt: new Date(),
        responseTimeMinutes: responseTime
      });
    }
  }

  async getMessageStats(conversationId: string): Promise<any> {
    const messages = await this.messageRepo.findByConversation(conversationId, 1000);

    const stats = {
      total: messages.length,
      byType: {} as Record<string, number>,
      bySender: {} as Record<string, number>,
      byStatus: {} as Record<string, number>
    };

    messages.forEach(message => {
      stats.byType[message.contentType] = (stats.byType[message.contentType] || 0) + 1;
      stats.bySender[message.senderType] = (stats.bySender[message.senderType] || 0) + 1;
      stats.byStatus[message.status] = (stats.byStatus[message.status] || 0) + 1;
    });

    return stats;
  }
}