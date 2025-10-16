// Server Entry Point - Sprint 1 con estructura Nivel 2
// Punto de entrada principal con manejo robusto
import 'reflect-metadata';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import App from '@/app';
import { environment } from '@/config/environment';
import { container, verifyDatabaseConnections, closeDatabaseConnections } from '@/container/container';
import { TYPES } from '@/container/types';
import winston from 'winston';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { initializeCRMModule, shutdownCRMModule } from '@/modules/crm';
import { registerWebSocketModule } from '@/modules/websocket';
import { OmniWebSocketHandler } from '@/modules/omni/websocket/OmniWebSocketHandler';
import { socketRateLimiter } from '@/shared/middleware/socketRateLimiter';

// Logger instance
const logger = LoggerFactory.create({ file: __filename });

/**
 * Server Class
 * Patrón: Application Server
 * SOLID: Single Responsibility - Solo maneja el servidor HTTP y WebSocket
 */
class Server {
  private app: App;
  private logger: winston.Logger;
  private server: any;
  private io: SocketIOServer | null = null;
  private wsEnabled: boolean;

  constructor() {
    this.app = new App();
    this.logger = container.get<winston.Logger>(TYPES.Logger);
    this.wsEnabled = process.env.WEBSOCKET_ENABLED === 'true';
  }
  /**
   * Iniciar servidor
   * Clean Code: Proceso de inicio claro y secuencial
   */
  async start(): Promise<void> {
    try {
      // Verificar conexiones de base de datos
      this.logger.info('Verifying database connections...');
      const dbHealthy = await verifyDatabaseConnections();
      if (!dbHealthy) {
        throw new Error('Database connections are not healthy');
      }
      this.logger.info('✅ All database connections are healthy');

      // Initialize CRM module (Sprint 15)
      this.logger.info('Initializing CRM module...');
      await initializeCRMModule(container);
      this.logger.info('✅ CRM module initialized successfully');

      // Iniciar servidor HTTP
      const PORT = environment.port;
      const httpServer = createServer(this.app.app);

      this.server = httpServer.listen(PORT, () => {
        this.logger.info(`
          ================================================
          🚀 Server is running!
          ================================================
          - Environment: ${environment.nodeEnv}
          - Port: ${PORT}
          - API URL: http://localhost:${PORT}/api
          - Health Check: http://localhost:${PORT}/health
          - Auth API: http://localhost:${PORT}/api/v1/auth
          ================================================
        `);
      });

      // Initialize WebSocket if enabled
      if (this.wsEnabled) {
        await this.initializeWebSocket(httpServer);
      } else {
        this.logger.info('WebSocket is disabled (WEBSOCKET_ENABLED=false)');
      }

      // Configurar manejo de señales para graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Inicializar WebSocket Server
   */
  private async initializeWebSocket(httpServer: any): Promise<void> {
    try {
      this.logger.info('Initializing WebSocket server...');

      // Register WebSocket module in container
      registerWebSocketModule(container);

      // Create Socket.io server
      this.io = new SocketIOServer(httpServer, {
        cors: {
          origin: process.env.CORS_ORIGIN || '*',
          credentials: true,
          methods: ['GET', 'POST']
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        maxHttpBufferSize: 1e6, // 1MB
        transports: ['polling', 'websocket'],
        path: '/socket.io'
      });

      // Bind Socket.io instance to container for Omni module
      container.bind<SocketIOServer>(TYPES.WebSocketServer).toConstantValue(this.io);

      // Get Omni WebSocket handler
      const omniWsHandler = container.get<OmniWebSocketHandler>(TYPES.OmniWebSocketHandler);

      // Initialize Omni WebSocket handler with rate limiting
      omniWsHandler.initialize(this.io);

      this.logger.info('✅ WebSocket server initialized successfully');
      this.logger.info(`   - WebSocket URL: ws://localhost:${environment.port}/socket.io`);
      this.logger.info(`   - Omni namespace: /omni`);

    } catch (error: any) {
      this.logger.error('Failed to initialize WebSocket:', error);
      // Don't throw - allow server to continue without WebSocket
      this.logger.warn('⚠️  Server will continue without WebSocket support');
      this.io = null;
    }
  }

  /**
   * Configurar graceful shutdown
   * Clean Code: Manejo limpio de cierre de aplicación
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // Close WebSocket server first
        if (this.io) {
          this.logger.info('Closing WebSocket connections...');
          this.io.close();
          this.logger.info('WebSocket server closed');
        }

        // Detener servidor HTTP
        if (this.server) {
          await new Promise<void>((resolve) => {
            this.server.close(() => {
              this.logger.info('HTTP server closed');
              resolve();
            });
          });
        }

        // Shutdown CRM module
        await shutdownCRMModule(container);
        this.logger.info('CRM module shutdown completed');

        // Shutdown Omni module (if needed)
        const { shutdownOmniModule } = await import('@/modules/omni/config/omni.container');
        await shutdownOmniModule(container);
        this.logger.info('Omni module shutdown completed');

        // Cerrar conexiones de base de datos
        await closeDatabaseConnections();
        this.logger.info('Database connections closed');

        // Salir limpiamente
        this.logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }

      // Forzar cierre después de 30 segundos
      setTimeout(() => {
        this.logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };
    // Escuchar señales de terminación
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}
/**
 * Función principal
 * Punto de entrada de la aplicación
 */
async function main() {
  try {
    console.log(`
      ========================================
      Starting Flexxus Flow Backend
      Node.js ${process.version}
      ========================================
    `);
    const server = new Server();
    await server.start();
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}
// Ejecutar si es el módulo principal
if (require.main === module) {
  main();
}
export default Server;
