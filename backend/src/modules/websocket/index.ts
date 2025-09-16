/**
 * WebSocket Module
 * Sprint 4 - Módulo principal de WebSocket multi-tenant
 */
import { Container } from 'inversify';
import { TYPES } from '@/container/types';
import { WebSocketServer } from './services/WebSocketServer';
import { ConnectionManager } from './services/ConnectionManager';
import { NamespaceManager } from './services/NamespaceManager';
import { HeartbeatManager } from './services/HeartbeatManager';
import { IWebSocketServer } from './interfaces/IWebSocketServer';
import { IConnectionManager } from './interfaces/IConnectionManager';
/**
 * Registra los servicios de WebSocket en el contenedor de inversify
 */
export function registerWebSocketModule(container: Container): void {
  // Registrar Connection Manager
  container.bind<IConnectionManager>(TYPES.ConnectionManager)
    .to(ConnectionManager)
    .inSingletonScope();
  // Registrar Heartbeat Manager
  container.bind<HeartbeatManager>(TYPES.HeartbeatManager)
    .to(HeartbeatManager)
    .inSingletonScope();
  // Registrar Namespace Manager
  container.bind<NamespaceManager>(TYPES.NamespaceManager)
    .to(NamespaceManager)
    .inSingletonScope();
  // Registrar WebSocket Server
  container.bind<IWebSocketServer>(TYPES.WebSocketServer)
    .to(WebSocketServer)
    .inSingletonScope();
}
// Exportar tipos y clases
export { WebSocketServer } from './services/WebSocketServer';
export { ConnectionManager } from './services/ConnectionManager';
export { NamespaceManager } from './services/NamespaceManager';
export { HeartbeatManager } from './services/HeartbeatManager';
export { socketAuthMiddleware } from './middleware/socketAuthMiddleware';
// Exportar interfaces
export { IWebSocketServer } from './interfaces/IWebSocketServer';
export { IConnectionManager } from './interfaces/IConnectionManager';
// Exportar tipos
export * from './types/websocket.types';
