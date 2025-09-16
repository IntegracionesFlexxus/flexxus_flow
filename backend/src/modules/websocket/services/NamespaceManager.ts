/**
 * Namespace Manager
 * Sprint 4 - Gestión de namespaces para aislamiento multi-tenant
 */
import { injectable, inject } from 'inversify';
import { Server as SocketServer, Namespace } from 'socket.io';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { socketAuthMiddleware } from '@/modules/websocket/middleware/socketAuthMiddleware';
import { AuthenticatedSocket, ServerEvents, ClientEvents } from '@/modules/websocket/types/websocket.types';
import { IConnectionManager } from '@/modules/websocket/interfaces/IConnectionManager';
import { HeartbeatManager } from './HeartbeatManager';
@injectable()
export class NamespaceManager {
  private namespaces: Map<string, Namespace> = new Map();
  private logger: Logger;
  private io: SocketServer | null = null;
  private connectionManager: IConnectionManager;
  private heartbeatManager: HeartbeatManager;
  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.ConnectionManager) connectionManager: IConnectionManager,
    @inject(TYPES.HeartbeatManager) heartbeatManager: HeartbeatManager
  ) {
    this.logger = logger;
    this.connectionManager = connectionManager;
    this.heartbeatManager = heartbeatManager;
  }
  /**
   * Inicializa el manager con el servidor Socket.io
   */
  initialize(io: SocketServer): void {
    this.io = io;
    this.logger.info('NamespaceManager initialized');
  }
  /**
   * Crea o obtiene un namespace para una empresa
   */
  getOrCreateNamespace(companyId: string): Namespace {
    // Si ya existe, retornarlo
    if (this.namespaces.has(companyId)) {
      return this.namespaces.get(companyId)!;
    }
    if (!this.io) {
      throw new Error('NamespaceManager not initialized');
    }
    // Crear nuevo namespace
    const namespacePath = `/company/${companyId}`;
    const namespace = this.io.of(namespacePath);
    // Configurar middleware de autenticación
    namespace.use(socketAuthMiddleware);
    // Configurar middleware adicional para verificar que el usuario pertenece a la empresa
    namespace.use((socket: any, next) => {
      const authSocket = socket as AuthenticatedSocket;
      if (authSocket.companyId !== companyId && authSocket.role !== 'admin') {
        this.logger.warn('User tried to connect to wrong company namespace', {
          userId: authSocket.userId,
          userCompanyId: authSocket.companyId,
          requestedCompanyId: companyId
        });
        return next(new Error('Unauthorized: Cannot access this company namespace'));
      }
      next();
    });
    // Configurar eventos del namespace
    this.setupNamespaceEvents(namespace, companyId);
    // Guardar referencia
    this.namespaces.set(companyId, namespace);
    this.logger.info('Namespace created', {
      companyId,
      path: namespacePath
    });
    return namespace;
  }
  /**
   * Configura los eventos para un namespace
   */
  private setupNamespaceEvents(namespace: Namespace, companyId: string): void {
    namespace.on('connection', (socket: any) => {
      const authSocket = socket as AuthenticatedSocket;
      // Agregar conexión al manager
      const added = this.connectionManager.addConnection(authSocket);
      if (!added) {
        // Si no se pudo agregar (límite alcanzado), desconectar
        authSocket.emit(ServerEvents.CONNECTION_LIMIT_REACHED, {
          message: 'Connection limit reached',
          currentConnections: this.connectionManager.getUserConnectionCount(authSocket.userId)
        });
        authSocket.disconnect(true);
        return;
      }
      // Iniciar heartbeat
      this.heartbeatManager.startHeartbeat(authSocket);
      // Notificar conexión exitosa
      authSocket.emit(ServerEvents.AUTHENTICATED, {
        socketId: authSocket.id,
        userId: authSocket.userId,
        companyId: authSocket.companyId,
        namespace: namespace.name
      });
      // Configurar eventos del socket
      this.setupSocketEvents(authSocket, namespace);
      // Notificar a otros usuarios de la empresa
      authSocket.broadcast.emit(ServerEvents.USER_CONNECTED, {
        userId: authSocket.userId,
        email: authSocket.email,
        timestamp: new Date()
      });
      this.logger.info('User connected to namespace', {
        namespace: namespace.name,
        socketId: authSocket.id,
        userId: authSocket.userId,
        companyId
      });
    });
  }
  /**
   * Configura los eventos para un socket
   */
  private setupSocketEvents(socket: AuthenticatedSocket, namespace: Namespace): void {
    // Unirse a sala
    socket.on(ClientEvents.JOIN_ROOM, async (data: { room: string }) => {
      try {
        const { room } = data;
        // Validar nombre de sala
        if (!this.isValidRoomName(room)) {
          socket.emit(ServerEvents.ERROR, {
            code: 'INVALID_ROOM',
            message: 'Invalid room name'
          });
          return;
        }
        // Unir a la sala
        await socket.join(room);
        this.connectionManager.joinRoom(socket.id, room);
        // Confirmar unión
        socket.emit(ServerEvents.ROOM_JOINED, { room });
        // Notificar a otros en la sala
        socket.to(room).emit(ServerEvents.USER_CONNECTED, {
          userId: socket.userId,
          room,
          timestamp: new Date()
        });
        this.logger.debug('User joined room', {
          socketId: socket.id,
          userId: socket.userId,
          room
        });
      } catch (error) {
        this.logger.error('Error joining room', {
          socketId: socket.id,
          error: error.message
        });
        socket.emit(ServerEvents.ERROR, {
          code: 'JOIN_ROOM_ERROR',
          message: error.message
        });
      }
    });
    // Salir de sala
    socket.on(ClientEvents.LEAVE_ROOM, async (data: { room: string }) => {
      try {
        const { room } = data;
        await socket.leave(room);
        this.connectionManager.leaveRoom(socket.id, room);
        socket.emit(ServerEvents.ROOM_LEFT, { room });
        // Notificar a otros en la sala
        socket.to(room).emit(ServerEvents.USER_DISCONNECTED, {
          userId: socket.userId,
          room,
          timestamp: new Date()
        });
        this.logger.debug('User left room', {
          socketId: socket.id,
          userId: socket.userId,
          room
        });
      } catch (error) {
        this.logger.error('Error leaving room', {
          socketId: socket.id,
          error: error.message
        });
      }
    });
    // Enviar mensaje
    socket.on(ClientEvents.MESSAGE_SEND, async (data: { room?: string; message: any }) => {
      try {
        const { room, message } = data;
        // Validar mensaje
        if (!message || typeof message !== 'object') {
          socket.emit(ServerEvents.ERROR, {
            code: 'INVALID_MESSAGE',
            message: 'Invalid message format'
          });
          return;
        }
        // Agregar metadata del emisor
        const enrichedMessage = {
          ...message,
          senderId: socket.userId,
          senderEmail: socket.email,
          timestamp: new Date()
        };
        // Enviar a sala específica o broadcast
        if (room) {
          socket.to(room).emit(ServerEvents.MESSAGE_RECEIVED, enrichedMessage);
        } else {
          socket.broadcast.emit(ServerEvents.MESSAGE_RECEIVED, enrichedMessage);
        }
        this.logger.debug('Message sent', {
          socketId: socket.id,
          userId: socket.userId,
          room: room || 'broadcast'
        });
      } catch (error) {
        this.logger.error('Error sending message', {
          socketId: socket.id,
          error: error.message
        });
        socket.emit(ServerEvents.ERROR, {
          code: 'SEND_MESSAGE_ERROR',
          message: error.message
        });
      }
    });
    // Actualizar presencia
    socket.on(ClientEvents.PRESENCE_UPDATE, (data: { status: string; metadata?: any }) => {
      try {
        const presence = {
          userId: socket.userId,
          status: data.status,
          metadata: data.metadata,
          timestamp: new Date()
        };
        // Broadcast a todos en el namespace
        socket.broadcast.emit(ServerEvents.PRESENCE_UPDATED, presence);
        this.logger.debug('Presence updated', {
          socketId: socket.id,
          userId: socket.userId,
          status: data.status
        });
      } catch (error) {
        this.logger.error('Error updating presence', {
          socketId: socket.id,
          error: error.message
        });
      }
    });
    // Desconexión
    socket.on('disconnect', (reason: string) => {
      // Detener heartbeat
      this.heartbeatManager.stopHeartbeat(socket.id);
      // Remover conexión
      this.connectionManager.removeConnection(socket.id);
      // Notificar a otros usuarios
      socket.broadcast.emit(ServerEvents.USER_DISCONNECTED, {
        userId: socket.userId,
        reason,
        timestamp: new Date()
      });
      this.logger.info('User disconnected from namespace', {
        namespace: namespace.name,
        socketId: socket.id,
        userId: socket.userId,
        reason
      });
    });
  }
  /**
   * Valida el nombre de una sala
   */
  private isValidRoomName(room: string): boolean {
    // Validar longitud
    if (!room || room.length > 100) {
      return false;
    }
    // Validar caracteres permitidos (alfanuméricos, guiones, underscores, dos puntos)
    const validPattern = /^[a-zA-Z0-9_\-:]+$/;
    return validPattern.test(room);
  }
  /**
   * Obtiene un namespace existente
   */
  getNamespace(companyId: string): Namespace | undefined {
    return this.namespaces.get(companyId);
  }
  /**
   * Elimina un namespace
   */
  removeNamespace(companyId: string): void {
    const namespace = this.namespaces.get(companyId);
    if (!namespace) {
      return;
    }
    // Desconectar todos los sockets
    namespace.disconnectSockets(true);
    // Eliminar del mapa
    this.namespaces.delete(companyId);
    this.logger.info('Namespace removed', { companyId });
  }
  /**
   * Obtiene estadísticas de namespaces
   */
  getStats(): {
    total: number;
    byCompany: Array<{ companyId: string; connections: number }>;
  } {
    const byCompany: Array<{ companyId: string; connections: number }> = [];
    this.namespaces.forEach((namespace, companyId) => {
      byCompany.push({
        companyId,
        connections: namespace.sockets.size
      });
    });
    return {
      total: this.namespaces.size,
      byCompany
    };
  }
  /**
   * Limpia todos los namespaces
   */
  clearAll(): void {
    this.namespaces.forEach((namespace, companyId) => {
      namespace.disconnectSockets(true);
    });
    this.namespaces.clear();
    this.logger.info('All namespaces cleared');
  }
}
