/**
 * Connection Manager Implementation
 * Sprint 4 - Gestión de conexiones WebSocket con límites configurables
 */
import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { IConnectionManager } from '@/modules/websocket/interfaces/IConnectionManager';
import { 
  AuthenticatedSocket, 
  ConnectionInfo, 
  ConnectionLimits 
} from '@/modules/websocket/types/websocket.types';
@injectable()
export class ConnectionManager implements IConnectionManager {
  private connections: Map<string, ConnectionInfo> = new Map();
  private userConnections: Map<string, Set<string>> = new Map();
  private companyConnections: Map<string, Set<string>> = new Map();
  private limits: ConnectionLimits;
  private logger: Logger;
  constructor(@inject(TYPES.Logger) logger: Logger) {
    this.logger = logger;
    // Límites por defecto
    this.limits = {
      maxConnectionsPerUser: 5,
      maxConnectionsPerCompany: 200,
      maxConnectionsTotal: 10000
    };
  }
  /**
   * Agrega una nueva conexión
   */
  addConnection(socket: AuthenticatedSocket): boolean {
    // Verificar límites antes de agregar
    if (!this.canConnect(socket.userId, socket.companyId)) {
      this.logger.warn('Connection limit reached', {
        userId: socket.userId,
        companyId: socket.companyId,
        currentUserConnections: this.getUserConnectionCount(socket.userId),
        currentCompanyConnections: this.getCompanyConnectionCount(socket.companyId)
      });
      return false;
    }
    // Crear información de conexión
    const connectionInfo: ConnectionInfo = {
      socketId: socket.id,
      userId: socket.userId,
      companyId: socket.companyId,
      namespace: socket.nsp.name,
      connectedAt: new Date(),
      lastPingAt: new Date(),
      ipAddress: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      rooms: new Set([socket.id]) // Socket.io automáticamente une al socket a su propia room
    };
    // Agregar a mapas
    this.connections.set(socket.id, connectionInfo);
    // Actualizar índices de usuario
    if (!this.userConnections.has(socket.userId)) {
      this.userConnections.set(socket.userId, new Set());
    }
    this.userConnections.get(socket.userId)!.add(socket.id);
    // Actualizar índices de empresa
    if (!this.companyConnections.has(socket.companyId)) {
      this.companyConnections.set(socket.companyId, new Set());
    }
    this.companyConnections.get(socket.companyId)!.add(socket.id);
    this.logger.info('Connection added', {
      socketId: socket.id,
      userId: socket.userId,
      companyId: socket.companyId,
      totalConnections: this.connections.size
    });
    return true;
  }
  /**
   * Elimina una conexión
   */
  removeConnection(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (!connection) {
      return;
    }
    // Eliminar de índice de usuario
    const userSockets = this.userConnections.get(connection.userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userConnections.delete(connection.userId);
      }
    }
    // Eliminar de índice de empresa
    const companySockets = this.companyConnections.get(connection.companyId);
    if (companySockets) {
      companySockets.delete(socketId);
      if (companySockets.size === 0) {
        this.companyConnections.delete(connection.companyId);
      }
    }
    // Eliminar conexión principal
    this.connections.delete(socketId);
    this.logger.info('Connection removed', {
      socketId,
      userId: connection.userId,
      companyId: connection.companyId,
      remainingConnections: this.connections.size
    });
  }
  /**
   * Actualiza el último ping de una conexión
   */
  updateLastPing(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastPingAt = new Date();
    }
  }
  /**
   * Obtiene información de una conexión
   */
  getConnection(socketId: string): ConnectionInfo | undefined {
    return this.connections.get(socketId);
  }
  /**
   * Obtiene conexiones de un usuario
   */
  getConnectionsByUser(userId: string): ConnectionInfo[] {
    const socketIds = this.userConnections.get(userId);
    if (!socketIds) {
      return [];
    }
    const connections: ConnectionInfo[] = [];
    socketIds.forEach(socketId => {
      const connection = this.connections.get(socketId);
      if (connection) {
        connections.push(connection);
      }
    });
    return connections;
  }
  /**
   * Obtiene conexiones de una empresa
   */
  getConnectionsByCompany(companyId: string): ConnectionInfo[] {
    const socketIds = this.companyConnections.get(companyId);
    if (!socketIds) {
      return [];
    }
    const connections: ConnectionInfo[] = [];
    socketIds.forEach(socketId => {
      const connection = this.connections.get(socketId);
      if (connection) {
        connections.push(connection);
      }
    });
    return connections;
  }
  /**
   * Cuenta conexiones de un usuario
   */
  getUserConnectionCount(userId: string): number {
    return this.userConnections.get(userId)?.size || 0;
  }
  /**
   * Cuenta conexiones de una empresa
   */
  getCompanyConnectionCount(companyId: string): number {
    return this.companyConnections.get(companyId)?.size || 0;
  }
  /**
   * Establece nuevos límites
   */
  setLimits(limits: Partial<ConnectionLimits>): void {
    this.limits = { ...this.limits, ...limits };
    this.logger.info('Connection limits updated', this.limits);
  }
  /**
   * Obtiene los límites actuales
   */
  getLimits(): ConnectionLimits {
    return { ...this.limits };
  }
  /**
   * Verifica si se alcanzó el límite de usuario
   */
  isUserLimitReached(userId: string): boolean {
    return this.getUserConnectionCount(userId) >= this.limits.maxConnectionsPerUser;
  }
  /**
   * Verifica si se alcanzó el límite de empresa
   */
  isCompanyLimitReached(companyId: string): boolean {
    return this.getCompanyConnectionCount(companyId) >= this.limits.maxConnectionsPerCompany;
  }
  /**
   * Verifica si un usuario puede conectarse
   */
  canConnect(userId: string, companyId: string): boolean {
    // Verificar límite total
    if (this.connections.size >= this.limits.maxConnectionsTotal) {
      return false;
    }
    // Verificar límite de usuario
    if (this.isUserLimitReached(userId)) {
      return false;
    }
    // Verificar límite de empresa
    if (this.isCompanyLimitReached(companyId)) {
      return false;
    }
    return true;
  }
  /**
   * Une un socket a una sala
   */
  joinRoom(socketId: string, room: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.rooms.add(room);
    }
  }
  /**
   * Remueve un socket de una sala
   */
  leaveRoom(socketId: string, room: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.rooms.delete(room);
    }
  }
  /**
   * Obtiene las salas de un socket
   */
  getRooms(socketId: string): Set<string> {
    const connection = this.connections.get(socketId);
    return connection?.rooms || new Set();
  }
  /**
   * Limpia conexiones obsoletas
   */
  cleanupStaleConnections(maxAge: number): number {
    const now = Date.now();
    const staleConnections: string[] = [];
    this.connections.forEach((connection, socketId) => {
      const lastPingAge = connection.lastPingAt 
        ? now - connection.lastPingAt.getTime()
        : now - connection.connectedAt.getTime();
      if (lastPingAge > maxAge) {
        staleConnections.push(socketId);
      }
    });
    staleConnections.forEach(socketId => {
      this.removeConnection(socketId);
    });
    if (staleConnections.length > 0) {
      this.logger.info(`Cleaned up ${staleConnections.length} stale connections`);
    }
    return staleConnections.length;
  }
  /**
   * Limpia todas las conexiones
   */
  clearAll(): void {
    const count = this.connections.size;
    this.connections.clear();
    this.userConnections.clear();
    this.companyConnections.clear();
    this.logger.info(`Cleared all ${count} connections`);
  }
  /**
   * Obtiene estadísticas de conexiones
   */
  getStats(): {
    total: number;
    byCompany: Map<string, number>;
    byUser: Map<string, number>;
    averageRoomsPerConnection: number;
  } {
    const byCompany = new Map<string, number>();
    const byUser = new Map<string, number>();
    let totalRooms = 0;
    this.connections.forEach(connection => {
      // Contar por empresa
      byCompany.set(
        connection.companyId,
        (byCompany.get(connection.companyId) || 0) + 1
      );
      // Contar por usuario
      byUser.set(
        connection.userId,
        (byUser.get(connection.userId) || 0) + 1
      );
      // Contar salas
      totalRooms += connection.rooms.size;
    });
    return {
      total: this.connections.size,
      byCompany,
      byUser,
      averageRoomsPerConnection: this.connections.size > 0 
        ? totalRooms / this.connections.size 
        : 0
    };
  }
}
