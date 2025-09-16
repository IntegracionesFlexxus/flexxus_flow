/**
 * Role Validators
 * Sprint 3 - Backend Team
 * Esquemas de validación para operaciones de roles
 */
import Joi from 'joi';
/**
 * Esquema para crear un rol
 */
export const createRoleSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .regex(/^[a-zA-Z0-9\s\-_]+$/)
    .messages({
      'string.pattern.base': 'Role name can only contain letters, numbers, spaces, hyphens, and underscores'
    }),
  description: Joi.string()
    .max(255)
    .optional()
    .allow(''),
  companyId: Joi.string()
    .uuid()
    .optional(),
  permissions: Joi.array()
    .items(Joi.string().uuid())
    .optional()
});
/**
 * Esquema para actualizar un rol
 */
export const updateRoleSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .regex(/^[a-zA-Z0-9\s\-_]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Role name can only contain letters, numbers, spaces, hyphens, and underscores'
    }),
  description: Joi.string()
    .max(255)
    .optional()
    .allow(''),
  permissions: Joi.array()
    .items(Joi.string().uuid())
    .optional()
}).min(1);
/**
 * Esquema para asignar permisos a un rol
 */
export const assignPermissionsSchema = Joi.object({
  roleId: Joi.string()
    .uuid()
    .required(),
  permissionIds: Joi.array()
    .items(Joi.string().uuid())
    .min(0)
    .required(),
  mode: Joi.string()
    .valid('replace', 'add', 'remove')
    .default('replace')
});
/**
 * Esquema para filtros de roles
 */
export const roleFiltersSchema = Joi.object({
  companyId: Joi.string()
    .uuid()
    .optional(),
  isSystemRole: Joi.boolean()
    .optional(),
  status: Joi.string()
    .valid('active', 'inactive')
    .optional(),
  search: Joi.string()
    .max(100)
    .optional(),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
});
/**
 * Esquema para asignar rol a usuario
 */
export const assignRoleToUserSchema = Joi.object({
  userId: Joi.string()
    .uuid()
    .required(),
  roleId: Joi.string()
    .uuid()
    .required(),
  companyId: Joi.string()
    .uuid()
    .optional()
});
/**
 * Esquema para remover rol de usuario
 */
export const removeRoleFromUserSchema = Joi.object({
  userId: Joi.string()
    .uuid()
    .required(),
  roleId: Joi.string()
    .uuid()
    .required(),
  companyId: Joi.string()
    .uuid()
    .optional()
});
/**
 * Esquema para validar nombre de rol
 */
export const validateRoleNameSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required(),
  companyId: Joi.string()
    .uuid()
    .optional(),
  excludeId: Joi.string()
    .uuid()
    .optional()
});
/**
 * Esquema para clonar rol
 */
export const cloneRoleSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required()
    .regex(/^[a-zA-Z0-9\s\-_]+$/),
  companyId: Joi.string()
    .uuid()
    .optional()
});
/**
 * Esquema para importar roles desde template
 */
export const importRolesSchema = Joi.object({
  templateName: Joi.string()
    .valid('basic', 'enterprise')
    .required(),
  companyId: Joi.string()
    .uuid()
    .optional()
});
/**
 * Esquema para exportar roles
 */
export const exportRolesSchema = Joi.object({
  companyId: Joi.string()
    .uuid()
    .optional(),
  format: Joi.string()
    .valid('json', 'csv')
    .default('json')
});
