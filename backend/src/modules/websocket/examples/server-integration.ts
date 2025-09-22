/**
 * WebSocket Server Integration Example
 * Sprint 4 - Ejemplo de integración con Express
 */
import { Server as HttpServer } from 'http';
import { Application } from 'express';
import { Container } from 'inversify';
import { TYPES } from '@/container/types';
import { IWebSocketServer } from '@/modules/websocket/interfaces/IWebSocketServer';
import { registerWebSocketModule } from '@/modules/websocket/index';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

// Logger instance
const logger = LoggerFactory.create({ file: __filename });

/**
 * Integra el servidor WebSocket con Express
 */
export async function setupWebSocketServer(
  app: Application,
  httpServer: HttpServer,
  container: Container
): Promise<IWebSocketServer> {
  // Registrar módulo WebSocket en el container
  registerWebSocketModule(container);
  // Obtener instancia del servidor WebSocket
  const wsServer = container.get<IWebSocketServer>(TYPES.WebSocketServer);
  // Inicializar el servidor
  await wsServer.initialize(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e6, // 1MB
    transports: ['polling', 'websocket'],
    path: '/socket.io'
  });
  // Agregar endpoints HTTP para información de WebSocket
  setupWebSocketEndpoints(app, wsServer);
  // Configurar limpieza al cerrar
  setupGracefulShutdown(wsServer);
  logger.info('WebSocket server initialized and integrated with Express');
  return wsServer;
}
/**
 * Configura endpoints HTTP para administración de WebSocket
 */
function setupWebSocketEndpoints(app: Application, wsServer: IWebSocketServer): void {
  // Endpoint para obtener estadísticas
  app.get('/api/websocket/stats', (req, res) => {
    try {
      const stats = wsServer.getStats();
      res.json({
        success: true,
        data: {
          ...stats,
          connectionsByCompany: Array.from(stats.connectionsByCompany.entries()).map(
            ([companyId, count]) => ({ companyId, count })
          )
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get WebSocket stats'
      });
    }
  });
  // Endpoint para obtener conexiones activas (requiere autenticación admin)
  app.get('/api/websocket/connections', (req, res) => {
    try {
      const companyId = req.query.companyId as string;
      const connections = wsServer.getActiveConnections(companyId);
      res.json({
        success: true,
        data: {
          total: connections.length,
          connections: connections.map(conn => ({
            socketId: conn.socketId,
            userId: conn.userId,
            companyId: conn.companyId,
            connectedAt: conn.connectedAt,
            lastPingAt: conn.lastPingAt,
            rooms: Array.from(conn.rooms)
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to get connections'
      });
    }
  });
  // Endpoint para desconectar un usuario (requiere autenticación admin)
  app.post('/api/websocket/disconnect-user', (req, res) => {
    try {
      const { userId, companyId } = req.body;
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required'
        });
      }
      wsServer.disconnectUser(userId, companyId);
      res.json({
        success: true,
        message: 'User disconnected successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to disconnect user'
      });
    }
  });
  // Endpoint para broadcast a empresa (requiere autenticación)
  app.post('/api/websocket/broadcast', (req, res) => {
    try {
      const { companyId, event, data } = req.body;
      if (!companyId || !event) {
        return res.status(400).json({
          success: false,
          error: 'companyId and event are required'
        });
      }
      wsServer.broadcastToCompany(companyId, event, data);
      res.json({
        success: true,
        message: 'Broadcast sent successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send broadcast'
      });
    }
  });
  // Endpoint para enviar mensaje a usuario específico
  app.post('/api/websocket/send-to-user', (req, res) => {
    try {
      const { userId, event, data } = req.body;
      if (!userId || !event) {
        return res.status(400).json({
          success: false,
          error: 'userId and event are required'
        });
      }
      wsServer.sendToUser(userId, event, data);
      res.json({
        success: true,
        message: 'Message sent to user successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to send message to user'
      });
    }
  });
  // Endpoint de salud del WebSocket
  app.get('/api/websocket/health', (req, res) => {
    try {
      const isHealthy = wsServer.isInitialized();
      const stats = wsServer.getStats();
      res.json({
        success: true,
        data: {
          healthy: isHealthy,
          uptime: stats.uptime,
          totalConnections: stats.totalConnections,
          namespaces: stats.namespaces
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'WebSocket server is not healthy'
      });
    }
  });
}
/**
 * Configura el cierre graceful del servidor
 */
function setupGracefulShutdown(wsServer: IWebSocketServer): void {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down WebSocket server...`);
    try {
      await wsServer.shutdown();
      logger.info('WebSocket server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during WebSocket shutdown:', error);
      process.exit(1);
    }
  };
  // Manejar señales de terminación
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
/**
 * Ejemplo de uso en server.ts
 */
export async function exampleServerSetup() {
  /*
  // En tu archivo server.ts principal:
  import express from 'express';
  import { createServer } from 'http';
  import { container } from '@/container/container';
  import { setupWebSocketServer } from '@/modules/websocket/examples/server-integration';
  const app = express();
  const httpServer = createServer(app);
  // ... configurar Express middleware y rutas ...
  // Inicializar WebSocket Server
  const wsServer = await setupWebSocketServer(app, httpServer, container);
  // Iniciar servidor HTTP
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`WebSocket server available at ws://localhost:${PORT}/socket.io`);
  });
  */
}
