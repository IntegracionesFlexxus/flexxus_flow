import { injectable, inject } from 'inversify';
import * as winston from 'winston';
import * as path from 'path';
import 'winston-daily-rotate-file';
import { ILoggerService } from '@interfaces/IServices';
import { IConfig } from '@interfaces/IConfig';
import { TYPES } from '@container/types';

@injectable()
export class LoggerService implements ILoggerService {
  private logger: winston.Logger;
  private config: IConfig;

  constructor(@inject(TYPES.Config) config: IConfig) {
    this.config = config;
    this.logger = this.createLogger();
  }

  private createLogger(): winston.Logger {
    const { level, format, dirname, filename, maxSize, maxFiles, handleExceptions, handleRejections } = this.config.logging;

    // Create custom format
    const customFormat = format === 'json' 
      ? winston.format.json()
      : winston.format.simple();

    // Base format with timestamp and errors
    const baseFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      customFormat
    );

    // Create transports
    const transports: winston.transport[] = [];

    // Console transport for development
    if (this.config.isDevelopment()) {
      transports.push(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          })
        )
      }));
    }

    // File transport with rotation
    const logDir = path.resolve(process.cwd(), dirname);
    
    // Application logs
    transports.push(new winston.transports.DailyRotateFile({
      filename: path.join(logDir, filename),
      datePattern: 'YYYY-MM-DD',
      maxSize: maxSize,
      maxFiles: maxFiles,
      format: baseFormat,
      level: level
    }));

    // Error logs
    transports.push(new winston.transports.DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: maxSize,
      maxFiles: maxFiles,
      format: baseFormat,
      level: 'error'
    }));

    // Create logger instance
    return winston.createLogger({
      level: level,
      format: baseFormat,
      transports: transports,
      handleExceptions: handleExceptions,
      handleRejections: handleRejections,
      exitOnError: false
    });
  }

  async initialize(): Promise<void> {
    this.info('Logger Service initialized');
  }

  async shutdown(): Promise<void> {
    this.info('Logger Service shutting down');
    await new Promise((resolve) => {
      this.logger.end(() => resolve(undefined));
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  error(message: string, error?: Error, meta?: any): void {
    const errorMeta = error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      ...meta
    } : meta;
    
    this.logger.error(message, errorMeta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  http(message: string, meta?: any): void {
    this.logger.http(message, meta);
  }

  // Additional utility methods
  logPerformance(operation: string, duration: number, meta?: any): void {
    this.info(`Performance: ${operation}`, {
      duration_ms: duration,
      ...meta
    });
  }

  logSecurity(event: string, details: any): void {
    this.warn(`Security Event: ${event}`, {
      security: true,
      details
    });
  }

  logDatabase(operation: string, details: any): void {
    this.debug(`Database: ${operation}`, {
      database: true,
      ...details
    });
  }

  // Create child logger for specific context
  createChildLogger(context: string): ILoggerService {
    const childLogger = this.logger.child({ context });
    
    return {
      initialize: async () => {},
      shutdown: async () => {},
      info: (message: string, meta?: any) => childLogger.info(message, meta),
      error: (message: string, error?: Error, meta?: any) => {
        const errorMeta = error ? {
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          ...meta
        } : meta;
        childLogger.error(message, errorMeta);
      },
      warn: (message: string, meta?: any) => childLogger.warn(message, meta),
      debug: (message: string, meta?: any) => childLogger.debug(message, meta),
      http: (message: string, meta?: any) => childLogger.http(message, meta)
    };
  }
}