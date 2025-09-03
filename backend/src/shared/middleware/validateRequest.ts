// Request Validation Middleware - Sprint 1
// Middleware para validar requests usando express-validator

import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

/**
 * Middleware para validar resultados de express-validator
 * Clean Code: Manejo consistente de errores de validación
 */
export const validateRequest = (
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = formatValidationErrors(errors.array());
    
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        statusCode: 400,
        details: formattedErrors
      }
    });
    return;
  }
  
  next();
};

/**
 * Formatear errores de validación para respuesta consistente
 * Clean Code: Transformación clara de datos
 */
function formatValidationErrors(errors: any[]): any[] {
  return errors.map(error => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value
  }));
}