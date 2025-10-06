// Server Entry Point - Sprint 1 con estructura Nivel 2
// Punto de entrada principal con manejo robusto
import 'reflect-metadata';
import App from '@/app';
import { environment } from '@/config/environment';
import { container, verifyDatabaseConnections, closeDatabaseConnections } from '@/container/container';
import { TYPES } from '@/container/types';
import winston from 'winston';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { initializeCRMModule, shutdownCRMModule } from '@/modules/crm';

// Logger instance
const logger = LoggerFactory.create({ file: __filename });

/**
 * Server Class
 * Patrón: Application Server
 * SOLID: Single Responsibility - Solo maneja el servidor HTTP
 */
class Server {
  private app: App;
  private logger: winston.Logger;
  private server: any;
  constructor() {
    this.app = new App();
    this.logger = container.get<winston.Logger>(TYPES.Logger);
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
      this.server = this.app.app.listen(PORT, () => {
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
      // Configurar manejo de señales para graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      this.logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
  /**
   * Configurar graceful shutdown
   * Clean Code: Manejo limpio de cierre de aplicación
   */
  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      this.logger.info(`Received ${signal}, starting graceful shutdown...`);
      // Detener servidor HTTP
      if (this.server) {
        this.server.close(async () => {
          this.logger.info('HTTP server closed');
          try {
            // Shutdown CRM module
            await shutdownCRMModule(container);
            this.logger.info('CRM module shutdown completed');

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
        });
        // Forzar cierre después de 30 segundos
        setTimeout(() => {
          this.logger.error('Forced shutdown after timeout');
          process.exit(1);
        }, 30000);
      }
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
