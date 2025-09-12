// Main Entry Point - Sprint 2
// Punto de entrada principal de la aplicación
// Registrar module-alias para resolver paths en producción
if (process.env.NODE_ENV === 'production') {
  require('module-alias/register');
}
import 'reflect-metadata';
import App from '@/app';
import { environment } from '@/config/environment';
import { LoggerFactory } from '@/shared/services/logger/LoggerService';

// Logger instance
const logger = LoggerFactory.create({ file: __filename });

// Crear instancia de la aplicación
const application = new App();
const app = application.app;
// Iniciar servidor
const PORT = environment.app.port || 3001;
const HOST = environment.app.host || 'localhost';
app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
  logger.info(`📝 Health check: http://${HOST}:${PORT}/health`);
  logger.info(`🔧 Environment: ${environment.nodeEnv}`);
  logger.info(`✅ API Documentation: http://${HOST}:${PORT}/api`);
});
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
