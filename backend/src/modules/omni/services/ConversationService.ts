// services/ConversationService.ts
import { injectable, inject } from 'inversify';
import { EventEmitter } from 'events';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { MessageRepository } from '../repositories/MessageRepository';
import { IConversation, ConversationStatus } from '../interfaces/IConversation';
import { WebSocketService } from './WebSocketService';
import { OMNI_TYPES } from '../types/omni.types';

@injectable()
export class ConversationService {
  constructor(
    @inject(OMNI_TYPES.ConversationRepository) private conversationRepo: ConversationRepository,
    @inject(OMNI_TYPES.MessageRepository) private messageRepo: MessageRepository,
    @inject(OMNI_TYPES.WebSocketService) private wsService: WebSocketService,
    @inject(OMNI_TYPES.EventEmitter) private eventEmitter: EventEmitter
  ) {}

  async createConversation(data: Partial<IConversation>): Promise<IConversation> {
    const conversation = await this.conversationRepo.create({
      ...data,
      status: ConversationStatus.OPEN,
      createdAt: new Date()
    });

    // Notificar via WebSocket
    this.wsService.broadcastToCompany(data.companyId!, 'conversation.new', {
      conversation
    });

    // Emitir evento para otros módulos
    this.eventEmitter.emit('conversation.created', conversation);

    return conversation;
  }

  async getConversations(companyId: string, filters?: any): Promise<IConversation[]> {
    if (filters?.status) {
      return this.conversationRepo.findByStatus(companyId, filters.status);
    }

    if (filters?.assignedTo) {
      return this.conversationRepo.findByAssignee(companyId, filters.assignedTo);
    }

    return this.conversationRepo.findWithLastMessage(companyId, filters?.limit || 50);
  }

  async getConversation(id: string): Promise<IConversation | null> {
    return this.conversationRepo.findById(id);
  }

  async assignConversation(
    conversationId: string,
    userId: string
  ): Promise<IConversation | null> {
    const conversation = await this.conversationRepo.assignConversation(
      conversationId,
      userId
    );

    if (conversation) {
      // Notificar asignación
      this.wsService.broadcastToRoom(conversationId, 'conversation.assigned', {
        conversationId,
        assignedTo: userId,
        assignedAt: new Date()
      });

      this.eventEmitter.emit('conversation.assigned', {
        conversationId,
        userId,
        conversation
      });
    }

    return conversation;
  }

  async updateConversationStatus(
    conversationId: string,
    status: ConversationStatus
  ): Promise<IConversation | null> {
    const updateData: Partial<IConversation> = { status };

    if (status === ConversationStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
    }

    const conversation = await this.conversationRepo.update(conversationId, updateData);

    if (conversation) {
      // Calcular tiempo de resolución si se resolvió
      if (status === ConversationStatus.RESOLVED) {
        const resolutionTime = this.calculateResolutionTime(conversation);
        await this.conversationRepo.update(conversationId, {
          resolutionTimeSeconds: resolutionTime
        });
      }

      // Notificar cambio de estado
      this.wsService.broadcastToRoom(conversationId, 'conversation.status.changed', {
        conversationId,
        status,
        timestamp: new Date()
      });

      this.eventEmitter.emit('conversation.status.changed', {
        conversationId,
        status,
        conversation
      });
    }

    return conversation;
  }

  async resolveConversation(conversationId: string): Promise<IConversation | null> {
    return this.updateConversationStatus(conversationId, ConversationStatus.RESOLVED);
  }

  async reopenConversation(conversationId: string): Promise<IConversation | null> {
    return this.updateConversationStatus(conversationId, ConversationStatus.OPEN);
  }

  async updateConversationPriority(
    conversationId: string,
    priority: string
  ): Promise<IConversation | null> {
    const conversation = await this.conversationRepo.update(conversationId, { priority });

    if (conversation) {
      this.wsService.broadcastToRoom(conversationId, 'conversation.priority.changed', {
        conversationId,
        priority,
        timestamp: new Date()
      });
    }

    return conversation;
  }

  async addTagsToConversation(
    conversationId: string,
    tags: string[]
  ): Promise<IConversation | null> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      return null;
    }

    const updatedTags = [...new Set([...conversation.tags, ...tags])];
    return this.conversationRepo.update(conversationId, { tags: updatedTags });
  }

  async removeTagsFromConversation(
    conversationId: string,
    tagsToRemove: string[]
  ): Promise<IConversation | null> {
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      return null;
    }

    const updatedTags = conversation.tags.filter(tag => !tagsToRemove.includes(tag));
    return this.conversationRepo.update(conversationId, { tags: updatedTags });
  }

  async getConversationStats(companyId: string): Promise<any> {
    const [open, pending, resolved] = await Promise.all([
      this.conversationRepo.findByStatus(companyId, ConversationStatus.OPEN),
      this.conversationRepo.findByStatus(companyId, ConversationStatus.PENDING),
      this.conversationRepo.findByStatus(companyId, ConversationStatus.RESOLVED)
    ]);

    return {
      total: open.length + pending.length + resolved.length,
      open: open.length,
      pending: pending.length,
      resolved: resolved.length,
      responseTimeAvg: this.calculateAverageResponseTime([...open, ...pending, ...resolved])
    };
  }

  private calculateResolutionTime(conversation: IConversation): number {
    if (!conversation.createdAt || !conversation.resolvedAt) return 0;
    return Math.floor(
      (conversation.resolvedAt.getTime() - conversation.createdAt.getTime()) / 1000
    );
  }

  private calculateAverageResponseTime(conversations: IConversation[]): number {
    const validTimes = conversations
      .filter(c => c.firstResponseAt && c.createdAt)
      .map(c =>
        (c.firstResponseAt!.getTime() - c.createdAt!.getTime()) / 1000
      );

    if (validTimes.length === 0) return 0;
    return validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
  }
}