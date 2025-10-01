/**
 * Omni WebSocket Handler - Sprint 05
 * Handles real-time communication for omnichannel module
 */

import { injectable, inject } from 'inversify';
import { Socket, Namespace } from 'socket.io';
import { TYPES } from '@/container/types';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

interface OmniSocketData {
  companyId: string;
  userId: string;
  conversationRooms: Set<string>;
  aiEventSubscriptions?: Set<string>; // AI event types subscribed to
}

@injectable()
export class OmniWebSocketHandler {
  private namespace!: Namespace;
  private logger: any;
  private activeConnections: Map<string, OmniSocketData> = new Map();

  constructor() {
    this.logger = LoggerFactory.create({ file: __filename });
  }

  /**
   * Initialize the WebSocket handler with Socket.io server
   */
  initialize(io: any): void {
    this.logger.info('Initializing Omni WebSocket handler');

    // Create namespace for omnichannel
    this.namespace = io.of('/omni');

    // Configure middleware for authentication
    this.namespace.use(this.authenticateSocket.bind(this));

    // Handle connections
    this.namespace.on('connection', this.handleConnection.bind(this));

    this.logger.info('Omni WebSocket handler initialized successfully');
  }

  /**
   * Authenticate socket connection
   */
  private async authenticateSocket(socket: Socket, next: any): Promise<void> {
    try {
      const { token, companyId } = socket.handshake.auth;

      if (!token || !companyId) {
        return next(new Error('Authentication required'));
      }

      // TODO: Validate JWT token properly
      // For now, just store the company ID
      (socket as any).companyId = companyId;
      (socket as any).userId = socket.handshake.auth.userId || 'unknown';

      next();
    } catch (error) {
      this.logger.error('Socket authentication failed:', error);
      next(new Error('Authentication failed'));
    }
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket): void {
    const companyId = (socket as any).companyId;
    const userId = (socket as any).userId;

    this.logger.info('New omni socket connection', {
      socketId: socket.id,
      companyId,
      userId
    });

    // Store connection data
    this.activeConnections.set(socket.id, {
      companyId,
      userId,
      conversationRooms: new Set()
    });

    // Join company room
    socket.join(`company:${companyId}`);

    // Register event handlers
    this.registerEventHandlers(socket);

    // Handle disconnect
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  /**
   * Register event handlers for socket
   */
  private registerEventHandlers(socket: Socket): void {
    // Join conversation room
    socket.on('conversation:join', (conversationId: string) => {
      this.handleJoinConversation(socket, conversationId);
    });

    // Leave conversation room
    socket.on('conversation:leave', (conversationId: string) => {
      this.handleLeaveConversation(socket, conversationId);
    });

    // Typing indicators
    socket.on('typing:start', (data: any) => {
      this.handleTypingStart(socket, data);
    });

    socket.on('typing:stop', (data: any) => {
      this.handleTypingStop(socket, data);
    });

    // Agent status
    socket.on('agent:status', (status: string) => {
      this.handleAgentStatus(socket, status);
    });

    // Request conversation list
    socket.on('conversations:list', () => {
      this.handleRequestConversations(socket);
    });

    // AI Events (Sprint 10)
    socket.on('ai:request_analysis', (data: any) => {
      this.handleAIAnalysisRequest(socket, data);
    });

    socket.on('ai:subscribe_events', (filters: any) => {
      this.handleAIEventSubscription(socket, filters);
    });

    socket.on('ai:unsubscribe_events', () => {
      this.handleAIEventUnsubscription(socket);
    });
  }

  /**
   * Handle joining a conversation room
   */
  private handleJoinConversation(socket: Socket, conversationId: string): void {
    const connectionData = this.activeConnections.get(socket.id);
    if (!connectionData) return;

    const room = `conversation:${conversationId}`;
    socket.join(room);
    connectionData.conversationRooms.add(conversationId);

    this.logger.debug('Socket joined conversation', {
      socketId: socket.id,
      conversationId
    });

    // Notify others in the conversation
    socket.to(room).emit('user:joined', {
      userId: connectionData.userId,
      conversationId,
      timestamp: new Date()
    });
  }

  /**
   * Handle leaving a conversation room
   */
  private handleLeaveConversation(socket: Socket, conversationId: string): void {
    const connectionData = this.activeConnections.get(socket.id);
    if (!connectionData) return;

    const room = `conversation:${conversationId}`;
    socket.leave(room);
    connectionData.conversationRooms.delete(conversationId);

    this.logger.debug('Socket left conversation', {
      socketId: socket.id,
      conversationId
    });

    // Notify others in the conversation
    socket.to(room).emit('user:left', {
      userId: connectionData.userId,
      conversationId,
      timestamp: new Date()
    });
  }

  /**
   * Handle typing start event
   */
  private handleTypingStart(socket: Socket, data: any): void {
    const { conversationId, userName } = data;
    const connectionData = this.activeConnections.get(socket.id);
    if (!connectionData) return;

    socket.to(`conversation:${conversationId}`).emit('typing:start', {
      userId: connectionData.userId,
      userName: userName || 'Agent',
      conversationId,
      timestamp: new Date()
    });
  }

  /**
   * Handle typing stop event
   */
  private handleTypingStop(socket: Socket, data: any): void {
    const { conversationId } = data;
    const connectionData = this.activeConnections.get(socket.id);
    if (!connectionData) return;

    socket.to(`conversation:${conversationId}`).emit('typing:stop', {
      userId: connectionData.userId,
      conversationId,
      timestamp: new Date()
    });
  }

  /**
   * Handle agent status change
   */
  private handleAgentStatus(socket: Socket, status: string): void {
    const connectionData = this.activeConnections.get(socket.id);
    if (!connectionData) return;

    // Broadcast to company room
    socket.to(`company:${connectionData.companyId}`).emit('agent:status', {
      userId: connectionData.userId,
      status,
      timestamp: new Date()
    });
  }

  /**
   * Handle request for conversations list
   */
  private handleRequestConversations(socket: Socket): void {
    // This would typically fetch from database
    // For now, send a placeholder response
    socket.emit('conversations:list', {
      conversations: [],
      timestamp: new Date()
    });
  }

  /**
   * Handle socket disconnect
   */
  private handleDisconnect(socket: Socket): void {
    const connectionData = this.activeConnections.get(socket.id);

    if (connectionData) {
      // Leave all conversation rooms
      connectionData.conversationRooms.forEach(conversationId => {
        socket.to(`conversation:${conversationId}`).emit('user:disconnected', {
          userId: connectionData.userId,
          timestamp: new Date()
        });
      });

      // Broadcast agent offline status
      socket.to(`company:${connectionData.companyId}`).emit('agent:status', {
        userId: connectionData.userId,
        status: 'offline',
        timestamp: new Date()
      });

      this.activeConnections.delete(socket.id);
    }

    this.logger.info('Omni socket disconnected', { socketId: socket.id });
  }

  // Public methods for emitting events from services

  /**
   * Emit new message event
   */
  emitMessage(conversationId: string, message: any): void {
    const room = `conversation:${conversationId}`;
    this.namespace.to(room).emit('message:new', {
      ...message,
      timestamp: new Date()
    });
  }

  /**
   * Emit conversation update event
   */
  emitConversationUpdate(conversationId: string, update: any): void {
    const room = `conversation:${conversationId}`;
    this.namespace.to(room).emit('conversation:update', {
      conversationId,
      ...update,
      timestamp: new Date()
    });
  }

  /**
   * Emit new conversation event
   */
  emitNewConversation(companyId: string, conversation: any): void {
    const room = `company:${companyId}`;
    this.namespace.to(room).emit('conversation:new', {
      ...conversation,
      timestamp: new Date()
    });
  }

  /**
   * Emit channel status update
   */
  emitChannelStatusUpdate(companyId: string, channelId: string, status: string): void {
    const room = `company:${companyId}`;
    this.namespace.to(room).emit('channel:status', {
      channelId,
      status,
      timestamp: new Date()
    });
  }

  /**
   * Emit customer update
   */
  emitCustomerUpdate(companyId: string, customer: any): void {
    const room = `company:${companyId}`;
    this.namespace.to(room).emit('customer:update', {
      ...customer,
      timestamp: new Date()
    });
  }

  /**
   * Get active connections count
   */
  getActiveConnectionsCount(): number {
    return this.activeConnections.size;
  }

  /**
   * Get active connections by company
   */
  getCompanyConnections(companyId: string): number {
    let count = 0;
    this.activeConnections.forEach(connection => {
      if (connection.companyId === companyId) {
        count++;
      }
    });
    return count;
  }

  /**
   * Get active conversations for a user
   */
  getUserConversations(userId: string): string[] {
    const conversations: string[] = [];
    this.activeConnections.forEach(connection => {
      if (connection.userId === userId) {
        conversations.push(...Array.from(connection.conversationRooms));
      }
    });
    return conversations;
  }

  // =======================
  // AI EVENT HANDLERS (Sprint 10)
  // =======================

  /**
   * Handle AI analysis request
   */
  private handleAIAnalysisRequest(socket: Socket, data: any): void {
    const connectionData = this.activeConnections.get(socket.id);
    if (!connectionData) return;

    const { conversation_id, features, priority } = data;

    this.logger.debug('AI analysis requested via WebSocket', {
      socketId: socket.id,
      conversation_id,
      features,
      priority
    });

    // Emit to AI processing system (handled by RealTimeAIProcessor)
    this.namespace.emit('ai:process_request', {
      conversation_id,
      features: features || ['sentiment'],
      priority: priority || 'medium',
      requested_by: connectionData.userId,
      company_id: connectionData.companyId,
      socket_id: socket.id
    });

    // Acknowledge request
    socket.emit('ai:analysis_queued', {
      conversation_id,
      features,
      timestamp: new Date()
    });
  }

  /**
   * Handle AI event subscription
   */
  private handleAIEventSubscription(socket: Socket, filters: any): void {
    const connectionData = this.activeConnections.get(socket.id);
    if (!connectionData) return;

    if (!connectionData.aiEventSubscriptions) {
      connectionData.aiEventSubscriptions = new Set();
    }

    const { event_types, conversation_ids } = filters;

    // Subscribe to event types
    if (Array.isArray(event_types)) {
      event_types.forEach(eventType => {
        connectionData.aiEventSubscriptions!.add(eventType);
      });
    }

    // Join AI event rooms
    if (Array.isArray(conversation_ids)) {
      conversation_ids.forEach(conversationId => {
        socket.join(`ai:${conversationId}`);
      });
    }

    // Join company-wide AI events room
    socket.join(`ai:company:${connectionData.companyId}`);

    this.logger.debug('AI event subscription added', {
      socketId: socket.id,
      event_types,
      conversation_ids
    });

    socket.emit('ai:subscription_confirmed', {
      event_types: Array.from(connectionData.aiEventSubscriptions),
      timestamp: new Date()
    });
  }

  /**
   * Handle AI event unsubscription
   */
  private handleAIEventUnsubscription(socket: Socket): void {
    const connectionData = this.activeConnections.get(socket.id);
    if (!connectionData) return;

    // Clear AI event subscriptions
    connectionData.aiEventSubscriptions?.clear();

    // Leave all AI-related rooms
    const rooms = Array.from(socket.rooms);
    rooms.forEach(room => {
      if (room.startsWith('ai:')) {
        socket.leave(room);
      }
    });

    this.logger.debug('AI event subscription removed', {
      socketId: socket.id
    });

    socket.emit('ai:unsubscription_confirmed', {
      timestamp: new Date()
    });
  }

  // =======================
  // AI EVENT EMITTERS (Sprint 10)
  // =======================

  /**
   * Emit sentiment analysis completed event
   */
  emitSentimentAnalyzed(conversationId: string, sentiment: any): void {
    const aiRoom = `ai:${conversationId}`;

    this.namespace.to(aiRoom).emit('ai:sentiment_analyzed', {
      conversation_id: conversationId,
      sentiment,
      timestamp: new Date()
    });

    this.logger.debug('Sentiment analysis event emitted', {
      conversation_id: conversationId,
      sentiment_label: sentiment.label
    });
  }

  /**
   * Emit conversation summary completed event
   */
  emitSummaryGenerated(conversationId: string, summary: any): void {
    const aiRoom = `ai:${conversationId}`;

    this.namespace.to(aiRoom).emit('ai:summary_generated', {
      conversation_id: conversationId,
      summary,
      timestamp: new Date()
    });

    this.logger.debug('Summary generation event emitted', {
      conversation_id: conversationId,
      word_count: summary.word_count
    });
  }

  /**
   * Emit quality evaluation completed event
   */
  emitQualityEvaluated(conversationId: string, quality: any): void {
    const aiRoom = `ai:${conversationId}`;

    this.namespace.to(aiRoom).emit('ai:quality_evaluated', {
      conversation_id: conversationId,
      quality,
      timestamp: new Date()
    });

    this.logger.debug('Quality evaluation event emitted', {
      conversation_id: conversationId,
      quality_score: quality.quality_score
    });
  }

  /**
   * Emit AI processing job status update
   */
  emitAIJobUpdate(jobId: string, status: string, data: any): void {
    // Emit to all sockets that might be interested in this job
    this.namespace.emit('ai:job_update', {
      job_id: jobId,
      status,
      data,
      timestamp: new Date()
    });

    this.logger.debug('AI job update event emitted', {
      job_id: jobId,
      status
    });
  }

  /**
   * Emit AI alert event
   */
  emitAIAlert(companyId: string, alert: any): void {
    const companyRoom = `ai:company:${companyId}`;

    this.namespace.to(companyRoom).emit('ai:alert', {
      ...alert,
      timestamp: new Date()
    });

    this.logger.debug('AI alert event emitted', {
      company_id: companyId,
      alert_type: alert.type
    });
  }

  /**
   * Emit performance metrics update
   */
  emitPerformanceUpdate(companyId: string, metrics: any): void {
    const companyRoom = `ai:company:${companyId}`;

    this.namespace.to(companyRoom).emit('performance:update', {
      metrics,
      timestamp: new Date()
    });
  }

  /**
   * Emit routing decision event
   */
  emitRoutingDecision(conversationId: string, decision: any): void {
    const aiRoom = `ai:${conversationId}`;

    this.namespace.to(aiRoom).emit('routing:decision', {
      conversation_id: conversationId,
      decision,
      timestamp: new Date()
    });

    this.logger.debug('Routing decision event emitted', {
      conversation_id: conversationId,
      agent_id: decision.agent_id,
      strategy: decision.routing_strategy
    });
  }

  /**
   * Check if socket is subscribed to AI events
   */
  isSubscribedToAIEvents(socketId: string, eventType?: string): boolean {
    const connectionData = this.activeConnections.get(socketId);
    if (!connectionData?.aiEventSubscriptions) {
      return false;
    }

    if (eventType) {
      return connectionData.aiEventSubscriptions.has(eventType);
    }

    return connectionData.aiEventSubscriptions.size > 0;
  }

  /**
   * Get AI event subscribers count
   */
  getAISubscribersCount(eventType?: string): number {
    let count = 0;
    this.activeConnections.forEach(connection => {
      if (connection.aiEventSubscriptions) {
        if (eventType) {
          if (connection.aiEventSubscriptions.has(eventType)) {
            count++;
          }
        } else if (connection.aiEventSubscriptions.size > 0) {
          count++;
        }
      }
    });
    return count;
  }
}