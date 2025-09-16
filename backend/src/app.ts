// Express Application - Sprint 1 con estructura Nivel 2
// Aplicación principal con todos los middleware y rutas
import 'reflect-metadata';
import express, { Application, Request, Response, NextFunction } from 'express';
// cors import removed - using setupCors from security middleware
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import winston from 'winston';
import { environment } from '@/config/environment';
// Route imports
import authRoutes from '@/modules/auth/routes';
import featureFlagRoutes from '@/modules/feature-flags';
import userRoutes from '@/modules/users';
import roleRoutes from '@/modules/roles';
import companyRoutes from '@/modules/companies';
// TODO: Importar rutas de otros módulos cuando estén implementadas
// import omniRoutes from '@/modules/omni/routes';
// import crmRoutes from '@/modules/crm/routes';
// import workflowRoutes from '@/modules/workflow/routes';
// import analyticsRoutes from '@/modules/analytics/routes';
// Middleware imports
import { errorHandler } from '@/shared/middleware/errorHandler';
import { requestLogger } from '@/shared/middleware/requestLogger';
import { generalLimiter } from '@/shared/middleware/rateLimiter';
import { setupCors } from '@/shared/middleware/security';
/**
 * Express Application Class
 * Patrón: Application Controller
 * SOLID: Single Responsibility - Configuración de la aplicación
 */
class App {
  public app: Application;
  private logger: winston.Logger;
  constructor() {
    this.app = express();
    this.logger = container.get<winston.Logger>(TYPES.Logger);
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }
  /**
   * Configurar middleware de la aplicación
   * Clean Code: Agrupación lógica de middleware
   */
  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }));
    // CORS configuration - using centralized security middleware
    this.app.use(setupCors());
    // Compression
    this.app.use(compression());
    // Body parsing
    this.app.use(express.json({ 
      limit: '10mb',
      strict: true,
      type: 'application/json'
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: '10mb' 
    }));
    // Cookie parsing
    this.app.use(cookieParser());
    // Request logging
    this.app.use(requestLogger);
    // Rate limiting - ENABLED IN PRODUCTION
    if (environment.nodeEnv === 'production' || environment.nodeEnv === 'staging') {
      this.app.use('/api/', generalLimiter);
      this.logger.info('Rate limiting enabled for production/staging');
    } else {
      this.logger.warn('Rate limiting disabled in development mode');
    }
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);
  }
  /**
   * Configurar rutas de la aplicación
   * Clean Code: Rutas organizadas por versión y módulo
   */
  private initializeRoutes(): void {
    // Health check endpoints (sin versión para simplicidad)
    this.app.get('/health', this.healthCheck.bind(this));
    this.app.get('/api/health', this.healthCheck.bind(this)); // También en /api/health para compatibilidad
    this.app.get('/ready', this.readinessCheck.bind(this));
    this.app.get('/live', this.livenessCheck.bind(this));
    // API v1 routes
    const apiV1Router = express.Router();
    // Auth module routes
    apiV1Router.use('/auth', authRoutes);
    // Feature Flags module routes (Sprint 2)
    apiV1Router.use('/feature-flags', featureFlagRoutes);
    // Users module routes (Sprint 3)
    apiV1Router.use('/users', userRoutes);
    // Roles module routes (Sprint 3)
    apiV1Router.use('/roles', roleRoutes);
    // Companies module routes (Sprint 3)
    apiV1Router.use('/companies', companyRoutes);
    // Placeholder routes for other modules
    // TODO: Reemplazar con implementaciones reales en Sprint 2
    apiV1Router.get('/omni/health', (req, res) => {
      res.json({ module: 'omni', status: 'not_implemented' });
    });
    apiV1Router.get('/crm/health', (req, res) => {
      res.json({ module: 'crm', status: 'not_implemented' });
    });
    apiV1Router.get('/workflow/health', (req, res) => {
      res.json({ module: 'workflow', status: 'not_implemented' });
    });
    apiV1Router.get('/analytics/health', (req, res) => {
      res.json({ module: 'analytics', status: 'not_implemented' });
    });
    // Mount API v1 routes
    this.app.use('/api/v1', apiV1Router);
    // API documentation endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Flexxus Flow API',
        version: '1.0.0',
        endpoints: {
          health: '/health',
          ready: '/ready',
          live: '/live',
          api_v1: {
            auth: '/api/v1/auth',
            omni: '/api/v1/omni',
            crm: '/api/v1/crm',
            workflow: '/api/v1/workflow',
            analytics: '/api/v1/analytics'
          }
        }
      });
    });
    // 404 handler for undefined routes
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          message: 'Route not found',
          path: req.originalUrl,
          method: req.method,
          statusCode: 404
        }
      });
    });
  }
  /**
   * Configurar manejo de errores
   * Clean Code: Manejo centralizado de errores
   */
  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      this.logger.error('Unhandled Promise Rejection:', reason);
      // En producción, cerrar el proceso gracefully
      if (environment.nodeEnv === 'production') {
        process.exit(1);
      }
    });
    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      this.logger.error('Uncaught Exception:', error);
      // En producción, cerrar el proceso gracefully
      if (environment.nodeEnv === 'production') {
        process.exit(1);
      }
    });
  }
  /**
   * Health check endpoint
   * Simple check de que el servidor está respondiendo
   */
  private healthCheck(req: Request, res: Response): void {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: environment.nodeEnv,
      version: process.env.npm_package_version || '1.0.0'
    });
  }
  /**
   * Readiness check endpoint
   * Verifica que la aplicación está lista para recibir tráfico
   */
  private async readinessCheck(req: Request, res: Response): Promise<void> {
    try {
      // Verificar conexiones de base de datos
      const { verifyDatabaseConnections } = await import('./container/container');
      const dbHealthy = await verifyDatabaseConnections();
      if (!dbHealthy) {
        res.status(503).json({
          status: 'not_ready',
          message: 'Database connections are not healthy',
          timestamp: new Date().toISOString()
        });
        return;
      }
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'healthy',
          auth: 'ready'
        }
      });
    } catch (error) {
      this.logger.error('Readiness check failed:', error);
      res.status(503).json({
        status: 'not_ready',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      });
    }
  }
  /**
   * Liveness check endpoint
   * Simple check para Kubernetes liveness probe
   */
  private livenessCheck(req: Request, res: Response): void {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString()
    });
  }
}
export default App;
