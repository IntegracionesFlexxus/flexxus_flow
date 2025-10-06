/**
 * WebSocket Server Implementation
 * Sprint 4 - Servidor WebSocket multi-tenant con Socket.io
 */
import { injectable, inject } from 'inversify';
import { Server as HttpServer } from 'http';
import { Server as SocketServer, Namespace } from 'socket.io';
import { createAdapter } from 'socket.io-redis';
import Redis from 'ioredis';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { environment } from '@/config/environment';
import { IWebSocketServer } from '@/modules/websocket/interfaces/IWebSocketServer';
import { IConnectionManager } from '@/modules/websocket/interfaces/IConnectionManager';
import { NamespaceManager } from './NamespaceManager';
import { HeartbeatManager } from './HeartbeatManager';
import { 
  WebSocketConfig, 
  ConnectionInfo,
  AuthenticatedSocket,
  ServerEvents
} from '@/modules/websocket/types/websocket.types';
@injectable()
export class WebSocketServer implements IWebSocketServer {
  private io: SocketServer | null = null;
  private httpServer: HttpServer | null = null;
  private initialized: boolean = false;
  private startTime: Date = new Date();
  private logger: Logger;
  private connectionManager: IConnectionManager;
  private namespaceManager: NamespaceManager;
  private heartbeatManager: HeartbeatManager;
  private cleanupInterval: NodeJS.Timeout | null = null;
  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.ConnectionManager) connectionManager: IConnectionManager,
    @inject(TYPES.NamespaceManager) namespaceManager: NamespaceManager,
    @inject(TYPES.HeartbeatManager) heartbeatManager: HeartbeatManager
  ) {
    this.logger = logger;
    this.connectionManager = connectionManager;
    this.namespaceManager = namespaceManager;
    this.heartbeatManager = heartbeatManager;
  }
  /**
   * Inicializa el servidor WebSocket
   */
  async initialize(httpServer: HttpServer, config?: Partial<WebSocketConfig>): Promise<void> {
    if (this.initialized) {
      this.logger.warn('WebSocket server already initialized');
      return;
    }
    this.httpServer = httpServer;
    // Configuración por defecto
    const defaultConfig: WebSocketConfig = {
      cors: {
        origin: environment.cors?.origin || '*',
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      transports: ['polling', 'websocket'],
      path: '/socket.io'
    };
    const finalConfig = { ...defaultConfig, ...config };
    // Crear servidor Socket.io
    this.io = new SocketServer(this.httpServer, finalConfig);
    // Configurar adaptador Redis si está disponible
    if (environment.redis?.host) {
      await this.setupRedisAdapter();
    }
    // Inicializar namespace manager
    this.namespaceManager.initialize(this.io);
    // Configurar límites de conexión basados en el plan
    this.configureConnectionLimits();
    // Iniciar limpieza periódica
    this.startPeriodicCleanup();
    this.initialized = true;
    this.startTime = new Date();
    this.logger.info('WebSocket server initialized', {
      config: finalConfig,
      redisEnabled: !!environment.redis?.host
    });
  }
  /**
   * Configura el adaptador Redis para escalabilidad
   */
  private async setupRedisAdapter(): Promise<void> {
    try {
      const pubClient = new Redis({
        host: environment.redis.host,
        port: environment.redis.port,
        password: environment.redis.password
      });
      const subClient = pubClient.duplicate();
      const adapter = createAdapter(pubClient as any, subClient as any);
      this.io!.adapter(adapter);
      this.logger.info('Redis adapter configured for WebSocket scaling');
    } catch (error) {
      this.logger.error('Failed to setup Redis adapter', { error: error.message });
      // Continuar sin Redis (single instance mode)
    }
  }
  /**
   * Configura límites de conexión según el entorno
   */
  private configureConnectionLimits(): void {
    // TODO: Obtener límites desde la configuración del plan de la empresa
    const limits = {
      maxConnectionsPerUser: environment.isProduction ? 5 : 10,
      maxConnectionsPerCompany: environment.isProduction ? 200 : 500,
      maxConnectionsTotal: environment.isProduction ? 10000 : 1000
    };
    this.connectionManager.setLimits(limits);
    this.logger.info('Connection limits configured', limits);
  }
  /**
   * Inicia limpieza periódica de conexiones obsoletas
   */
  private startPeriodicCleanup(): void {
    // Limpiar cada 5 minutos
    this.cleanupInterval = setInterval(() => {
      const staleCount = this.connectionManager.cleanupStaleConnections(120000); // 2 minutos
      const inactiveCount = this.heartbeatManager.cleanupInactiveConnections();
      if (staleCount > 0 || inactiveCount > 0) {
        this.logger.info('Periodic cleanup completed', {
          staleConnections: staleCount,
          inactiveConnections: inactiveCount
        });
      }
    }, 300000); // 5 minutos
  }
  /**
   * Cierra el servidor WebSocket
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    // Detener limpieza periódica
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    // Desconectar todos los clientes
    if (this.io) {
      this.io.disconnectSockets(true);
      // Cerrar servidor
      await new Promise<void>((resolve) => {
        this.io!.close(() => {
          this.logger.info('WebSocket server closed');
          resolve();
        });
      });
    }
    // Limpiar managers
    this.namespaceManager.clearAll();
    this.heartbeatManager.clearAll();
    this.connectionManager.clearAll();
    this.initialized = false;
    this.io = null;
    this.httpServer = null;
    this.logger.info('WebSocket server shutdown complete');
  }
  /**
   * Obtiene o crea un namespace para una empresa
   */
  getNamespace(companyId: string): Namespace | undefined {
    if (!this.initialized) {
      throw new Error('WebSocket server not initialized');
    }
    return this.namespaceManager.getOrCreateNamespace(companyId);
  }
  /**
   * Crea un namespace para una empresa
   */
  createNamespace(companyId: string): Namespace {
    if (!this.initialized) {
      throw new Error('WebSocket server not initialized');
    }
    return this.namespaceManager.getOrCreateNamespace(companyId);
  }
  /**
   * Elimina un namespace
   */
  removeNamespace(companyId: string): void {
    this.namespaceManager.removeNamespace(companyId);
  }
  /**
   * Broadcast a toda una empresa
   */
  broadcastToCompany(companyId: string, event: string, data: any): void {
    const namespace = this.getNamespace(companyId);
    if (namespace) {
      namespace.emit(event, data);
      this.logger.debug('Broadcast to company', {
        companyId,
        event,
        connections: namespace.sockets.size
      });
    }
  }
  /**
   * Broadcast a una sala específica de una empresa
   */
  broadcastToRoom(companyId: string, room: string, event: string, data: any): void {
    const namespace = this.getNamespace(companyId);
    if (namespace) {
      namespace.to(room).emit(event, data);
      this.logger.debug('Broadcast to room', {
        companyId,
        room,
        event
      });
    }
  }
  /**
   * Envía mensaje a un usuario específico
   */
  sendToUser(userId: string, event: string, data: any): void {
    const connections = this.connectionManager.getConnectionsByUser(userId);
    connections.forEach(connection => {
      // Encontrar el socket en su namespace
      const namespace = this.namespaceManager.getNamespace(connection.companyId);
      if (namespace) {
        const socket = namespace.sockets.get(connection.socketId);
        if (socket) {
          socket.emit(event, data);
        }
      }
    });
    this.logger.debug('Message sent to user', {
      userId,
      event,
      connections: connections.length
    });
  }
  /**
   * Obtiene el número de conexiones
   */
  getConnectionCount(companyId?: string): number {
    if (companyId) {
      return this.connectionManager.getCompanyConnectionCount(companyId);
    }
    return this.connectionManager.getStats().total;
  }
  /**
   * Obtiene las conexiones activas
   */
  getActiveConnections(companyId?: string): ConnectionInfo[] {
    if (companyId) {
      return this.connectionManager.getConnectionsByCompany(companyId);
    }
    // Obtener todas las conexiones
    const stats = this.connectionManager.getStats();
    const allConnections: ConnectionInfo[] = [];
    stats.byCompany.forEach((count, companyId) => {
      const connections = this.connectionManager.getConnectionsByCompany(companyId);
      allConnections.push(...connections);
    });
    return allConnections;
  }
  /**
   * Desconecta a un usuario
   */
  disconnectUser(userId: string, companyId?: string): void {
    const connections = this.connectionManager.getConnectionsByUser(userId);
    connections.forEach(connection => {
      if (!companyId || connection.companyId === companyId) {
        const namespace = this.namespaceManager.getNamespace(connection.companyId);
        if (namespace) {
          const socket = namespace.sockets.get(connection.socketId);
          if (socket) {
            socket.disconnect(true);
          }
        }
      }
    });
    this.logger.info('User disconnected', {
      userId,
      companyId,
      connectionsDisconnected: connections.length
    });
  }
  /**
   * Desconecta todas las conexiones de una empresa
   */
  disconnectCompany(companyId: string): void {
    const namespace = this.getNamespace(companyId);
    if (namespace) {
      namespace.disconnectSockets(true);
      this.logger.info('Company disconnected', {
        companyId,
        connections: namespace.sockets.size
      });
    }
  }
  /**
   * Obtiene estadísticas del servidor
   */
  getStats(): {
    totalConnections: number;
    namespaces: number;
    connectionsByCompany: Map<string, number>;
    uptime: number;
  } {
    const connectionStats = this.connectionManager.getStats();
    const namespaceStats = this.namespaceManager.getStats();
    return {
      totalConnections: connectionStats.total,
      namespaces: namespaceStats.total,
      connectionsByCompany: connectionStats.byCompany,
      uptime: Date.now() - this.startTime.getTime()
    };
  }
  /**
   * Obtiene el servidor Socket.io
   */
  getServer(): SocketServer {
    if (!this.io) {
      throw new Error('WebSocket server not initialized');
    }
    return this.io;
  }
  /**
   * Verifica si el servidor está inicializado
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
