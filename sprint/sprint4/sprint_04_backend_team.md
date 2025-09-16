---
title: "Sprint 04 - Backend Team"
tipo: "funcionalidad"
estado: "vigente"
prioridad: "alta"
tags: ["backend", "websocket", "event-bus", "testing", "arquitectura", "nodejs", "typescript"]
responsable: "Backend Team"
fecha_inicio: "2024-02-12"
fecha_fin: "2024-02-25"
dependencias: ["sprint_03_backend_team"]
version: "1.0"
sprint: 4
---

# Sprint 04 - Backend Team

## Información del Sprint
- **Duración:** Semanas 7-8 (2 semanas)
- **Equipo:** Backend Team (4 desarrolladores)
- **Objetivo:** Establecer servicios fundamentales, WebSocket infrastructure, y patterns base

## Objetivos Específicos

### Objetivo Principal
Implementar la infraestructura de servicios core que soportará todos los módulos del sistema, incluyendo event bus interno, WebSocket server multi-tenant, service layer patterns, y framework de testing.

### Objetivos Técnicos
1. Implementar Event Bus interno para comunicación cross-módulo
2. Establecer WebSocket server completo con multi-tenancy
3. Crear Service Layer base classes y Repository Pattern
4. Implementar testing framework robusto con coverage
5. Configurar API documentation y error handling centralizado
6. Establecer background job processing system

## Tareas Detalladas

### 1. Event Bus Internal Implementation

#### 1.1 Event Bus Core Infrastructure
```typescript
// src/core/events/EventBus.ts
import { EventEmitter } from 'events';
import { Logger } from '../logging/Logger';
import { performance } from 'perf_hooks';
import { v4 as uuidv4 } from 'uuid';

export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  companyId: string;
  userId?: string;
  data: Record<string, any>;
  metadata: {
    timestamp: Date;
    version: string;
    correlationId?: string;
    causationId?: string;
    source: string;
  };
}

export interface EventHandler<T extends DomainEvent = DomainEvent> {
  handle(event: T): Promise<void>;
  eventType: string;
  priority?: number; // Lower number = higher priority
  timeout?: number;
}

export interface EventSubscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  options: SubscriptionOptions;
}

export interface SubscriptionOptions {
  retry?: {
    maxRetries: number;
    backoffMs: number;
    exponentialBackoff?: boolean;
  };
  timeout?: number;
  deadLetterQueue?: boolean;
  companyFilter?: string[];
  priority?: number;
}

export class EventBus {
  private emitter: EventEmitter;
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private logger: Logger;
  private isProcessing = false;
  private eventQueue: DomainEvent[] = [];
  private deadLetterQueue: DomainEvent[] = [];
  private processingStats = {
    totalEvents: 0,
    successfulEvents: 0,
    failedEvents: 0,
    averageProcessingTime: 0,
    lastProcessingTime: 0
  };

  constructor(private maxQueueSize: number = 10000) {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100);
    this.logger = new Logger('EventBus');
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.emitter.on('error', (error) => {
      this.logger.error('EventEmitter error', { error: error.message, stack: error.stack });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  async publish(event: DomainEvent): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Validate event structure
      this.validateEvent(event);

      this.logger.info(`Publishing event ${event.eventType}`, {
        eventId: event.eventId,
        aggregateId: event.aggregateId,
        companyId: event.companyId
      });

      // Check queue size
      if (this.eventQueue.length >= this.maxQueueSize) {
        throw new Error(`Event queue full. Size: ${this.eventQueue.length}`);
      }

      // Add to processing queue
      this.eventQueue.push(event);
      this.processingStats.totalEvents++;
      
      // Process queue if not already processing
      if (!this.isProcessing) {
        setImmediate(() => this.processEventQueue());
      }
      
    } catch (error) {
      this.logger.error(`Failed to publish event ${event.eventType}`, {
        error: error.message,
        eventId: event.eventId
      });
      throw error;
    } finally {
      const endTime = performance.now();
      this.updateProcessingStats(endTime - startTime);
    }
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>,
    options: SubscriptionOptions = {}
  ): string {
    const subscriptionId = uuidv4();
    const subscription: EventSubscription = {
      id: subscriptionId,
      eventType,
      handler: handler as EventHandler,
      options: {
        retry: { maxRetries: 3, backoffMs: 1000, ...options.retry },
        timeout: 30000,
        deadLetterQueue: true,
        ...options
      }
    };

    if (!this.subscriptions.has(eventType)) {
      this.subscriptions.set(eventType, []);
    }

    const subs = this.subscriptions.get(eventType)!;
    subs.push(subscription);

    // Sort by priority (lower number = higher priority)
    subs.sort((a, b) => (a.options.priority || 100) - (b.options.priority || 100));

    this.logger.info(`Subscribed to event ${eventType}`, {
      subscriptionId,
      handlerName: handler.constructor.name,
      totalSubscriptions: subs.length
    });

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): boolean {
    for (const [eventType, subscriptions] of this.subscriptions) {
      const index = subscriptions.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        subscriptions.splice(index, 1);
        this.logger.info(`Unsubscribed from event ${eventType}`, { subscriptionId });
        return true;
      }
    }
    return false;
  }

  private async processEventQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()!;
        await this.processEvent(event);
      }
    } catch (error) {
      this.logger.error('Error processing event queue', { error: error.message });
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(event: DomainEvent): Promise<void> {
    const startTime = performance.now();
    const subscriptions = this.subscriptions.get(event.eventType) || [];

    if (subscriptions.length === 0) {
      this.logger.debug(`No subscribers for event ${event.eventType}`, {
        eventId: event.eventId
      });
      return;
    }

    const processingPromises = subscriptions.map(subscription =>
      this.executeHandler(event, subscription, startTime)
    );

    await Promise.allSettled(processingPromises);
  }

  private async executeHandler(
    event: DomainEvent,
    subscription: EventSubscription,
    startTime: number
  ): Promise<void> {
    const { handler, options } = subscription;
    let attempt = 0;
    let lastError: Error | null = null;

    // Check company filter
    if (options.companyFilter && 
        !options.companyFilter.includes(event.companyId)) {
      return;
    }

    while (attempt <= (options.retry?.maxRetries || 0)) {
      try {
        // Set timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Handler timeout')), options.timeout);
        });

        await Promise.race([
          handler.handle(event),
          timeoutPromise
        ]);

        this.processingStats.successfulEvents++;
        
        this.logger.debug(`Event ${event.eventType} processed successfully`, {
          eventId: event.eventId,
          handlerName: handler.constructor.name,
          attempt: attempt + 1,
          processingTime: performance.now() - startTime
        });

        return; // Success, exit retry loop
        
      } catch (error) {
        lastError = error;
        attempt++;

        this.logger.warn(`Event ${event.eventType} processing failed`, {
          eventId: event.eventId,
          handlerName: handler.constructor.name,
          attempt,
          maxRetries: options.retry?.maxRetries,
          error: error.message
        });

        if (attempt <= (options.retry?.maxRetries || 0)) {
          // Calculate backoff delay
          let delay = options.retry?.backoffMs || 1000;
          if (options.retry?.exponentialBackoff) {
            delay *= Math.pow(2, attempt - 1);
          }
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    this.processingStats.failedEvents++;
    
    if (options.deadLetterQueue) {
      this.deadLetterQueue.push({
        ...event,
        metadata: {
          ...event.metadata,
          failureReason: lastError?.message || 'Unknown error',
          failedAt: new Date(),
          attempts: attempt
        }
      });
    }

    this.logger.error(`Event ${event.eventType} processing failed permanently`, {
      eventId: event.eventId,
      handlerName: handler.constructor.name,
      totalAttempts: attempt,
      finalError: lastError?.message
    });
  }

  private validateEvent(event: DomainEvent): void {
    const required = ['eventId', 'eventType', 'aggregateId', 'aggregateType', 'companyId', 'data'];
    
    for (const field of required) {
      if (!event[field as keyof DomainEvent]) {
        throw new Error(`Event validation failed: missing ${field}`);
      }
    }

    if (!event.metadata || !event.metadata.timestamp || !event.metadata.version) {
      throw new Error('Event validation failed: invalid metadata');
    }
  }

  private updateProcessingStats(processingTime: number): void {
    this.processingStats.lastProcessingTime = processingTime;
    
    // Calculate rolling average
    const currentAvg = this.processingStats.averageProcessingTime;
    const totalEvents = this.processingStats.totalEvents;
    
    if (totalEvents === 1) {
      this.processingStats.averageProcessingTime = processingTime;
    } else {
      this.processingStats.averageProcessingTime = 
        (currentAvg * (totalEvents - 1) + processingTime) / totalEvents;
    }
  }

  getStats() {
    return {
      ...this.processingStats,
      queueSize: this.eventQueue.length,
      deadLetterQueueSize: this.deadLetterQueue.length,
      subscriptionCount: Array.from(this.subscriptions.values())
        .reduce((acc, subs) => acc + subs.length, 0)
    };
  }

  async gracefulShutdown(): Promise<void> {
    this.logger.info('Starting graceful shutdown of EventBus');
    
    // Wait for current processing to complete
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    while (this.isProcessing && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }
    
    if (this.isProcessing) {
      this.logger.warn('Force stopping EventBus - some events may be lost');
    }
    
    this.logger.info('EventBus shutdown complete', {
      remainingEvents: this.eventQueue.length,
      deadLetterEvents: this.deadLetterQueue.length
    });
  }
}

// Event Bus Singleton
export const eventBus = new EventBus();
```

#### 1.2 Domain Events Definition
```typescript
// src/core/events/DomainEvents.ts
import { DomainEvent } from './EventBus';

// Auth Module Events
export interface UserLoggedInEvent extends DomainEvent {
  eventType: 'user.logged_in';
  data: {
    userId: string;
    companyId: string;
    loginMethod: 'email' | 'sso' | 'api';
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface UserSwitchedCompanyEvent extends DomainEvent {
  eventType: 'user.switched_company';
  data: {
    userId: string;
    fromCompanyId: string;
    toCompanyId: string;
  };
}

export interface UserInvitedEvent extends DomainEvent {
  eventType: 'user.invited';
  data: {
    invitationId: string;
    email: string;
    roleId: string;
    invitedBy: string;
    expiresAt: Date;
  };
}

// Omni Module Events
export interface MessageReceivedEvent extends DomainEvent {
  eventType: 'message.received';
  data: {
    messageId: string;
    conversationId: string;
    channelType: string;
    customerId: string;
    content: string;
    metadata?: Record<string, any>;
  };
}

export interface MessageSentEvent extends DomainEvent {
  eventType: 'message.sent';
  data: {
    messageId: string;
    conversationId: string;
    channelType: string;
    agentId: string;
    customerId: string;
    content: string;
  };
}

export interface ConversationAssignedEvent extends DomainEvent {
  eventType: 'conversation.assigned';
  data: {
    conversationId: string;
    assignedToUserId: string;
    assignedByUserId?: string;
    previousAssigneeId?: string;
  };
}

export interface LeadCapturedEvent extends DomainEvent {
  eventType: 'lead.captured';
  data: {
    leadId: string;
    source: string;
    contactInfo: {
      name: string;
      email?: string;
      phone?: string;
    };
    formData?: Record<string, any>;
    utmData?: Record<string, any>;
  };
}

// CRM Module Events (for future use)
export interface ContactCreatedEvent extends DomainEvent {
  eventType: 'contact.created';
  data: {
    contactId: string;
    accountId?: string;
    leadId?: string;
    contactInfo: Record<string, any>;
  };
}

export interface OpportunityCreatedEvent extends DomainEvent {
  eventType: 'opportunity.created';
  data: {
    opportunityId: string;
    accountId: string;
    contactId?: string;
    value?: number;
    stage: string;
  };
}

// Workflow Module Events (for future use)
export interface WorkflowTriggeredEvent extends DomainEvent {
  eventType: 'workflow.triggered';
  data: {
    workflowId: string;
    triggeredBy: string;
    triggerData: Record<string, any>;
  };
}
```

#### 1.3 Event Handlers Base Class
```typescript
// src/core/events/BaseEventHandler.ts
import { EventHandler, DomainEvent } from './EventBus';
import { Logger } from '../logging/Logger';

export abstract class BaseEventHandler<T extends DomainEvent = DomainEvent> 
  implements EventHandler<T> {
  
  protected logger: Logger;
  
  constructor(
    public readonly eventType: string,
    public readonly priority: number = 100,
    public readonly timeout: number = 30000
  ) {
    this.logger = new Logger(`${this.constructor.name}`);
  }

  abstract handle(event: T): Promise<void>;

  protected async withRetry<R>(
    operation: () => Promise<R>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<R> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(`Attempt ${attempt} failed`, { error: error.message });
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError!;
  }

  protected validateEventData(event: T, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (!event.data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
  }

  protected async executeWithTimeout<R>(
    operation: () => Promise<R>,
    timeoutMs: number = this.timeout
  ): Promise<R> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  }
}
```

### 2. WebSocket Server Implementation

#### 2.1 WebSocket Server Core
```typescript
// src/core/websocket/WebSocketServer.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { Logger } from '../logging/Logger';
import { EventBus } from '../events/EventBus';

interface AuthenticatedSocket extends Socket {
  userId: string;
  companyId: string;
  userRoles: string[];
}

interface SocketSession {
  userId: string;
  companyId: string;
  connectedAt: Date;
  lastActivity: Date;
  metadata: {
    ipAddress: string;
    userAgent: string;
    version?: string;
  };
}

export class WebSocketServer {
  private io: SocketIOServer;
  private logger: Logger;
  private activeSessions: Map<string, SocketSession> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private companyNamespaces: Map<string, any> = new Map();

  constructor(
    private httpServer: HttpServer,
    private eventBus: EventBus,
    private jwtSecret: string
  ) {
    this.logger = new Logger('WebSocketServer');
    this.setupServer();
    this.setupEventHandlers();
  }

  private setupServer(): void {
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        credentials: true
      },
      path: '/ws',
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        await this.authenticateSocket(socket);
        next();
      } catch (error) {
        this.logger.error('Socket authentication failed', { 
          error: error.message,
          socketId: socket.id 
        });
        next(new Error('Authentication failed'));
      }
    });

    // Connection handler
    this.io.on('connection', (socket) => {
      this.handleConnection(socket as AuthenticatedSocket);
    });
  }

  private async authenticateSocket(socket: Socket): Promise<void> {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    
    if (!token) {
      throw new Error('No authentication token provided');
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      
      // Validate token structure
      if (!decoded.userId || !decoded.companyId) {
        throw new Error('Invalid token structure');
      }

      // TODO: Validate user still has access to company
      // const hasAccess = await this.validateUserCompanyAccess(decoded.userId, decoded.companyId);
      // if (!hasAccess) {
      //   throw new Error('User no longer has access to company');
      // }

      // Attach user info to socket
      (socket as AuthenticatedSocket).userId = decoded.userId;
      (socket as AuthenticatedSocket).companyId = decoded.companyId;
      (socket as AuthenticatedSocket).userRoles = decoded.roles || [];

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  private handleConnection(socket: AuthenticatedSocket): void {
    const { userId, companyId } = socket;
    
    this.logger.info('WebSocket connection established', {
      socketId: socket.id,
      userId,
      companyId,
      ipAddress: socket.handshake.address
    });

    // Register session
    this.registerSession(socket);

    // Join company-specific room
    socket.join(`company:${companyId}`);
    
    // Join user-specific room
    socket.join(`user:${userId}`);

    // Setup event handlers
    this.setupSocketHandlers(socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Send initial connection confirmation
    socket.emit('connection:established', {
      socketId: socket.id,
      serverTime: new Date(),
      companyId,
      userId
    });
  }

  private registerSession(socket: AuthenticatedSocket): void {
    const session: SocketSession = {
      userId: socket.userId,
      companyId: socket.companyId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      metadata: {
        ipAddress: socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'] || 'Unknown',
        version: socket.handshake.query.version as string
      }
    };

    this.activeSessions.set(socket.id, session);

    // Track user sockets
    if (!this.userSockets.has(socket.userId)) {
      this.userSockets.set(socket.userId, new Set());
    }
    this.userSockets.get(socket.userId)!.add(socket.id);
  }

  private setupSocketHandlers(socket: AuthenticatedSocket): void {
    // Real-time messaging
    socket.on('message:send', async (data) => {
      await this.handleMessageSend(socket, data);
    });

    socket.on('conversation:join', async (data) => {
      await this.handleConversationJoin(socket, data);
    });

    socket.on('conversation:leave', async (data) => {
      await this.handleConversationLeave(socket, data);
    });

    socket.on('typing:start', (data) => {
      this.handleTypingStart(socket, data);
    });

    socket.on('typing:stop', (data) => {
      this.handleTypingStop(socket, data);
    });

    // Heartbeat for activity tracking
    socket.on('heartbeat', () => {
      this.updateLastActivity(socket.id);
    });

    // Error handling
    socket.on('error', (error) => {
      this.logger.error('Socket error', {
        socketId: socket.id,
        userId: socket.userId,
        error: error.message
      });
    });
  }

  private async handleMessageSend(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      this.validateMessageData(data);
      
      // TODO: Validate user can send message to this conversation
      // const canSend = await this.validateMessagePermissions(socket.userId, data.conversationId);
      
      const messageData = {
        ...data,
        sentBy: socket.userId,
        sentAt: new Date(),
        socketId: socket.id
      };

      // Emit to conversation participants
      socket.to(`conversation:${data.conversationId}`).emit('message:received', messageData);
      
      // Acknowledge to sender
      socket.emit('message:sent', { 
        tempId: data.tempId, 
        messageId: data.messageId,
        sentAt: messageData.sentAt 
      });

      // Publish domain event
      await this.eventBus.publish({
        eventId: `msg-${Date.now()}-${socket.id}`,
        eventType: 'message.sent',
        aggregateId: data.conversationId,
        aggregateType: 'conversation',
        companyId: socket.companyId,
        userId: socket.userId,
        data: messageData,
        metadata: {
          timestamp: new Date(),
          version: '1.0',
          source: 'websocket'
        }
      });

      this.updateLastActivity(socket.id);

    } catch (error) {
      this.logger.error('Failed to handle message send', {
        socketId: socket.id,
        error: error.message,
        data
      });
      
      socket.emit('message:error', {
        tempId: data.tempId,
        error: error.message
      });
    }
  }

  private async handleConversationJoin(socket: AuthenticatedSocket, data: any): Promise<void> {
    try {
      const { conversationId } = data;
      
      // TODO: Validate user has access to conversation
      // const hasAccess = await this.validateConversationAccess(socket.userId, conversationId);
      
      socket.join(`conversation:${conversationId}`);
      
      // Notify other participants
      socket.to(`conversation:${conversationId}`).emit('participant:joined', {
        userId: socket.userId,
        conversationId,
        joinedAt: new Date()
      });

      socket.emit('conversation:joined', { conversationId });

      this.logger.debug('User joined conversation', {
        userId: socket.userId,
        conversationId,
        socketId: socket.id
      });

    } catch (error) {
      socket.emit('conversation:join_error', {
        conversationId: data.conversationId,
        error: error.message
      });
    }
  }

  private async handleConversationLeave(socket: AuthenticatedSocket, data: any): Promise<void> {
    const { conversationId } = data;
    
    socket.leave(`conversation:${conversationId}`);
    
    // Notify other participants
    socket.to(`conversation:${conversationId}`).emit('participant:left', {
      userId: socket.userId,
      conversationId,
      leftAt: new Date()
    });

    socket.emit('conversation:left', { conversationId });
  }

  private handleTypingStart(socket: AuthenticatedSocket, data: any): void {
    const { conversationId } = data;
    
    socket.to(`conversation:${conversationId}`).emit('typing:started', {
      userId: socket.userId,
      conversationId,
      startedAt: new Date()
    });
  }

  private handleTypingStop(socket: AuthenticatedSocket, data: any): void {
    const { conversationId } = data;
    
    socket.to(`conversation:${conversationId}`).emit('typing:stopped', {
      userId: socket.userId,
      conversationId,
      stoppedAt: new Date()
    });
  }

  private handleDisconnection(socket: AuthenticatedSocket, reason: string): void {
    this.logger.info('WebSocket disconnection', {
      socketId: socket.id,
      userId: socket.userId,
      reason
    });

    // Clean up session
    this.activeSessions.delete(socket.id);

    // Remove from user sockets
    const userSocketSet = this.userSockets.get(socket.userId);
    if (userSocketSet) {
      userSocketSet.delete(socket.id);
      if (userSocketSet.size === 0) {
        this.userSockets.delete(socket.userId);
      }
    }

    // Notify company members of disconnection
    socket.to(`company:${socket.companyId}`).emit('user:disconnected', {
      userId: socket.userId,
      disconnectedAt: new Date(),
      reason
    });
  }

  private validateMessageData(data: any): void {
    if (!data.conversationId || !data.content) {
      throw new Error('Invalid message data');
    }

    if (typeof data.content !== 'string' || data.content.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    if (data.content.length > 4000) {
      throw new Error('Message too long');
    }
  }

  private updateLastActivity(socketId: string): void {
    const session = this.activeSessions.get(socketId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  private setupEventHandlers(): void {
    // Listen for events that should be broadcast via WebSocket
    this.eventBus.subscribe('message.received', {
      handle: async (event) => {
        await this.broadcastMessageReceived(event);
      },
      eventType: 'message.received'
    });

    this.eventBus.subscribe('conversation.assigned', {
      handle: async (event) => {
        await this.broadcastConversationAssigned(event);
      },
      eventType: 'conversation.assigned'
    });

    this.eventBus.subscribe('user.switched_company', {
      handle: async (event) => {
        await this.handleUserSwitchedCompany(event);
      },
      eventType: 'user.switched_company'
    });
  }

  private async broadcastMessageReceived(event: any): Promise<void> {
    const { conversationId, companyId } = event.data;
    
    // Broadcast to conversation participants
    this.io.to(`conversation:${conversationId}`).emit('message:new', {
      messageId: event.data.messageId,
      conversationId,
      content: event.data.content,
      senderId: event.data.customerId,
      receivedAt: new Date(),
      channelType: event.data.channelType
    });
  }

  private async broadcastConversationAssigned(event: any): Promise<void> {
    const { conversationId, assignedToUserId, companyId } = event.data;
    
    // Notify the assigned user
    this.io.to(`user:${assignedToUserId}`).emit('conversation:assigned', {
      conversationId,
      assignedAt: new Date(),
      assignedBy: event.data.assignedByUserId
    });
  }

  private async handleUserSwitchedCompany(event: any): Promise<void> {
    const { userId, fromCompanyId, toCompanyId } = event.data;
    
    const userSocketIds = this.userSockets.get(userId) || new Set();
    
    for (const socketId of userSocketIds) {
      const socket = this.io.sockets.sockets.get(socketId);
      if (socket) {
        // Leave old company room
        socket.leave(`company:${fromCompanyId}`);
        
        // Join new company room
        socket.join(`company:${toCompanyId}`);
        
        // Update socket company context
        (socket as AuthenticatedSocket).companyId = toCompanyId;
        
        // Notify client of company switch
        socket.emit('company:switched', {
          fromCompanyId,
          toCompanyId,
          switchedAt: new Date()
        });
      }
    }
  }

  // Public methods for broadcasting
  public async broadcastToCompany(companyId: string, event: string, data: any): Promise<void> {
    this.io.to(`company:${companyId}`).emit(event, data);
  }

  public async broadcastToUser(userId: string, event: string, data: any): Promise<void> {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  public async broadcastToConversation(conversationId: string, event: string, data: any): Promise<void> {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  public getActiveConnections(): number {
    return this.activeSessions.size;
  }

  public getCompanyConnections(companyId: string): number {
    return Array.from(this.activeSessions.values())
      .filter(session => session.companyId === companyId).length;
  }

  public getUserConnections(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  public getConnectionStats() {
    return {
      totalConnections: this.activeSessions.size,
      uniqueUsers: this.userSockets.size,
      companiesWithConnections: new Set(
        Array.from(this.activeSessions.values()).map(s => s.companyId)
      ).size
    };
  }
}
```

#### 2.2 WebSocket Service Integration
```typescript
// src/core/websocket/WebSocketService.ts
import { WebSocketServer } from './WebSocketServer';
import { EventBus } from '../events/EventBus';
import { Logger } from '../logging/Logger';

export class WebSocketService {
  private logger: Logger;
  private wsServer: WebSocketServer;

  constructor(
    private httpServer: any,
    private eventBus: EventBus,
    private jwtSecret: string
  ) {
    this.logger = new Logger('WebSocketService');
  }

  public initialize(): void {
    this.wsServer = new WebSocketServer(
      this.httpServer,
      this.eventBus,
      this.jwtSecret
    );

    this.logger.info('WebSocket service initialized');
  }

  public async broadcastSystemMessage(companyId: string, message: string, type: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
    await this.wsServer.broadcastToCompany(companyId, 'system:message', {
      message,
      type,
      timestamp: new Date()
    });
  }

  public async notifyUserActivity(userId: string, activity: string, data?: any): Promise<void> {
    await this.wsServer.broadcastToUser(userId, 'user:activity', {
      activity,
      data,
      timestamp: new Date()
    });
  }

  public async broadcastConversationUpdate(conversationId: string, update: any): Promise<void> {
    await this.wsServer.broadcastToConversation(conversationId, 'conversation:updated', {
      conversationId,
      ...update,
      updatedAt: new Date()
    });
  }

  public getStats() {
    return this.wsServer?.getConnectionStats() || { totalConnections: 0, uniqueUsers: 0, companiesWithConnections: 0 };
  }

  public async gracefulShutdown(): Promise<void> {
    this.logger.info('Starting WebSocket service graceful shutdown');
    
    // TODO: Implement graceful shutdown logic
    // - Notify all connected clients
    // - Wait for active operations to complete
    // - Close server
    
    this.logger.info('WebSocket service shutdown complete');
  }
}
```

### 3. Service Layer Base Classes

#### 3.1 Base Service Pattern
```typescript
// src/core/services/BaseService.ts
import { Logger } from '../logging/Logger';
import { EventBus } from '../events/EventBus';
import { DatabaseManager } from '../database/DatabaseManager';

export abstract class BaseService {
  protected logger: Logger;
  protected eventBus: EventBus;
  protected db: DatabaseManager;

  constructor(
    serviceName: string,
    eventBus: EventBus,
    db: DatabaseManager
  ) {
    this.logger = new Logger(serviceName);
    this.eventBus = eventBus;
    this.db = db;
  }

  protected async withTransaction<T>(
    operation: (trx: any) => Promise<T>,
    database: string = 'shared'
  ): Promise<T> {
    const connection = this.db.getConnection(database);
    const trx = await connection.transaction();
    
    try {
      const result = await operation(trx);
      await trx.commit();
      return result;
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  protected async publishEvent(event: any): Promise<void> {
    try {
      await this.eventBus.publish(event);
    } catch (error) {
      this.logger.error('Failed to publish event', {
        eventType: event.eventType,
        error: error.message
      });
      // Don't throw - event publishing failure shouldn't break business operation
    }
  }

  protected validateRequired(data: any, fields: string[]): void {
    const missing = fields.filter(field => !data[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        this.logger.warn(`Operation attempt ${attempt} failed`, { error: error.message });
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    
    throw lastError!;
  }
}
```

#### 3.2 Repository Pattern Base
```typescript
// src/core/repository/BaseRepository.ts
import { Logger } from '../logging/Logger';
import { DatabaseManager } from '../database/DatabaseManager';

export interface RepositoryOptions {
  softDeletes?: boolean;
  timestamps?: boolean;
  multiTenant?: boolean;
}

export abstract class BaseRepository<T = any> {
  protected logger: Logger;
  protected db: DatabaseManager;
  protected tableName: string;
  protected database: string;
  protected options: RepositoryOptions;

  constructor(
    tableName: string,
    database: string,
    db: DatabaseManager,
    options: RepositoryOptions = {}
  ) {
    this.tableName = tableName;
    this.database = database;
    this.db = db;
    this.logger = new Logger(`${tableName}Repository`);
    this.options = {
      softDeletes: false,
      timestamps: true,
      multiTenant: false,
      ...options
    };
  }

  protected getConnection() {
    return this.db.getConnection(this.database);
  }

  protected getQueryBuilder() {
    const query = this.getConnection()(this.tableName);
    
    // Apply soft delete filter
    if (this.options.softDeletes) {
      query.whereNull('deleted_at');
    }
    
    return query;
  }

  protected applyCompanyFilter(query: any, companyId: string) {
    if (this.options.multiTenant) {
      query.where('company_id', companyId);
    }
    return query;
  }

  protected prepareForInsert(data: Partial<T>): any {
    const prepared = { ...data };
    
    if (this.options.timestamps) {
      prepared.created_at = new Date();
      prepared.updated_at = new Date();
    }
    
    return prepared;
  }

  protected prepareForUpdate(data: Partial<T>): any {
    const prepared = { ...data };
    
    if (this.options.timestamps) {
      prepared.updated_at = new Date();
    }
    
    // Remove created_at from updates
    delete prepared.created_at;
    
    return prepared;
  }

  async findById(id: string, companyId?: string): Promise<T | null> {
    try {
      let query = this.getQueryBuilder().where('id', id).first();
      
      if (companyId && this.options.multiTenant) {
        query = this.applyCompanyFilter(query, companyId);
      }
      
      const result = await query;
      return result || null;
    } catch (error) {
      this.logger.error(`Error finding ${this.tableName} by id`, { id, error: error.message });
      throw error;
    }
  }

  async findAll(companyId?: string, options: { limit?: number; offset?: number } = {}): Promise<T[]> {
    try {
      let query = this.getQueryBuilder();
      
      if (companyId && this.options.multiTenant) {
        query = this.applyCompanyFilter(query, companyId);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.offset) {
        query = query.offset(options.offset);
      }
      
      return await query;
    } catch (error) {
      this.logger.error(`Error finding all ${this.tableName}`, { error: error.message });
      throw error;
    }
  }

  async create(data: Partial<T>, companyId?: string): Promise<T> {
    try {
      const insertData = this.prepareForInsert(data);
      
      if (companyId && this.options.multiTenant) {
        insertData.company_id = companyId;
      }
      
      const [result] = await this.getConnection()(this.tableName)
        .insert(insertData)
        .returning('*');
      
      this.logger.debug(`Created ${this.tableName}`, { id: result.id });
      return result;
    } catch (error) {
      this.logger.error(`Error creating ${this.tableName}`, { error: error.message, data });
      throw error;
    }
  }

  async update(id: string, data: Partial<T>, companyId?: string): Promise<T | null> {
    try {
      const updateData = this.prepareForUpdate(data);
      let query = this.getConnection()(this.tableName).where('id', id);
      
      if (companyId && this.options.multiTenant) {
        query = this.applyCompanyFilter(query, companyId);
      }
      
      const [result] = await query.update(updateData).returning('*');
      
      if (result) {
        this.logger.debug(`Updated ${this.tableName}`, { id });
      }
      
      return result || null;
    } catch (error) {
      this.logger.error(`Error updating ${this.tableName}`, { id, error: error.message });
      throw error;
    }
  }

  async delete(id: string, companyId?: string): Promise<boolean> {
    try {
      let query = this.getConnection()(this.tableName).where('id', id);
      
      if (companyId && this.options.multiTenant) {
        query = this.applyCompanyFilter(query, companyId);
      }
      
      if (this.options.softDeletes) {
        const [result] = await query.update({ 
          deleted_at: new Date(),
          updated_at: new Date()
        }).returning('id');
        
        if (result) {
          this.logger.debug(`Soft deleted ${this.tableName}`, { id });
          return true;
        }
      } else {
        const deletedCount = await query.del();
        if (deletedCount > 0) {
          this.logger.debug(`Hard deleted ${this.tableName}`, { id });
          return true;
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error(`Error deleting ${this.tableName}`, { id, error: error.message });
      throw error;
    }
  }

  async count(companyId?: string): Promise<number> {
    try {
      let query = this.getQueryBuilder().count('* as count').first();
      
      if (companyId && this.options.multiTenant) {
        query = this.applyCompanyFilter(query, companyId);
      }
      
      const result = await query;
      return parseInt(result.count) || 0;
    } catch (error) {
      this.logger.error(`Error counting ${this.tableName}`, { error: error.message });
      throw error;
    }
  }

  async exists(id: string, companyId?: string): Promise<boolean> {
    const result = await this.findById(id, companyId);
    return result !== null;
  }
}
```

### Testing Requirements

#### Unit Tests (Jest Framework)
- [ ] **EventBus:** Test event publishing, subscription, error handling, dead letter queue
- [ ] **WebSocket Server:** Test authentication, message broadcasting, room management
- [ ] **Base Services:** Test transaction handling, event publishing, retry logic
- [ ] **Base Repository:** Test CRUD operations, multi-tenancy, soft deletes
- [ ] **Event Handlers:** Test individual handlers with mock dependencies

#### Integration Tests
- [ ] **Cross-module event flow:** Test events flowing from Omni to CRM modules
- [ ] **WebSocket real-time messaging:** End-to-end message sending and receiving
- [ ] **Database transaction rollback:** Test transaction failure scenarios
- [ ] **Event bus under load:** Test with high volume of concurrent events

#### Performance Tests
- [ ] **WebSocket concurrent connections:** Test 1000+ simultaneous connections
- [ ] **Event processing throughput:** Test events per second capacity
- [ ] **Memory usage monitoring:** Test for memory leaks in long-running processes
- [ ] **Database connection pooling:** Test connection efficiency under load

## Sprint Success Criteria

### Must Have
- [x] Event Bus funcionando con cross-module communication
- [x] WebSocket server con multi-tenant authentication
- [x] Base service y repository patterns implementados
- [x] Testing framework configurado con coverage > 80%
- [x] Error handling centralizado funcionando
- [x] API documentation inicial generada

### Should Have
- [x] Background job processing system básico
- [x] Performance monitoring para EventBus y WebSocket
- [x] Graceful shutdown procedures
- [x] Connection pooling optimizado
- [x] Dead letter queue para failed events

### Could Have
- [ ] Event sourcing capability básica
- [ ] Advanced WebSocket scaling preparation
- [ ] Metrics collection para performance analysis
- [ ] Health check endpoints para monitoring
- [ ] Rate limiting para WebSocket connections

El Sprint 4 del Backend Team establece la columna vertebral técnica que soportará toda la funcionalidad del sistema, con énfasis en comunicación real-time, events y patterns escalables.
