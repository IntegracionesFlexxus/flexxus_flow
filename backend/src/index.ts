import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import { container, initializeContainer, shutdownContainer, TYPES } from '@container/container';
import { IConfig } from '@interfaces/IConfig';
import { ILoggerService } from '@interfaces/IServices';
import { IErrorHandlerService } from '@interfaces/IServices';

class Application {
  private app: express.Application;
  private config: IConfig;
  private logger: ILoggerService;
  private server: any;

  constructor() {
    this.app = express();
  }

  async initialize(): Promise<void> {
    try {
      // Initialize DI container
      await initializeContainer();

      // Get services from container
      this.config = container.get<IConfig>(TYPES.Config);
      this.logger = container.get<ILoggerService>(TYPES.LoggerService);
      const errorHandler = container.get<IErrorHandlerService>(TYPES.ErrorHandlerService);

      // Setup middleware
      this.setupMiddleware();

      // Setup routes
      this.setupRoutes();

      // Error handling middleware (must be last)
      this.app.use(errorHandler.createErrorMiddleware());

      // Start server
      await this.startServer();
    } catch (error) {
      console.error('Failed to initialize application:', error);
      process.exit(1);
    }
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(cors({
      origin: this.config.server.corsOrigins,
      credentials: true
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging
    this.app.use((req, res, next) => {
      this.logger.http(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      next();
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: this.config.server.apiVersion,
        environment: this.config.server.env
      });
    });
  }

  private setupRoutes(): void {
    // API version prefix
    const apiPrefix = `/api/${this.config.server.apiVersion}`;

    // Welcome route
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Flexxus Flow Backend - Level 2',
        version: this.config.server.apiVersion,
        endpoints: {
          health: '/health',
          api: apiPrefix
        }
      });
    });

    // API routes will be added here
    this.app.get(`${apiPrefix}/status`, (req, res) => {
      res.json({
        status: 'operational',
        services: {
          logger: 'active',
          cache: 'active',
          eventBus: 'active',
          validator: 'active'
        }
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found'
        }
      });
    });
  }

  private async startServer(): Promise<void> {
    const { port, host } = this.config.server;
    
    this.server = this.app.listen(port, host, () => {
      this.logger.info(`Server started`, {
        port,
        host,
        environment: this.config.server.env,
        apiVersion: this.config.server.apiVersion
      });
      
      console.log(`
╔══════════════════════════════════════════╗
║     Flexxus Flow Backend - Level 2      ║
╠══════════════════════════════════════════╣
║  Status: ✅ Running                      ║
║  Environment: ${this.config.server.env.padEnd(26)}║
║  URL: http://${host}:${port}            ║
║  API: /api/${this.config.server.apiVersion}                         ║
╚══════════════════════════════════════════╝
      `);
    });
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down application...');
    
    // Close server
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }

    // Shutdown DI container
    await shutdownContainer();
    
    this.logger.info('Application shut down successfully');
  }
}

// Main execution
async function main() {
  const app = new Application();
  
  // Handle shutdown signals
  const shutdownHandler = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    await app.shutdown();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));

  // Handle uncaught errors
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  // Start application
  await app.initialize();
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { Application };