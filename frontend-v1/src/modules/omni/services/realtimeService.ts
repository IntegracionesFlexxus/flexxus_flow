/**
 * Realtime Service - DEPRECATED
 *
 * @deprecated Este servicio está DEPRECADO. Usa WebSocket en su lugar.
 *
 * Este servicio usaba polling cada 5 segundos para obtener actualizaciones.
 * Ahora se debe usar WebSocketContext y useWebSocketContext() para tiempo real.
 *
 * Migración:
 * - En lugar de: realtimeService.subscribeToMessages(conversationId, callback)
 * - Usar: const { lastMessage } = useWebSocketContext()
 *
 * Ver: frontend-v1/src/modules/omni/contexts/WebSocketContext.tsx
 * Ver: frontend-v1/src/modules/omni/components/conversations/MessageThread.tsx (ejemplo)
 */

import { conversationService } from './conversationService';
import { messageService } from './messageService';
import { Conversation } from '../types/conversation.types';
import { Message } from '../types/message.types';

type MessageCallback = (message: Message) => void;
type ConversationUpdateCallback = (conversation: Conversation) => void;
type ErrorCallback = (error: Error) => void;

interface Subscription {
  id: string;
  type: 'conversation' | 'messages';
  conversationId?: string;
  callback: MessageCallback | ConversationUpdateCallback;
  lastCheck?: Date;
}

class RealtimeService {
  private subscriptions: Map<string, Subscription> = new Map();
  private pollInterval: number = 5000; // 5 segundos
  private pollingTimer: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private errorHandlers: ErrorCallback[] = [];
  private lastConversationCheck: Map<string, Date> = new Map();
  private lastMessageCount: Map<string, number> = new Map();

  /**
   * Iniciar el polling
   */
  start() {
    if (this.isPolling) {
      console.log('⚠️ [realtimeService] Ya está en ejecución');
      return;
    }

    console.log('🚀 [realtimeService] Iniciando polling...');
    this.isPolling = true;
    this.poll();
  }

  /**
   * Detener el polling
   */
  stop() {
    console.log('🛑 [realtimeService] Deteniendo polling...');
    this.isPolling = false;

    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  /**
   * Configurar intervalo de polling
   */
  setPollInterval(milliseconds: number) {
    this.pollInterval = milliseconds;
    console.log('⏱️ [realtimeService] Intervalo de polling configurado a', milliseconds, 'ms');
  }

  /**
   * Suscribirse a mensajes nuevos de una conversación
   */
  subscribeToMessages(conversationId: string, callback: MessageCallback): string {
    const subscriptionId = `messages_${conversationId}_${Date.now()}`;

    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      type: 'messages',
      conversationId,
      callback: callback as any,
      lastCheck: new Date()
    });

    console.log('📨 [realtimeService] Suscrito a mensajes de conversación:', conversationId);

    // Si no está corriendo el polling, iniciarlo
    if (!this.isPolling) {
      this.start();
    }

    return subscriptionId;
  }

  /**
   * Suscribirse a actualizaciones de conversaciones
   */
  subscribeToConversationUpdates(callback: ConversationUpdateCallback): string {
    const subscriptionId = `conversations_${Date.now()}`;

    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      type: 'conversation',
      callback: callback as any,
      lastCheck: new Date()
    });

    console.log('💬 [realtimeService] Suscrito a actualizaciones de conversaciones');

    // Si no está corriendo el polling, iniciarlo
    if (!this.isPolling) {
      this.start();
    }

    return subscriptionId;
  }

  /**
   * Cancelar una suscripción
   */
  unsubscribe(subscriptionId: string) {
    const subscription = this.subscriptions.get(subscriptionId);

    if (subscription) {
      console.log('❌ [realtimeService] Cancelando suscripción:', subscriptionId);
      this.subscriptions.delete(subscriptionId);

      // Si no hay más suscripciones, detener el polling
      if (this.subscriptions.size === 0) {
        this.stop();
      }
    }
  }

  /**
   * Agregar manejador de errores
   */
  onError(callback: ErrorCallback) {
    this.errorHandlers.push(callback);
  }

  /**
   * Polling interno
   */
  private async poll() {
    if (!this.isPolling) {
      return;
    }

    try {
      await this.checkForUpdates();
    } catch (error: any) {
      console.error('❌ [realtimeService] Error en polling:', error);
      this.errorHandlers.forEach(handler => handler(error));
    } finally {
      // Programar siguiente poll
      if (this.isPolling) {
        this.pollingTimer = setTimeout(() => this.poll(), this.pollInterval);
      }
    }
  }

  /**
   * Verificar actualizaciones para todas las suscripciones
   */
  private async checkForUpdates() {
    const promises: Promise<void>[] = [];

    for (const subscription of this.subscriptions.values()) {
      if (subscription.type === 'messages' && subscription.conversationId) {
        promises.push(this.checkNewMessages(subscription));
      } else if (subscription.type === 'conversation') {
        promises.push(this.checkConversationUpdates(subscription));
      }
    }

    await Promise.all(promises);
  }

  /**
   * Verificar nuevos mensajes de una conversación
   */
  private async checkNewMessages(subscription: Subscription) {
    if (!subscription.conversationId) return;

    try {
      const messages = await messageService.getConversationMessages(subscription.conversationId);

      const lastCount = this.lastMessageCount.get(subscription.conversationId) || 0;
      const currentCount = messages.length;

      // Si hay más mensajes que la última vez, notificar los nuevos
      if (currentCount > lastCount) {
        const newMessages = messages.slice(lastCount);

        console.log('🆕 [realtimeService] Nuevos mensajes detectados:', newMessages.length);

        newMessages.forEach(message => {
          (subscription.callback as MessageCallback)(message);
        });
      }

      this.lastMessageCount.set(subscription.conversationId, currentCount);
    } catch (error: any) {
      console.error('❌ [realtimeService] Error verificando mensajes:', error);
    }
  }

  /**
   * Verificar actualizaciones de conversaciones
   */
  private async checkConversationUpdates(subscription: Subscription) {
    try {
      const conversations = await conversationService.getConversations();

      // Por ahora, simplemente notificamos todas las conversaciones
      // En una implementación más sofisticada, compararíamos timestamps
      conversations.forEach(conversation => {
        const lastCheck = this.lastConversationCheck.get(conversation.id);

        if (!lastCheck || new Date(conversation.updated_at) > lastCheck) {
          (subscription.callback as ConversationUpdateCallback)(conversation);
          this.lastConversationCheck.set(conversation.id, new Date(conversation.updated_at));
        }
      });
    } catch (error: any) {
      console.error('❌ [realtimeService] Error verificando conversaciones:', error);
    }
  }

  /**
   * Limpiar todas las suscripciones
   */
  cleanup() {
    console.log('🧹 [realtimeService] Limpiando todas las suscripciones...');
    this.stop();
    this.subscriptions.clear();
    this.lastConversationCheck.clear();
    this.lastMessageCount.clear();
    this.errorHandlers = [];
  }
}

// Exportar instancia singleton
export const realtimeService = new RealtimeService();
