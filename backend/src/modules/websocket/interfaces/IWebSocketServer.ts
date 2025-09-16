/**
 * WebSocket Server Interface
 * Sprint 4 - Interface principal del servidor WebSocket
 */
import { Server as HttpServer } from 'http';
import { Server as SocketServer, Namespace } from 'socket.io';
import { AuthenticatedSocket, WebSocketConfig, ConnectionInfo } from '@/modules/websocket/types/websocket.types';
export interface IWebSocketServer {
  // Inicialización
  initialize(httpServer: HttpServer, config?: Partial<WebSocketConfig>): Promise<void>;
  shutdown(): Promise<void>;
  // Gestión de namespaces
  getNamespace(companyId: string): Namespace | undefined;
  createNamespace(companyId: string): Namespace;
  removeNamespace(companyId: string): void;
  // Broadcasting
  broadcastToCompany(companyId: string, event: string, data: any): void;
  broadcastToRoom(companyId: string, room: string, event: string, data: any): void;
  sendToUser(userId: string, event: string, data: any): void;
  // Gestión de conexiones
  getConnectionCount(companyId?: string): number;
  getActiveConnections(companyId?: string): ConnectionInfo[];
  disconnectUser(userId: string, companyId?: string): void;
  disconnectCompany(companyId: string): void;
  // Estadísticas
  getStats(): {
    totalConnections: number;
    namespaces: number;
    connectionsByCompany: Map<string, number>;
    uptime: number;
  };
  // Getters
  getServer(): SocketServer;
  isInitialized(): boolean;
}
