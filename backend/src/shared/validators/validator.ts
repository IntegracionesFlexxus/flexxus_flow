/**
 * Validator utility
 * Función de validación usando Joi
 */
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
/**
 * Middleware de validación genérico
 * @param schema - Esquema de Joi para validar
 * @param property - Propiedad del request a validar ('body', 'query', 'params')
 */
export const validate = (schema: Joi.Schema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    next();
  };
};
/**
 * Función de validación directa (sin middleware)
 * @param schema - Esquema de Joi
 * @param data - Datos a validar
 */
export const validateData = <T>(schema: Joi.Schema<T>, data: unknown): T => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false
  });
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    throw new ValidationError('Validation failed', errors);
  }
  return value as T;
};
/**
 * Custom Validation Error class
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
