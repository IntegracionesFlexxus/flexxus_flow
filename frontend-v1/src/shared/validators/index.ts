/**
 * Validadores Centralizados - Sprint 3
 * Siguiendo lineamientos nivel 2: validación unificada
 * Usa yup existente - NO agrega librerías nuevas
 */

import * as Yup from 'yup';

// ========================================
// Validadores Básicos Reutilizables
// ========================================

export const validators = {
  // Campos de texto comunes
  email: Yup.string()
    .email('Email inválido')
    .required('Email es requerido'),
  
  firstName: Yup.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .required('Nombre es requerido'),
  
  lastName: Yup.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .required('Apellido es requerido'),
  
  phone: Yup.string()
    .matches(/^[\d\s\-\+\(\)]+$/, 'Formato de teléfono inválido')
    .min(10, 'Mínimo 10 dígitos')
    .max(20, 'Máximo 20 caracteres'),
  
  // Campos de autenticación
  password: Yup.string()
    .min(8, 'Mínimo 8 caracteres')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Debe contener mayúsculas, minúsculas y números'
    )
    .required('Contraseña es requerida'),
  
  passwordOptional: Yup.string()
    .min(8, 'Mínimo 8 caracteres')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Debe contener mayúsculas, minúsculas y números'
    ),
  
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Las contraseñas no coinciden')
    .required('Confirmar contraseña es requerido'),
  
  // Campos de empresa/organización
  companyName: Yup.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .required('Nombre de empresa es requerido'),
  
  department: Yup.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(50, 'Máximo 50 caracteres'),
  
  position: Yup.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(50, 'Máximo 50 caracteres'),
  
  // IDs y referencias
  roleId: Yup.string()
    .uuid('ID de rol inválido')
    .required('Rol es requerido'),
  
  companyId: Yup.string()
    .uuid('ID de empresa inválido'),
  
  userId: Yup.string()
    .uuid('ID de usuario inválido'),
  
  // Estados y opciones
  status: Yup.string()
    .oneOf(['active', 'inactive', 'suspended', 'pending'], 'Estado inválido')
    .required('Estado es requerido'),
  
  language: Yup.string()
    .oneOf(['es', 'en', 'pt'], 'Idioma no soportado')
    .default('es'),
  
  timezone: Yup.string()
    .default('America/Mexico_City'),
  
  // Números y cantidades
  expiryDays: Yup.number()
    .min(1, 'Mínimo 1 día')
    .max(365, 'Máximo 365 días')
    .default(7),
  
  // Mensajes y textos largos
  welcomeMessage: Yup.string()
    .max(500, 'Máximo 500 caracteres'),
  
  description: Yup.string()
    .max(1000, 'Máximo 1000 caracteres'),
  
  // Booleanos
  rememberMe: Yup.boolean()
    .default(false),
  
  emailVerified: Yup.boolean()
    .default(false),
  
  twoFactorEnabled: Yup.boolean()
    .default(false),
  
  skipEmailNotification: Yup.boolean()
    .default(false),
  
  // Objetos complejos
  notifications: Yup.object({
    email: Yup.boolean().default(true),
    sms: Yup.boolean().default(false),
    push: Yup.boolean().default(true)
  })
};

// ========================================
// Schemas Completos para Formularios
// ========================================

export const schemas = {
  // Login
  login: Yup.object({
    email: validators.email,
    password: validators.password,
    rememberMe: validators.rememberMe,
    companyId: validators.companyId
  }),
  
  // Registro
  register: Yup.object({
    email: validators.email,
    password: validators.password,
    confirmPassword: validators.confirmPassword,
    firstName: validators.firstName,
    lastName: validators.lastName,
    companyName: validators.companyName
  }),
  
  // Edición de usuario
  userEdit: Yup.object({
    firstName: validators.firstName,
    lastName: validators.lastName,
    email: validators.email,
    roleId: validators.roleId,
    status: validators.status,
    department: validators.department,
    position: validators.position,
    phoneNumber: validators.phone
  }),
  
  // Creación de usuario
  userCreate: Yup.object({
    email: validators.email,
    password: validators.password,
    confirmPassword: validators.confirmPassword,
    firstName: validators.firstName,
    lastName: validators.lastName,
    roleId: validators.roleId,
    status: validators.status
  }),
  
  // Invitación de usuario
  userInvite: Yup.object({
    email: validators.email,
    firstName: validators.firstName,
    lastName: validators.lastName,
    roleId: validators.roleId,
    department: validators.department,
    position: validators.position,
    welcomeMessage: validators.welcomeMessage,
    expiryDays: validators.expiryDays
  }),
  
  // Cambio de contraseña
  changePassword: Yup.object({
    currentPassword: validators.password,
    newPassword: validators.password,
    confirmPassword: Yup.string()
      .oneOf([Yup.ref('newPassword')], 'Las contraseñas no coinciden')
      .required('Confirmar contraseña es requerido')
  }),
  
  // Reset de contraseña
  resetPassword: Yup.object({
    email: validators.email
  }),
  
  // Perfil de usuario
  userProfile: Yup.object({
    firstName: validators.firstName,
    lastName: validators.lastName,
    phone: validators.phone,
    language: validators.language,
    timezone: validators.timezone,
    notifications: validators.notifications
  }),
  
  // Configuración de empresa
  companySettings: Yup.object({
    companyName: validators.companyName,
    description: validators.description,
    status: validators.status
  })
};

// ========================================
// Funciones Helper
// ========================================

/**
 * Obtiene un schema con campos opcionales
 * @param schema Schema base
 * @param optionalFields Array de campos que serán opcionales
 */
export function makeFieldsOptional(
  schema: Yup.ObjectSchema<any>,
  optionalFields: string[]
): Yup.ObjectSchema<any> {
  let modifiedSchema = schema;
  
  optionalFields.forEach(field => {
    modifiedSchema = modifiedSchema.shape({
      [field]: modifiedSchema.fields[field].optional().nullable()
    });
  });
  
  return modifiedSchema;
}

/**
 * Combina múltiples schemas
 * @param schemas Array de schemas para combinar
 */
export function combineSchemas(...schemas: Yup.ObjectSchema<any>[]): Yup.ObjectSchema<any> {
  const combined = {};
  
  schemas.forEach(schema => {
    Object.assign(combined, schema.fields);
  });
  
  return Yup.object(combined);
}

/**
 * Crea un schema condicional basado en un campo
 * @param baseSchema Schema base
 * @param conditionField Campo condicional
 * @param conditions Objeto con condiciones y schemas
 */
export function conditionalSchema(
  baseSchema: Yup.ObjectSchema<any>,
  conditionField: string,
  conditions: { [key: string]: Yup.ObjectSchema<any> }
): Yup.ObjectSchema<any> {
  return baseSchema.when(conditionField, {
    is: (value: any) => conditions[value] !== undefined,
    then: (schema) => conditions[schema.fields[conditionField]]
  });
}

// ========================================
// Mensajes de Error Personalizados
// ========================================

export const errorMessages = {
  required: (field: string) => `${field} es requerido`,
  minLength: (field: string, min: number) => `${field} debe tener al menos ${min} caracteres`,
  maxLength: (field: string, max: number) => `${field} no puede exceder ${max} caracteres`,
  email: 'Formato de email inválido',
  passwordMismatch: 'Las contraseñas no coinciden',
  invalidFormat: (field: string) => `Formato de ${field} inválido`,
  invalidOption: 'Opción no válida',
  minValue: (field: string, min: number) => `${field} debe ser mayor a ${min}`,
  maxValue: (field: string, max: number) => `${field} debe ser menor a ${max}`
};

// ========================================
// Validación Síncrona para Campos Individuales
// ========================================

/**
 * Valida un campo individual de forma síncrona
 * @param value Valor a validar
 * @param validator Validador de yup
 * @returns true si es válido, mensaje de error si no
 */
export function validateField(value: any, validator: Yup.Schema): true | string {
  try {
    validator.validateSync(value);
    return true;
  } catch (error: any) {
    return error.message;
  }
}

/**
 * Valida múltiples campos
 * @param values Objeto con valores
 * @param schema Schema de validación
 * @returns Objeto con errores por campo
 */
export async function validateFields(
  values: Record<string, any>,
  schema: Yup.ObjectSchema<any>
): Promise<Record<string, string>> {
  try {
    await schema.validate(values, { abortEarly: false });
    return {};
  } catch (error: any) {
    const errors: Record<string, string> = {};
    
    if (error.inner) {
      error.inner.forEach((err: any) => {
        if (err.path) {
          errors[err.path] = err.message;
        }
      });
    }
    
    return errors;
  }
}

// Export default para compatibilidad
export default {
  validators,
  schemas,
  errorMessages,
  validateField,
  validateFields,
  makeFieldsOptional,
  combineSchemas,
  conditionalSchema
};