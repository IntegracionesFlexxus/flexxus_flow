// services/WebSocketService.ts
import { injectable, inject } from 'inversify';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { OMNI_TYPES } from '../types/omni.types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  companyId?: string;
}

@injectable()
export class WebSocketService {
  private io: Server | null = null;
  private companyNamespaces: Map<string, any> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    // No inyectamos Socket.IO en el constructor para evitar dependencia circular
  }

  // Método para inicializar el servicio con Socket.IO
  public initialize(io: Server): void {
    this.io = io;
    this.setupMiddleware();
    this.setupNamespaces();
    this.isInitialized = true;
    console.log('WebSocketService initialized successfully');
  }

  private setupMiddleware(): void {
    if (!this.io) {
      throw new Error('WebSocketService not initialized. Call initialize() first.');
    }

    // Middleware de autenticación
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        socket.userId = decoded.userId;
        socket.companyId = decoded.companyId;

        next();
      } catch (err) {
        next(new Error('Authentication error'));
      }
    });
  }

  private setupNamespaces(): void {
    if (!this.io) {
      throw new Error('WebSocketService not initialized. Call initialize() first.');
    }

    // Namespace principal
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.userId} connected to company ${socket.companyId}`);

      // Unir al room de la empresa
      if (socket.companyId) {
        socket.join(`company:${socket.companyId}`);
      }

      // Unir al room del usuario
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
      }

      // Handlers de eventos de omnicanalidad
      this.setupOmniHandlers(socket);

      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
      });
    });
  }

  private setupOmniHandlers(socket: AuthenticatedSocket): void {
    // Unirse a conversación
    socket.on('conversation:join', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
      socket.emit('conversation:joined', { conversationId });
    });

    // Salir de conversación
    socket.on('conversation:leave', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
      socket.emit('conversation:left', { conversationId });
    });

    // Typing indicator
    socket.on('typing:start', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('typing:started', {
        userId: socket.userId,
        conversationId: data.conversationId
      });
    });

    socket.on('typing:stop', (data: { conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('typing:stopped', {
        userId: socket.userId,
        conversationId: data.conversationId
      });
    });

    // Mensaje enviado
    socket.on('message:send', async (data: any) => {
      // Validar que el usuario pertenece a la empresa
      if (socket.companyId !== data.companyId) {
        socket.emit('error', { message: 'Unauthorized' });
        return;
      }

      // Emitir a todos en la conversación
      this.io.to(`conversation:${data.conversationId}`).emit('message:received', {
        ...data,
        senderId: socket.userId,
        timestamp: new Date()
      });
    });

    // Status de mensaje
    socket.on('message:delivered', (data: { messageId: string, conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('message:status', {
        messageId: data.messageId,
        status: 'delivered',
        timestamp: new Date()
      });
    });

    socket.on('message:read', (data: { messageId: string, conversationId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('message:status', {
        messageId: data.messageId,
        status: 'read',
        timestamp: new Date()
      });
    });

    // Asignación de conversaciones
    socket.on('conversation:assign', (data: { conversationId: string, userId: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('conversation:assigned', {
        conversationId: data.conversationId,
        assignedTo: data.userId,
        assignedBy: socket.userId,
        timestamp: new Date()
      });
    });

    // Cambio de estado de conversación
    socket.on('conversation:status', (data: { conversationId: string, status: string }) => {
      socket.to(`conversation:${data.conversationId}`).emit('conversation:status:changed', {
        conversationId: data.conversationId,
        status: data.status,
        changedBy: socket.userId,
        timestamp: new Date()
      });
    });
  }

  // Métodos públicos para broadcasting
  broadcastToCompany(companyId: string, event: string, data: any): void {
    if (!this.io) {
      console.warn('WebSocketService not initialized. Cannot broadcast to company.');
      return;
    }
    this.io.to(`company:${companyId}`).emit(event, data);
  }

  broadcastToUser(userId: string, event: string, data: any): void {
    if (!this.io) {
      console.warn('WebSocketService not initialized. Cannot broadcast to user.');
      return;
    }
    this.io.to(`user:${userId}`).emit(event, data);
  }

  broadcastToRoom(roomId: string, event: string, data: any): void {
    if (!this.io) {
      console.warn('WebSocketService not initialized. Cannot broadcast to room.');
      return;
    }
    this.io.to(`conversation:${roomId}`).emit(event, data);
  }

  // Obtener usuarios conectados de una empresa
  async getConnectedUsers(companyId: string): Promise<string[]> {
    if (!this.io) {
      console.warn('WebSocketService not initialized. Cannot get connected users.');
      return [];
    }
    const room = `company:${companyId}`;
    const sockets = await this.io.in(room).fetchSockets();
    return sockets.map((s: any) => s.userId).filter(Boolean);
  }

  // Obtener usuarios en una conversación
  async getUsersInConversation(conversationId: string): Promise<string[]> {
    if (!this.io) {
      console.warn('WebSocketService not initialized. Cannot get users in conversation.');
      return [];
    }
    const room = `conversation:${conversationId}`;
    const sockets = await this.io.in(room).fetchSockets();
    return sockets.map((s: any) => s.userId).filter(Boolean);
  }

  // Notificar nueva conversación
  notifyNewConversation(companyId: string, conversation: any): void {
    this.broadcastToCompany(companyId, 'conversation:new', conversation);
  }

  // Notificar nuevo mensaje
  notifyNewMessage(conversationId: string, message: any): void {
    this.broadcastToRoom(conversationId, 'message:new', message);
  }

  // Notificar cambio de estado del canal
  notifyChannelStatusChange(companyId: string, channelId: string, status: string): void {
    this.broadcastToCompany(companyId, 'channel:status:changed', {
      channelId,
      status,
      timestamp: new Date()
    });
  }

  // Obtener estadísticas de conexiones
  async getConnectionStats(): Promise<any> {
    if (!this.io) {
      console.warn('WebSocketService not initialized. Cannot get connection stats.');
      return {
        totalConnections: 0,
        uniqueCompanies: 0,
        uniqueUsers: 0
      };
    }

    const sockets = await this.io.fetchSockets();
    const companies = new Set();
    const users = new Set();

    sockets.forEach((socket: any) => {
      if (socket.companyId) companies.add(socket.companyId);
      if (socket.userId) users.add(socket.userId);
    });

    return {
      totalConnections: sockets.length,
      uniqueCompanies: companies.size,
      uniqueUsers: users.size
    };
  }

  // Método para verificar si está inicializado
  public getIsInitialized(): boolean {
    return this.isInitialized;
  }
}