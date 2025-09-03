const Joi = require('joi');
const { ValidationError } = require('../errors/BaseError');

// Validador base usando Joi
class JoiValidator {
  constructor(schema) {
    this.schema = schema;
  }

  // Validar datos contra el esquema
  validate(data, options = {}) {
    const defaultOptions = {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
      ...options
    };

    const { error, value } = this.schema.validate(data, defaultOptions);

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      throw new ValidationError('Validation failed', errors);
    }

    return value;
  }

  // Validar async
  async validateAsync(data, options = {}) {
    try {
      const value = await this.schema.validateAsync(data, {
        abortEarly: false,
        ...options
      });
      return value;
    } catch (error) {
      if (error.isJoi) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type
        }));
        throw new ValidationError('Validation failed', errors);
      }
      throw error;
    }
  }
}

// Esquemas comunes reutilizables
const commonSchemas = {
  // ID genérico
  id: Joi.alternatives().try(
    Joi.number().integer().positive(),
    Joi.string().uuid(),
    Joi.string().pattern(/^[0-9a-fA-F]{24}$/) // MongoDB ObjectId
  ),

  // Email
  email: Joi.string().email().lowercase().trim(),

  // Password
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/) // Al menos una mayúscula, minúscula y número
    .message('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  // Phone
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .message('Invalid phone number format'),

  // URL
  url: Joi.string().uri(),

  // Date
  date: Joi.date().iso(),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string(),
    order: Joi.string().valid('asc', 'desc').default('asc')
  }),

  // Coordenadas
  coordinates: Joi.object({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required()
  }),

  // Rango de fechas
  dateRange: Joi.object({
    start: Joi.date().iso().required(),
    end: Joi.date().iso().greater(Joi.ref('start')).required()
  })
};

// Esquemas de validación predefinidos
const schemas = {
  // Usuario
  user: {
    create: Joi.object({
      email: commonSchemas.email.required(),
      password: commonSchemas.password.required(),
      firstName: Joi.string().min(2).max(50).required(),
      lastName: Joi.string().min(2).max(50).required(),
      phone: commonSchemas.phone,
      role: Joi.string().valid('admin', 'user', 'guest').default('user')
    }),

    update: Joi.object({
      email: commonSchemas.email,
      firstName: Joi.string().min(2).max(50),
      lastName: Joi.string().min(2).max(50),
      phone: commonSchemas.phone,
      role: Joi.string().valid('admin', 'user', 'guest')
    }).min(1),

    login: Joi.object({
      email: commonSchemas.email.required(),
      password: Joi.string().required()
    }),

    changePassword: Joi.object({
      currentPassword: Joi.string().required(),
      newPassword: commonSchemas.password.required(),
      confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
    })
  },

  // Empresa
  company: {
    create: Joi.object({
      name: Joi.string().min(2).max(100).required(),
      code: Joi.string().alphanum().min(3).max(20).required(),
      email: commonSchemas.email.required(),
      phone: commonSchemas.phone,
      address: Joi.string().max(200),
      website: commonSchemas.url,
      maxUsers: Joi.number().integer().min(1).default(10)
    }),

    update: Joi.object({
      name: Joi.string().min(2).max(100),
      email: commonSchemas.email,
      phone: commonSchemas.phone,
      address: Joi.string().max(200),
      website: commonSchemas.url,
      maxUsers: Joi.number().integer().min(1)
    }).min(1)
  },

  // Query params
  query: {
    list: commonSchemas.pagination,
    
    search: Joi.object({
      q: Joi.string().min(1).max(100),
      ...commonSchemas.pagination
    }),

    filter: Joi.object({
      status: Joi.string(),
      startDate: commonSchemas.date,
      endDate: commonSchemas.date,
      ...commonSchemas.pagination
    })
  }
};

// Factory para crear validadores
class ValidatorFactory {
  constructor() {
    this.validators = new Map();
  }

  // Obtener o crear validador
  getValidator(schemaPath) {
    if (!this.validators.has(schemaPath)) {
      const [category, action] = schemaPath.split('.');
      const schema = schemas[category]?.[action];
      
      if (!schema) {
        throw new Error(`Schema not found for: ${schemaPath}`);
      }
      
      this.validators.set(schemaPath, new JoiValidator(schema));
    }
    
    return this.validators.get(schemaPath);
  }

  // Validar directamente
  validate(schemaPath, data, options) {
    const validator = this.getValidator(schemaPath);
    return validator.validate(data, options);
  }

  // Crear validador personalizado
  createValidator(schema) {
    return new JoiValidator(schema);
  }
}

// Middleware de validación para Express
function validationMiddleware(schemaPath, source = 'body') {
  return (req, res, next) => {
    try {
      const factory = new ValidatorFactory();
      const validator = factory.getValidator(schemaPath);
      
      // Obtener datos según la fuente
      const data = source === 'query' ? req.query : 
                   source === 'params' ? req.params :
                   source === 'body' ? req.body :
                   req[source];
      
      // Validar
      const validated = validator.validate(data);
      
      // Reemplazar con datos validados y sanitizados
      if (source === 'query') req.query = validated;
      else if (source === 'params') req.params = validated;
      else if (source === 'body') req.body = validated;
      else req[source] = validated;
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Sanitizadores comunes
const sanitizers = {
  // Limpiar string
  trimString: (value) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  },

  // Normalizar email
  normalizeEmail: (email) => {
    if (typeof email === 'string') {
      return email.toLowerCase().trim();
    }
    return email;
  },

  // Remover HTML tags
  stripHtml: (value) => {
    if (typeof value === 'string') {
      return value.replace(/<[^>]*>/g, '');
    }
    return value;
  },

  // Escapar caracteres especiales
  escapeHtml: (value) => {
    if (typeof value === 'string') {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
      };
      return value.replace(/[&<>"'/]/g, char => map[char]);
    }
    return value;
  },

  // Normalizar espacios en blanco
  normalizeWhitespace: (value) => {
    if (typeof value === 'string') {
      return value.replace(/\s+/g, ' ').trim();
    }
    return value;
  },

  // Sanitizar objeto recursivamente
  sanitizeObject: (obj, sanitizers = []) => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        let sanitizedValue = value;
        for (const sanitizer of sanitizers) {
          sanitizedValue = sanitizer(sanitizedValue);
        }
        sanitized[key] = sanitizedValue;
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizers.sanitizeObject(value, sanitizers);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
};

// Middleware de sanitización
function sanitizationMiddleware(options = {}) {
  const {
    fields = [],
    sanitizers: customSanitizers = [sanitizers.trimString, sanitizers.normalizeWhitespace]
  } = options;

  return (req, res, next) => {
    // Sanitizar body
    if (req.body) {
      req.body = sanitizers.sanitizeObject(req.body, customSanitizers);
    }

    // Sanitizar query
    if (req.query) {
      req.query = sanitizers.sanitizeObject(req.query, customSanitizers);
    }

    // Sanitizar campos específicos
    for (const field of fields) {
      const [source, path] = field.split('.');
      if (req[source] && req[source][path]) {
        req[source][path] = sanitizers.escapeHtml(req[source][path]);
      }
    }

    next();
  };
}

module.exports = {
  JoiValidator,
  ValidatorFactory,
  validationMiddleware,
  sanitizers,
  sanitizationMiddleware,
  commonSchemas,
  schemas
};