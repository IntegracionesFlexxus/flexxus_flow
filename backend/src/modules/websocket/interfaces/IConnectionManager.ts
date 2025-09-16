/**
 * Connection Manager Interface
 * Sprint 4 - Gestión de conexiones WebSocket
 */
import { AuthenticatedSocket, ConnectionInfo, ConnectionLimits } from '@/modules/websocket/types/websocket.types';
export interface IConnectionManager {
  // Gestión de conexiones
  addConnection(socket: AuthenticatedSocket): boolean;
  removeConnection(socketId: string): void;
  updateLastPing(socketId: string): void;
  // Consultas
  getConnection(socketId: string): ConnectionInfo | undefined;
  getConnectionsByUser(userId: string): ConnectionInfo[];
  getConnectionsByCompany(companyId: string): ConnectionInfo[];
  getUserConnectionCount(userId: string): number;
  getCompanyConnectionCount(companyId: string): number;
  // Límites
  setLimits(limits: Partial<ConnectionLimits>): void;
  getLimits(): ConnectionLimits;
  isUserLimitReached(userId: string): boolean;
  isCompanyLimitReached(companyId: string): boolean;
  canConnect(userId: string, companyId: string): boolean;
  // Rooms
  joinRoom(socketId: string, room: string): void;
  leaveRoom(socketId: string, room: string): void;
  getRooms(socketId: string): Set<string>;
  // Limpieza
  cleanupStaleConnections(maxAge: number): number;
  clearAll(): void;
  // Estadísticas
  getStats(): {
    total: number;
    byCompany: Map<string, number>;
    byUser: Map<string, number>;
    averageRoomsPerConnection: number;
  };
}
