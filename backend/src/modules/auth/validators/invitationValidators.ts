/**
 * Invitation Validators - Sprint 3
 * Siguiendo lineamientos nivel 2: Validadores con Joi para invitaciones
 * SOLID: SRP (validación específica), OCP (extensible para nuevas validaciones)
 * Clean Code: esquemas claros y reutilizables
 */
import Joi from 'joi';
/**
 * Esquema para crear una invitación individual
 */
export const createInvitationSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'El email debe ser válido',
      'any.required': 'El email es requerido'
    }),
  roleId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El ID del rol debe ser un UUID válido',
      'any.required': 'El rol es requerido'
    }),
  permissions: Joi.array()
    .items(Joi.string())
    .optional()
    .default([])
    .messages({
      'array.base': 'Los permisos deben ser un array de strings'
    }),
  personalMessage: Joi.string()
    .max(500)
    .optional()
    .trim()
    .messages({
      'string.max': 'El mensaje personal no puede exceder 500 caracteres'
    }),
  expirationDays: Joi.number()
    .integer()
    .min(1)
    .max(30)
    .optional()
    .default(7)
    .messages({
      'number.min': 'La expiración debe ser al menos 1 día',
      'number.max': 'La expiración no puede exceder 30 días'
    })
});
/**
 * Esquema para invitaciones masivas
 */
export const bulkInvitationSchema = Joi.object({
  invitations: Joi.array()
    .items(
      Joi.object({
        email: Joi.string()
          .email()
          .required()
          .lowercase()
          .trim()
          .messages({
            'string.email': 'Cada email debe ser válido',
            'any.required': 'El email es requerido para cada invitación'
          }),
        personalMessage: Joi.string()
          .max(500)
          .optional()
          .trim()
      })
    )
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'Debe incluir al menos una invitación',
      'array.max': 'No se pueden enviar más de 100 invitaciones a la vez',
      'any.required': 'Las invitaciones son requeridas'
    }),
  roleId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El ID del rol debe ser un UUID válido',
      'any.required': 'El rol es requerido'
    }),
  permissions: Joi.array()
    .items(Joi.string())
    .optional()
    .default([]),
  expirationDays: Joi.number()
    .integer()
    .min(1)
    .max(30)
    .optional()
    .default(7)
});
/**
 * Esquema para aceptar una invitación
 */
export const acceptInvitationSchema = Joi.object({
  token: Joi.string()
    .hex()
    .length(64)
    .required()
    .messages({
      'string.hex': 'El token debe ser un string hexadecimal válido',
      'string.length': 'El token debe tener 64 caracteres',
      'any.required': 'El token es requerido'
    }),
  userRegistrationData: Joi.object({
    firstName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .trim()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 50 caracteres',
        'any.required': 'El nombre es requerido'
      }),
    lastName: Joi.string()
      .min(2)
      .max(50)
      .required()
      .trim()
      .messages({
        'string.min': 'El apellido debe tener al menos 2 caracteres',
        'string.max': 'El apellido no puede exceder 50 caracteres',
        'any.required': 'El apellido es requerido'
      }),
    password: Joi.string()
      .min(8)
      .max(100)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'La contraseña debe tener al menos 8 caracteres',
        'string.max': 'La contraseña no puede exceder 100 caracteres',
        'string.pattern.base': 'La contraseña debe contener mayúsculas, minúsculas y números',
        'any.required': 'La contraseña es requerida'
      }),
    passwordConfirmation: Joi.string()
      .valid(Joi.ref('password'))
      .required()
      .messages({
        'any.only': 'Las contraseñas no coinciden',
        'any.required': 'La confirmación de contraseña es requerida'
      }),
    timezone: Joi.string()
      .optional()
      .default('America/Argentina/Buenos_Aires')
      .messages({
        'string.base': 'La zona horaria debe ser válida'
      }),
    language: Joi.string()
      .valid('es', 'en', 'pt')
      .optional()
      .default('es')
      .messages({
        'any.only': 'El idioma debe ser es, en o pt'
      }),
    phoneNumber: Joi.string()
      .pattern(/^\+?[1-9]\d{7,14}$/)
      .optional()
      .messages({
        'string.pattern.base': 'El número de teléfono debe ser válido'
      })
  }).optional()
});
/**
 * Esquema para reenviar invitación
 */
export const resendInvitationSchema = Joi.object({
  invitationId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El ID de la invitación debe ser un UUID válido',
      'any.required': 'El ID de la invitación es requerido'
    })
});
/**
 * Esquema para obtener invitaciones con filtros
 */
export const getInvitationsSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'accepted', 'expired', 'cancelled', 'rejected')
    .optional()
    .messages({
      'any.only': 'El estado debe ser: pending, accepted, expired, cancelled o rejected'
    }),
  roleId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.guid': 'El ID del rol debe ser un UUID válido'
    }),
  email: Joi.string()
    .email()
    .optional()
    .lowercase()
    .messages({
      'string.email': 'El email debe ser válido'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(50)
    .messages({
      'number.min': 'El límite debe ser al menos 1',
      'number.max': 'El límite no puede exceder 100'
    }),
  offset: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0)
    .messages({
      'number.min': 'El offset no puede ser negativo'
    }),
  sortBy: Joi.string()
    .valid('createdAt', 'expiresAt', 'email', 'status')
    .optional()
    .default('createdAt')
    .messages({
      'any.only': 'El ordenamiento debe ser por: createdAt, expiresAt, email o status'
    }),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('desc')
    .messages({
      'any.only': 'El orden debe ser asc o desc'
    }),
  startDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.base': 'La fecha de inicio debe ser válida'
    }),
  endDate: Joi.date()
    .iso()
    .greater(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.base': 'La fecha de fin debe ser válida',
      'date.greater': 'La fecha de fin debe ser posterior a la fecha de inicio'
    })
});
/**
 * Esquema para rechazar invitación
 */
export const rejectInvitationSchema = Joi.object({
  token: Joi.string()
    .hex()
    .length(64)
    .required()
    .messages({
      'string.hex': 'El token debe ser un string hexadecimal válido',
      'string.length': 'El token debe tener 64 caracteres',
      'any.required': 'El token es requerido'
    }),
  reason: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'La razón no puede exceder 500 caracteres'
    })
});
/**
 * Esquema para cancelar invitación
 */
export const cancelInvitationSchema = Joi.object({
  invitationId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El ID de la invitación debe ser un UUID válido',
      'any.required': 'El ID de la invitación es requerido'
    }),
  reason: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'La razón no puede exceder 500 caracteres'
    })
});
/**
 * Esquema para extender invitación
 */
export const extendInvitationSchema = Joi.object({
  invitationId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El ID de la invitación debe ser un UUID válido',
      'any.required': 'El ID de la invitación es requerido'
    }),
  additionalDays: Joi.number()
    .integer()
    .min(1)
    .max(30)
    .required()
    .messages({
      'number.min': 'Los días adicionales deben ser al menos 1',
      'number.max': 'Los días adicionales no pueden exceder 30',
      'any.required': 'Los días adicionales son requeridos'
    })
});
/**
 * Esquema para estadísticas de invitaciones
 */
export const invitationStatsSchema = Joi.object({
  startDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.base': 'La fecha de inicio debe ser válida'
    }),
  endDate: Joi.date()
    .iso()
    .when('startDate', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('startDate')),
      otherwise: Joi.optional()
    })
    .messages({
      'date.base': 'La fecha de fin debe ser válida',
      'date.greater': 'La fecha de fin debe ser posterior a la fecha de inicio'
    }),
  groupBy: Joi.string()
    .valid('day', 'week', 'month')
    .optional()
    .default('day')
    .messages({
      'any.only': 'El agrupamiento debe ser: day, week o month'
    })
});
/**
 * Validador personalizado para emails de dominio específico
 * Útil si se requiere restringir invitaciones a dominios corporativos
 */
export const validateCorporateEmail = (allowedDomains: string[]) => {
  return Joi.string()
    .email()
    .custom((value, helpers) => {
      const domain = value.split('@')[1];
      if (!allowedDomains.includes(domain)) {
        return helpers.error('custom.domain', { domain });
      }
      return value;
    })
    .messages({
      'custom.domain': 'El dominio {{#domain}} no está permitido'
    });
};
/**
 * Validador para importación CSV de invitaciones
 */
export const importInvitationsSchema = Joi.object({
  file: Joi.object({
    mimetype: Joi.string()
      .valid('text/csv', 'application/csv', 'text/plain')
      .required()
      .messages({
        'any.only': 'El archivo debe ser CSV',
        'any.required': 'El archivo es requerido'
      }),
    size: Joi.number()
      .max(5 * 1024 * 1024) // 5MB
      .required()
      .messages({
        'number.max': 'El archivo no puede exceder 5MB'
      })
  }).required(),
  roleId: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'El ID del rol debe ser un UUID válido',
      'any.required': 'El rol es requerido'
    }),
  sendEmails: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'sendEmails debe ser verdadero o falso'
    }),
  expirationDays: Joi.number()
    .integer()
    .min(1)
    .max(30)
    .optional()
    .default(7)
});
/**
 * Helper para validar uniqueness de emails en bulk
 */
export const validateUniqueEmails = (emails: string[]): string[] => {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  emails.forEach(email => {
    const normalized = email.toLowerCase().trim();
    if (seen.has(normalized)) {
      duplicates.push(email);
    } else {
      seen.add(normalized);
    }
  });
  return duplicates;
};
