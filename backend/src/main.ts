// Main Entry Point - Sprint 2
// Punto de entrada principal de la aplicación
// Registrar module-alias para resolver paths en producción
if (process.env.NODE_ENV === 'production') {
  require('module-alias/register');
}
import 'reflect-metadata';
import { createServer } from 'http';
import App from '@/app';
import { environment } from '@/config/environment';
import { container } from '@/container/container';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';
import { setupWebSocketServer } from '@/modules/websocket/examples/server-integration';
import { initializeOmniModule } from '@/modules/omni';

// Logger instance
const logger = LoggerFactory.create({ file: __filename });

// Función principal para inicializar el servidor
async function startServer() {
  try {
    // Crear instancia de la aplicación
    const application = new App();
    const app = application.app;

    // Crear servidor HTTP
    const httpServer = createServer(app);

    // Configurar WebSocket Server
    logger.info('Initializing WebSocket server...');
    const wsServer = await setupWebSocketServer(app, httpServer, container);

    // Actualizar la inicialización del módulo Omni con el WebSocket server
    // El módulo Omni ya fue inicializado en App, pero ahora necesitamos agregarlo al Socket.IO
    const io = wsServer.getServer();
    if (io) {
      logger.info('Integrating Omni module with WebSocket...');
      // Re-inicializar el módulo Omni con Socket.IO
      initializeOmniModule(app, container, io);
    }

    // Iniciar servidor
    const PORT = environment.app.port || 3002;
    const HOST = environment.app.host || 'localhost';

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
      logger.info(`📝 Health check: http://${HOST}:${PORT}/health`);
      logger.info(`🔧 Environment: ${environment.nodeEnv}`);
      logger.info(`✅ API Documentation: http://${HOST}:${PORT}/api`);
      logger.info(`🔌 WebSocket server available at ws://${HOST}:${PORT}/socket.io`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Iniciar el servidor
startServer();
// Manejo graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});
process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
export default app;
