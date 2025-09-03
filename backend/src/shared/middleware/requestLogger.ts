// Request Logger Middleware - Sprint 1
// Middleware para logging de requests HTTP

import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { container } from '../../container/container';
import { TYPES } from '../../container/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request Logger Middleware
 * Clean Code: Logging estructurado para análisis
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const logger = container.get<winston.Logger>(TYPES.Logger);
  
  // Generar request ID único
  const requestId = uuidv4();
  (req as any).id = requestId;

  // Capturar tiempo de inicio
  const startTime = Date.now();

  // Log request
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Interceptar response para log
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    
    // Log response
    logger.info('Outgoing response', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: (req as any).userId,
      companyId: (req as any).companyId
    });

    // Llamar al método original
    return originalSend.call(this, data);
  };

  next();
};