/**
 * Heartbeat Manager
 * Sprint 4 - Sistema de heartbeat para detección de desconexiones
 */
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { Namespace } from 'socket.io';
import { IConnectionManager } from '@/modules/websocket/interfaces/IConnectionManager';
import { AuthenticatedSocket, HeartbeatConfig, ClientEvents, ServerEvents } from '@/modules/websocket/types/websocket.types';
@injectable()
export class HeartbeatManager {
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private missedBeats: Map<string, number> = new Map();
  private config: HeartbeatConfig;
  private logger: Logger;
  private connectionManager: IConnectionManager;
  constructor(
    @inject(TYPES.Logger) logger: Logger,
    @inject(TYPES.ConnectionManager) connectionManager: IConnectionManager
  ) {
    this.logger = logger;
    this.connectionManager = connectionManager;
    // Configuración por defecto
    this.config = {
      interval: 25000, // 25 segundos
      timeout: 60000,  // 60 segundos
      maxMissedBeats: 3
    };
  }
  /**
   * Inicia el monitoreo de heartbeat para un socket
   */
  startHeartbeat(socket: AuthenticatedSocket): void {
    // Limpiar intervalo existente si existe
    this.stopHeartbeat(socket.id);
    // Inicializar contador de beats perdidos
    this.missedBeats.set(socket.id, 0);
    // Configurar listener para heartbeat del cliente
    socket.on(ClientEvents.HEARTBEAT, () => {
      this.handleHeartbeat(socket);
    });
    // Crear intervalo para enviar ping al cliente
    const interval = setInterval(() => {
      this.sendPing(socket);
    }, this.config.interval);
    this.heartbeatIntervals.set(socket.id, interval);
    this.logger.debug('Heartbeat started', {
      socketId: socket.id,
      userId: socket.userId,
      interval: this.config.interval
    });
  }
  /**
   * Detiene el monitoreo de heartbeat para un socket
   */
  stopHeartbeat(socketId: string): void {
    const interval = this.heartbeatIntervals.get(socketId);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(socketId);
    }
    this.missedBeats.delete(socketId);
    this.logger.debug('Heartbeat stopped', { socketId });
  }
  /**
   * Maneja respuesta de heartbeat del cliente
   */
  private handleHeartbeat(socket: AuthenticatedSocket): void {
    // Resetear contador de beats perdidos
    this.missedBeats.set(socket.id, 0);
    // Actualizar último ping en el connection manager
    this.connectionManager.updateLastPing(socket.id);
    // Enviar acknowledgment
    socket.emit(ServerEvents.HEARTBEAT_ACK, {
      timestamp: Date.now(),
      serverTime: new Date().toISOString()
    });
    this.logger.debug('Heartbeat received', {
      socketId: socket.id,
      userId: socket.userId
    });
  }
  /**
   * Envía ping al cliente
   */
  private sendPing(socket: AuthenticatedSocket): void {
    const missedCount = this.missedBeats.get(socket.id) || 0;
    // Verificar si se excedió el máximo de beats perdidos
    if (missedCount >= this.config.maxMissedBeats) {
      this.logger.warn('Max missed heartbeats reached, disconnecting', {
        socketId: socket.id,
        userId: socket.userId,
        missedBeats: missedCount
      });
      // Desconectar socket
      socket.disconnect(true);
      this.stopHeartbeat(socket.id);
      return;
    }
    // Incrementar contador de beats perdidos
    this.missedBeats.set(socket.id, missedCount + 1);
    // Enviar ping
    socket.emit(ServerEvents.HEARTBEAT_ACK, {
      type: 'ping',
      timestamp: Date.now()
    });
    this.logger.debug('Ping sent', {
      socketId: socket.id,
      missedBeats: missedCount + 1
    });
  }
  /**
   * Configura el heartbeat manager
   */
  configure(config: Partial<HeartbeatConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.info('Heartbeat configuration updated', this.config);
  }
  /**
   * Obtiene la configuración actual
   */
  getConfig(): HeartbeatConfig {
    return { ...this.config };
  }
  /**
   * Inicia heartbeat para todos los sockets de un namespace
   */
  startNamespaceHeartbeat(namespace: Namespace): void {
    namespace.sockets.forEach((socket) => {
      this.startHeartbeat(socket as AuthenticatedSocket);
    });
    this.logger.info('Namespace heartbeat started', {
      namespace: namespace.name,
      sockets: namespace.sockets.size
    });
  }
  /**
   * Detiene heartbeat para todos los sockets de un namespace
   */
  stopNamespaceHeartbeat(namespace: Namespace): void {
    namespace.sockets.forEach((socket) => {
      this.stopHeartbeat(socket.id);
    });
    this.logger.info('Namespace heartbeat stopped', {
      namespace: namespace.name
    });
  }
  /**
   * Limpia conexiones inactivas basándose en el último heartbeat
   */
  cleanupInactiveConnections(): number {
    const now = Date.now();
    const disconnected: string[] = [];
    this.missedBeats.forEach((count, socketId) => {
      if (count >= this.config.maxMissedBeats) {
        disconnected.push(socketId);
      }
    });
    disconnected.forEach(socketId => {
      this.stopHeartbeat(socketId);
      // El socket debería estar desconectado, pero limpiamos por si acaso
      this.connectionManager.removeConnection(socketId);
    });
    if (disconnected.length > 0) {
      this.logger.info(`Cleaned up ${disconnected.length} inactive connections`);
    }
    return disconnected.length;
  }
  /**
   * Obtiene estadísticas del heartbeat system
   */
  getStats(): {
    monitored: number;
    averageMissedBeats: number;
    connectionsByMissedBeats: Map<number, number>;
  } {
    const connectionsByMissedBeats = new Map<number, number>();
    let totalMissed = 0;
    this.missedBeats.forEach(count => {
      totalMissed += count;
      connectionsByMissedBeats.set(
        count,
        (connectionsByMissedBeats.get(count) || 0) + 1
      );
    });
    return {
      monitored: this.heartbeatIntervals.size,
      averageMissedBeats: this.missedBeats.size > 0 
        ? totalMissed / this.missedBeats.size 
        : 0,
      connectionsByMissedBeats
    };
  }
  /**
   * Limpia todos los heartbeats
   */
  clearAll(): void {
    this.heartbeatIntervals.forEach(interval => {
      clearInterval(interval);
    });
    this.heartbeatIntervals.clear();
    this.missedBeats.clear();
    this.logger.info('All heartbeats cleared');
  }
}
