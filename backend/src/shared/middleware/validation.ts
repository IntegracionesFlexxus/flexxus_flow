/**
 * @module ValidationMiddleware
 * @category Middleware
 * @description Middleware de validación y sanitización de datos de entrada.
 * Implementa validación con Joi, sanitización con DOMPurify, y prevención de ataques comunes.
 * 
 * Sprint 2 - Nivel 3: Sistema robusto de validación con:
 * - Validación de esquemas con Joi
 * - Sanitización automática de HTML/XSS
 * - Prevención de inyección SQL
 * - Validadores personalizados para casos específicos
 * - Mensajes de error personalizables
 * - Builder pattern para construcción fluida de validadores
 * 
 * @example
 * ```typescript
 * // Usando el builder pattern
 * const validator = createValidator()
 *   .body(Joi.object({
 *     email: CommonSchemas.email.required(),
 *     password: CommonSchemas.password.required()
 *   }))
 *   .build({ sanitize: true });
 * 
 * router.post('/login', validator, loginController);
 * 
 * // Validación directa
 * router.post('/users', validate({
 *   body: Joi.object({
 *     name: Joi.string().custom(CustomValidators.noXss),
 *     email: CommonSchemas.email
 *   })
 * }), createUserController);
 * ```
 * 
 * @see {@link https://joi.dev/}
 * @see {@link https://owasp.org/www-community/attacks/xss/}
 * @since 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import Joi, { Schema, ValidationOptions } from 'joi';
import { Logger } from 'winston';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

/**
 * @interface ValidationSchema
 * @description Define los esquemas de validación para diferentes partes de la solicitud HTTP.
 * @property {Schema} [body] - Esquema para validar el cuerpo de la solicitud
 * @property {Schema} [query] - Esquema para validar parámetros de consulta
 * @property {Schema} [params] - Esquema para validar parámetros de ruta
 * @property {Schema} [headers] - Esquema para validar encabezados HTTP
 * @property {Schema} [files] - Esquema para validar archivos subidos
 */
export interface ValidationSchema {
  body?: Schema;
  query?: Schema;
  params?: Schema;
  headers?: Schema;
  files?: Schema;
}

/**
 * @interface ValidationOptions
 * @description Opciones de configuración para el proceso de validación.
 * @property {boolean} [abortEarly=false] - Si detener en el primer error encontrado
 * @property {boolean} [stripUnknown=true] - Si eliminar campos no definidos en el esquema
 * @property {boolean} [allowUnknown=false] - Si permitir campos no definidos en el esquema
 * @property {'optional' | 'required' | 'forbidden'} [presence='optional'] - Comportamiento por defecto para campos
 * @property {any} [context] - Contexto adicional para la validación
 * @property {boolean} [sanitize=true] - Si sanitizar automáticamente los datos de entrada
 * @property {Record<string, string>} [customErrorMessages] - Mensajes de error personalizados por campo
 */
export interface ValidationOptions {
  abortEarly?: boolean;
  stripUnknown?: boolean;
  allowUnknown?: boolean;
  presence?: 'optional' | 'required' | 'forbidden';
  context?: any;
  sanitize?: boolean;
  customErrorMessages?: Record<string, string>;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  type: string;
  context?: any;
}

/**
 * @function validate
 * @description Factory que crea un middleware de validación basado en esquemas Joi.
 * @param {ValidationSchema} schema - Esquemas de validación para diferentes partes de la solicitud
 * @param {ValidationOptions} [options={}] - Opciones de validación
 * @returns {Function} Middleware de Express para validación
 * 
 * @remarks
 * - Sanitiza automáticamente los datos antes de validar si `sanitize: true`
 * - Valida múltiples partes de la solicitud (body, query, params, headers, files)
 * - Retorna error 400 con detalles si la validación falla
 * - Registra intentos de validación fallidos para auditoría
 * 
 * @example
 * ```typescript
 * // Validar body y query params
 * app.post('/api/users', 
 *   validate({
 *     body: Joi.object({
 *       name: Joi.string().min(2).max(50).required(),
 *       email: Joi.string().email().required(),
 *       age: Joi.number().min(18).max(120)
 *     }),
 *     query: Joi.object({
 *       sendEmail: Joi.boolean().default(false)
 *     })
 *   }),
 *   createUserController
 * );
 * ```
 * 
 * @throws {400} Si la validación falla
 * @throws {500} Si ocurre un error interno durante la validación
 */
export function validate(
  schema: ValidationSchema,
  options: ValidationOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const defaultOptions: ValidationOptions = {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
    sanitize: true,
    ...options,
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const logger = container.get<Logger>(TYPES.Logger);
    const errors: ValidationError[] = [];

    try {
      // Sanitize input if enabled
      if (defaultOptions.sanitize) {
        sanitizeRequest(req);
      }

      // Validate each part of the request
      const validationTargets = [
        { schema: schema.body, data: req.body, field: 'body' },
        { schema: schema.query, data: req.query, field: 'query' },
        { schema: schema.params, data: req.params, field: 'params' },
        { schema: schema.headers, data: req.headers, field: 'headers' },
        { schema: schema.files, data: req.files, field: 'files' },
      ];

      for (const target of validationTargets) {
        if (target.schema) {
          const result = target.schema.validate(target.data, {
            abortEarly: defaultOptions.abortEarly,
            stripUnknown: defaultOptions.stripUnknown,
            allowUnknown: defaultOptions.allowUnknown,
            presence: defaultOptions.presence,
            context: { ...defaultOptions.context, req },
          });

          if (result.error) {
            result.error.details.forEach(detail => {
              errors.push({
                field: `${target.field}.${detail.path.join('.')}`,
                message: getCustomErrorMessage(detail, defaultOptions.customErrorMessages),
                value: detail.context?.value,
                type: detail.type,
                context: detail.context,
              });
            });
          } else {
            // Update request with validated and stripped data
            (req as any)[target.field] = result.value;
          }
        }
      }

      if (errors.length > 0) {
        logger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors: errors,
          ip: req.ip,
        });

        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors,
        });
        return;
      }

      next();
    } catch (error) {
      logger.error('Validation middleware error', {
        error: error.message,
        path: req.path,
        method: req.method,
      });

      res.status(500).json({
        success: false,
        message: 'Internal server error during validation',
      });
    }
  };
}

/**
 * @function sanitizeRequest
 * @private
 * @description Sanitiza todos los datos de entrada de la solicitud HTTP.
 * @param {Request} req - Objeto de solicitud de Express
 * 
 * @remarks
 * Aplica sanitización a body, query y params.
 * La sanitización incluye:
 * - Remoción de tags HTML
 * - Escape de caracteres especiales
 * - Eliminación de null bytes
 * - Trimming de espacios en blanco
 */
function sanitizeRequest(req: Request): void {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }

  // Sanitize params
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
}

/**
 * @function sanitizeObject
 * @private
 * @description Sanitiza recursivamente un objeto y todos sus valores.
 * @param {any} obj - Objeto a sanitizar
 * @returns {any} Objeto sanitizado
 * 
 * @remarks
 * - Procesa recursivamente objetos anidados y arrays
 * - Aplica sanitización a todas las cadenas de texto
 * - Preserva tipos de datos no-string
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const sanitizedKey = sanitizeString(key);
        sanitized[sanitizedKey] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * @function sanitizeString
 * @private
 * @description Sanitiza una cadena de texto eliminando contenido potencialmente peligroso.
 * @param {string} str - Cadena a sanitizar
 * @returns {string} Cadena sanitizada
 * 
 * @remarks
 * Aplica las siguientes transformaciones:
 * 1. Remueve todos los tags HTML usando DOMPurify
 * 2. Escapa caracteres especiales HTML
 * 3. Elimina espacios en blanco al inicio y final
 * 4. Remueve null bytes que pueden causar problemas
 * 
 * @security
 * Esta función es crítica para prevenir XSS y otros ataques de inyección.
 */
function sanitizeString(str: string): string {
  if (typeof str !== 'string') {
    return str;
  }

  // Remove HTML tags and scripts
  let sanitized = DOMPurify.sanitize(str, { ALLOWED_TAGS: [] });

  // Escape special characters
  sanitized = validator.escape(sanitized);

  // Trim whitespace
  sanitized = sanitized.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
}

/**
 * Get custom error message
 */
function getCustomErrorMessage(
  detail: any,
  customMessages?: Record<string, string>
): string {
  if (customMessages) {
    const customKey = `${detail.path.join('.')}.${detail.type}`;
    if (customMessages[customKey]) {
      return customMessages[customKey];
    }
  }

  // Default messages
  const defaultMessages: Record<string, string> = {
    'any.required': `${detail.context.label} is required`,
    'string.empty': `${detail.context.label} cannot be empty`,
    'string.email': `${detail.context.label} must be a valid email`,
    'string.min': `${detail.context.label} must be at least ${detail.context.limit} characters`,
    'string.max': `${detail.context.label} must be at most ${detail.context.limit} characters`,
    'number.base': `${detail.context.label} must be a number`,
    'number.min': `${detail.context.label} must be at least ${detail.context.limit}`,
    'number.max': `${detail.context.label} must be at most ${detail.context.limit}`,
    'date.base': `${detail.context.label} must be a valid date`,
    'array.base': `${detail.context.label} must be an array`,
  };

  return defaultMessages[detail.type] || detail.message;
}

/**
 * @const CommonSchemas
 * @description Esquemas de validación predefinidos para casos de uso comunes.
 * Proporciona validadores reutilizables para tipos de datos frecuentes.
 * 
 * @example
 * ```typescript
 * const schema = Joi.object({
 *   id: CommonSchemas.uuid.required(),
 *   email: CommonSchemas.email.required(),
 *   password: CommonSchemas.password,
 *   phone: CommonSchemas.phone.optional(),
 *   website: CommonSchemas.url
 * });
 * ```
 * 
 * @property {Schema} uuid - Valida UUID v4
 * @property {Schema} email - Valida direcciones de email
 * @property {Schema} password - Valida contraseñas fuertes
 * @property {Schema} phone - Valida números de teléfono internacionales
 * @property {Schema} url - Valida URLs HTTP/HTTPS
 * @property {Schema} date - Valida fechas ISO 8601
 * @property {Schema} pagination - Valida parámetros de paginación
 * @property {Schema} id - Valida IDs (UUID o entero positivo)
 * @property {Schema} boolean - Valida booleanos con soporte para strings
 */
export const CommonSchemas = {
  // UUID validation
  uuid: Joi.string().uuid({ version: 'uuidv4' }),

  // Email validation
  email: Joi.string().email().lowercase().trim(),

  // Password validation (strong)
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),

  // Phone number validation
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),

  // URL validation
  url: Joi.string().uri({
    scheme: ['http', 'https'],
  }),

  // Date validation
  date: Joi.date().iso(),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().optional(),
    order: Joi.string().valid('asc', 'desc').default('asc'),
  }),

  // ID validation
  id: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.number().integer().positive()
  ),

  // Boolean validation
  boolean: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('true', 'false', '1', '0')
  ).custom((value) => {
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return value;
  }),
};

/**
 * @const CustomValidators
 * @description Validadores personalizados para casos de seguridad específicos.
 * Proporciona funciones de validación avanzadas para prevenir ataques comunes.
 * 
 * @example
 * ```typescript
 * const schema = Joi.object({
 *   password: Joi.string().custom(CustomValidators.strongPassword),
 *   comment: Joi.string().custom(CustomValidators.noXss),
 *   query: Joi.string().custom(CustomValidators.noSqlInjection),
 *   avatar: Joi.any().custom(CustomValidators.fileSize(5 * 1024 * 1024))
 * });
 * ```
 */
export const CustomValidators = {
  /**
   * @method strongPassword
   * @description Valida que una contraseña cumpla con requisitos de seguridad estrictos.
   * @param {string} value - Contraseña a validar
   * @param {any} helpers - Helpers de Joi para reportar errores
   * @returns {string} Valor validado o error
   * 
   * @remarks
   * Requisitos de contraseña:
   * - Mínimo 12 caracteres
   * - Al menos una mayúscula
   * - Al menos una minúscula
   * - Al menos un número
   * - Al menos un carácter especial (@$!%*?&)
   * - No debe contener patrones comunes (password, 123456, qwerty)
   * 
   * @security
   * Cumple con las recomendaciones NIST SP 800-63B para contraseñas.
   */
  strongPassword: (value: string, helpers: any) => {
    const requirements = {
      minLength: 12,
      hasUpperCase: /[A-Z]/.test(value),
      hasLowerCase: /[a-z]/.test(value),
      hasNumbers: /\d/.test(value),
      hasSpecialChar: /[@$!%*?&]/.test(value),
      noCommonPatterns: !/^(password|123456|qwerty)/i.test(value),
    };

    const errors = [];
    if (value.length < requirements.minLength) {
      errors.push(`at least ${requirements.minLength} characters`);
    }
    if (!requirements.hasUpperCase) errors.push('an uppercase letter');
    if (!requirements.hasLowerCase) errors.push('a lowercase letter');
    if (!requirements.hasNumbers) errors.push('a number');
    if (!requirements.hasSpecialChar) errors.push('a special character');
    if (!requirements.noCommonPatterns) errors.push('avoid common patterns');

    if (errors.length > 0) {
      return helpers.error('any.invalid', {
        message: `Password must contain ${errors.join(', ')}`,
      });
    }

    return value;
  },

  /**
   * @method noSqlInjection
   * @description Detecta y previene patrones de inyección SQL en strings.
   * @param {string} value - Valor a validar
   * @param {any} helpers - Helpers de Joi
   * @returns {string} Valor validado o error
   * 
   * @remarks
   * Detecta patrones comunes de SQL injection incluyendo:
   * - Palabras clave SQL (SELECT, INSERT, UPDATE, DELETE, etc.)
   * - Comentarios SQL (doble guión, slash-asterisco)
   * - Operadores lógicos con condiciones siempre verdaderas
   * - Comandos de stored procedures
   * 
   * @security
   * Esta validación es una capa adicional de seguridad.
   * Siempre use consultas parametrizadas además de esta validación.
   */
  noSqlInjection: (value: string, helpers: any) => {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi,
      /(--|\/\*|\*\/|xp_|sp_|0x)/gi,
      /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
      /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(value)) {
        return helpers.error('any.invalid', {
          message: 'Input contains potentially malicious SQL patterns',
        });
      }
    }

    return value;
  },

  /**
   * @method noXss
   * @description Detecta y previene patrones de cross-site scripting (XSS).
   * @param {string} value - Valor a validar
   * @param {any} helpers - Helpers de Joi
   * @returns {string} Valor validado o error
   * 
   * @remarks
   * Detecta patrones XSS comunes:
   * - Tags <script>
   * - Protocolo javascript:
   * - Event handlers (onclick, onload, etc.)
   * - Tags peligrosos (<iframe>, <object>, <embed>)
   * 
   * @security
   * Complementa la sanitización de DOMPurify para máxima protección.
   */
  noXss: (value: string, helpers: any) => {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe/gi,
      /<object/gi,
      /<embed/gi,
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(value)) {
        return helpers.error('any.invalid', {
          message: 'Input contains potentially malicious content',
        });
      }
    }

    return value;
  },

  // File extension validator
  fileExtension: (extensions: string[]) => {
    return (value: any, helpers: any) => {
      if (!value || !value.originalname) {
        return helpers.error('any.invalid', {
          message: 'Invalid file',
        });
      }

      const ext = value.originalname.split('.').pop()?.toLowerCase();
      if (!ext || !extensions.includes(ext)) {
        return helpers.error('any.invalid', {
          message: `File must be one of: ${extensions.join(', ')}`,
        });
      }

      return value;
    };
  },

  // File size validator
  fileSize: (maxSize: number) => {
    return (value: any, helpers: any) => {
      if (!value || !value.size) {
        return helpers.error('any.invalid', {
          message: 'Invalid file',
        });
      }

      if (value.size > maxSize) {
        const sizeMB = (maxSize / 1024 / 1024).toFixed(2);
        return helpers.error('any.invalid', {
          message: `File size must not exceed ${sizeMB}MB`,
        });
      }

      return value;
    };
  },
};

/**
 * @class ValidationBuilder
 * @description Builder pattern para construir validadores de forma fluida.
 * Permite construir validadores complejos de manera legible y mantenible.
 * 
 * @example
 * ```typescript
 * const validator = new ValidationBuilder()
 *   .body(Joi.object({
 *     name: Joi.string().required(),
 *     age: Joi.number().min(18)
 *   }))
 *   .query(Joi.object({
 *     page: Joi.number().default(1),
 *     limit: Joi.number().default(10)
 *   }))
 *   .params(Joi.object({
 *     id: CommonSchemas.uuid.required()
 *   }))
 *   .build({ sanitize: true, stripUnknown: true });
 * 
 * router.get('/users/:id', validator, getUserController);
 * ```
 */
export class ValidationBuilder {
  private schema: ValidationSchema = {};

  body(schema: Schema): this {
    this.schema.body = schema;
    return this;
  }

  query(schema: Schema): this {
    this.schema.query = schema;
    return this;
  }

  params(schema: Schema): this {
    this.schema.params = schema;
    return this;
  }

  headers(schema: Schema): this {
    this.schema.headers = schema;
    return this;
  }

  files(schema: Schema): this {
    this.schema.files = schema;
    return this;
  }

  build(options?: ValidationOptions) {
    return validate(this.schema, options);
  }
}

/**
 * @function createValidator
 * @description Factory function para crear una nueva instancia de ValidationBuilder.
 * @returns {ValidationBuilder} Nueva instancia del builder
 * 
 * @example
 * ```typescript
 * const validator = createValidator()
 *   .body(userSchema)
 *   .query(paginationSchema)
 *   .build();
 * ```
 */
export function createValidator(): ValidationBuilder {
  return new ValidationBuilder();
}
