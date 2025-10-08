/**
 * Channel Validation Schemas
 * Esquemas de validación con Yup para cada tipo de canal
 */

import * as yup from 'yup';
import { ChannelType, EmailProvider, SMSProvider } from '../../../types';

// Validaciones comunes reutilizables
const phoneNumberValidation = yup
  .string()
  .required('El número de teléfono es requerido')
  .matches(
    /^\+[1-9]\d{1,14}$/,
    'Formato inválido. Debe incluir código de país (ej: +5491112345678)'
  );

const emailValidation = yup
  .string()
  .required('El email es requerido')
  .email('Formato de email inválido');

const apiTokenValidation = (minLength = 100) => yup
  .string()
  .required('El token de acceso es requerido')
  .min(minLength, `El token debe tener al menos ${minLength} caracteres`);

// Esquema para información base del canal
export const channelBaseSchema = yup.object({
  name: yup
    .string()
    .required('El nombre del canal es requerido')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  description: yup
    .string()
    .max(200, 'La descripción no puede exceder 200 caracteres')
});

// Esquema para WhatsApp Business
export const whatsappSchema = yup.object({
  phoneNumber: phoneNumberValidation,
  phoneNumberId: yup
    .string()
    .matches(/^\d{15,16}$/, 'El ID debe tener 15-16 dígitos')
    .nullable(),
  businessAccountId: yup
    .string()
    .matches(/^\d{15,}$/, 'El ID debe ser numérico con al menos 15 dígitos')
    .nullable(),
  accessToken: apiTokenValidation(100),
  webhookVerifyToken: yup
    .string()
    .min(20, 'El token de verificación debe tener al menos 20 caracteres'),
  apiVersion: yup
    .string()
    .matches(/^v\d+\.\d+$/, 'Formato inválido (ej: v18.0)')
    .nullable()
});

// Esquema para Email
export const emailSchema = yup.object({
  provider: yup
    .string()
    .oneOf(Object.values(EmailProvider), 'Proveedor no válido')
    .required('El proveedor es requerido'),
  fromEmail: emailValidation,
  fromName: yup
    .string()
    .max(50, 'El nombre no puede exceder 50 caracteres')
    .nullable(),
  replyToEmail: yup
    .string()
    .email('Formato de email inválido')
    .nullable(),

  // Validación condicional para SMTP
  smtpHost: yup.string().when('provider', {
    is: EmailProvider.SMTP,
    then: (schema) => schema.required('El host SMTP es requerido'),
    otherwise: (schema) => schema.nullable()
  }),
  smtpPort: yup.number().when('provider', {
    is: EmailProvider.SMTP,
    then: (schema) => schema
      .required('El puerto es requerido')
      .min(1, 'Puerto inválido')
      .max(65535, 'Puerto inválido'),
    otherwise: (schema) => schema.nullable()
  }),
  smtpUser: yup.string().when('provider', {
    is: EmailProvider.SMTP,
    then: (schema) => schema.required('El usuario SMTP es requerido'),
    otherwise: (schema) => schema.nullable()
  }),
  smtpPassword: yup.string().when('provider', {
    is: EmailProvider.SMTP,
    then: (schema) => schema.required('La contraseña SMTP es requerida'),
    otherwise: (schema) => schema.nullable()
  }),
  smtpSecure: yup.boolean().nullable(),

  // Validación para proveedores con API
  apiKey: yup.string().when('provider', {
    is: (val: EmailProvider) => val !== EmailProvider.SMTP,
    then: (schema) => schema.required('La API Key es requerida'),
    otherwise: (schema) => schema.nullable()
  }),

  // Campos específicos por proveedor
  region: yup.string().when('provider', {
    is: EmailProvider.SES,
    then: (schema) => schema.required('La región AWS es requerida'),
    otherwise: (schema) => schema.nullable()
  }),
  domain: yup.string().when('provider', {
    is: EmailProvider.MAILGUN,
    then: (schema) => schema.required('El dominio es requerido'),
    otherwise: (schema) => schema.nullable()
  }),

  trackOpens: yup.boolean(),
  trackClicks: yup.boolean()
});

// Esquema para SMS
export const smsSchema = yup.object({
  provider: yup
    .string()
    .oneOf(Object.values(SMSProvider), 'Proveedor no válido')
    .required('El proveedor es requerido'),
  phoneNumber: phoneNumberValidation,
  countryCode: yup
    .string()
    .matches(/^[A-Z]{2}$/, 'Código de país inválido (ej: AR, US, MX)')
    .nullable(),

  // Validación para Twilio
  accountSid: yup.string().when('provider', {
    is: SMSProvider.TWILIO,
    then: (schema) => schema
      .required('El Account SID es requerido')
      .matches(/^AC[a-f0-9]{32}$/, 'Formato inválido (debe empezar con AC)'),
    otherwise: (schema) => schema.nullable()
  }),
  authToken: yup.string().when('provider', {
    is: SMSProvider.TWILIO,
    then: (schema) => schema
      .required('El Auth Token es requerido')
      .min(32, 'El token debe tener 32 caracteres'),
    otherwise: (schema) => schema.nullable()
  }),
  messagingServiceSid: yup.string().when('provider', {
    is: SMSProvider.TWILIO,
    then: (schema) => schema
      .matches(/^MG[a-f0-9]{32}$/, 'Formato inválido (debe empezar con MG)')
      .nullable(),
    otherwise: (schema) => schema.nullable()
  }),

  // Validación para otros proveedores
  apiKey: yup.string().when('provider', {
    is: (val: SMSProvider) => val !== SMSProvider.TWILIO,
    then: (schema) => schema.required('La API Key es requerida'),
    otherwise: (schema) => schema.nullable()
  }),
  apiSecret: yup.string().when('provider', {
    is: SMSProvider.VONAGE,
    then: (schema) => schema.required('El API Secret es requerido'),
    otherwise: (schema) => schema.nullable()
  })
});

// Esquema para Instagram
export const instagramSchema = yup.object({
  instagramAccountId: yup
    .string()
    .required('El ID de cuenta es requerido')
    .matches(/^\d{15,20}$/, 'El ID debe tener entre 15-20 dígitos'),
  instagramUsername: yup
    .string()
    .matches(/^@?[\w.]+$/, 'Nombre de usuario inválido')
    .nullable(),
  pageId: yup
    .string()
    .matches(/^\d{15,}$/, 'El ID debe ser numérico con al menos 15 dígitos')
    .nullable(),
  pageAccessToken: apiTokenValidation(100),
  webhookVerifyToken: yup
    .string()
    .min(20, 'El token de verificación debe tener al menos 20 caracteres'),
  apiVersion: yup
    .string()
    .matches(/^v\d+\.\d+$/, 'Formato inválido (ej: v18.0)')
    .nullable()
});

// Esquema para Facebook Messenger
export const facebookSchema = yup.object({
  pageId: yup
    .string()
    .required('El ID de página es requerido')
    .matches(/^\d{15,}$/, 'El ID debe ser numérico con al menos 15 dígitos'),
  pageName: yup
    .string()
    .max(100, 'El nombre no puede exceder 100 caracteres')
    .nullable(),
  pageAccessToken: apiTokenValidation(100),
  appId: yup
    .string()
    .matches(/^\d{15,16}$/, 'El App ID debe tener 15-16 dígitos')
    .nullable(),
  appSecret: yup
    .string()
    .matches(/^[a-f0-9]{32}$/, 'El App Secret debe ser de 32 caracteres hexadecimales')
    .nullable(),
  webhookVerifyToken: yup
    .string()
    .min(20, 'El token de verificación debe tener al menos 20 caracteres'),
  apiVersion: yup
    .string()
    .matches(/^v\d+\.\d+$/, 'Formato inválido (ej: v18.0)')
    .nullable()
});

// Función helper para obtener el esquema según el tipo de canal
export const getChannelSchema = (channelType: ChannelType): yup.AnyObjectSchema => {
  switch (channelType) {
    case ChannelType.WHATSAPP:
      return whatsappSchema;
    case ChannelType.EMAIL:
      return emailSchema;
    case ChannelType.SMS:
      return smsSchema;
    case ChannelType.INSTAGRAM:
      return instagramSchema;
    case ChannelType.FACEBOOK:
      return facebookSchema;
    default:
      return yup.object();
  }
};

// Esquema completo para crear/actualizar canal
export const createChannelSchema = (channelType: ChannelType) => yup.object({
  name: yup
    .string()
    .required('El nombre del canal es requerido')
    .min(3, 'El nombre debe tener al menos 3 caracteres')
    .max(50, 'El nombre no puede exceder 50 caracteres'),
  description: yup
    .string()
    .max(200, 'La descripción no puede exceder 200 caracteres'),
  channel_type: yup
    .string()
    .oneOf(Object.values(ChannelType), 'Tipo de canal inválido')
    .required('El tipo de canal es requerido'),
  configuration: getChannelSchema(channelType)
});

// Validación de seguridad para tokens y contraseñas
export const securityValidation = {
  // Verificar que no contenga espacios en blanco al inicio o final
  noWhitespace: (value: string | undefined): boolean => {
    if (!value) return true;
    return value.trim() === value;
  },

  // Verificar que no contenga caracteres peligrosos para evitar inyecciones
  noMaliciousChars: (value: string | undefined): boolean => {
    if (!value) return true;
    const dangerousPattern = /[<>\"'`]/;
    return !dangerousPattern.test(value);
  },

  // Verificar fortaleza de contraseña
  isStrongPassword: (password: string): boolean => {
    // Al menos 8 caracteres, una mayúscula, una minúscula, un número
    const strongPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return strongPattern.test(password);
  },

  // Sanitizar entrada
  sanitizeInput: (value: string): string => {
    if (!value) return value;
    return value
      .trim()
      .replace(/[<>\"'`]/g, '') // Eliminar caracteres potencialmente peligrosos
      .slice(0, 1000); // Limitar longitud máxima
  }
};

// Validaciones asíncronas (para usar con el backend)
export const asyncValidations = {
  // Verificar si el número de teléfono ya está en uso
  checkPhoneAvailability: async (phoneNumber: string, currentChannelId?: string): Promise<boolean> => {
    try {
      // TODO: Implementar llamada al backend
      // const response = await channelService.checkPhoneAvailability(phoneNumber, currentChannelId);
      // return response.available;
      return true;
    } catch {
      return false;
    }
  },

  // Verificar credenciales con el proveedor
  validateProviderCredentials: async (channelType: ChannelType, config: any): Promise<boolean> => {
    try {
      // TODO: Implementar llamada al backend
      // const response = await channelService.validateCredentials(channelType, config);
      // return response.valid;
      return true;
    } catch {
      return false;
    }
  }
};

// Mensajes de error personalizados
export const validationMessages = {
  required: (field: string) => `${field} es requerido`,
  min: (field: string, min: number) => `${field} debe tener al menos ${min} caracteres`,
  max: (field: string, max: number) => `${field} no puede exceder ${max} caracteres`,
  email: 'Formato de email inválido',
  phone: 'Formato de teléfono inválido. Incluye código de país (ej: +5491112345678)',
  url: 'URL inválida',
  numeric: 'Debe ser un valor numérico',
  alphanumeric: 'Solo se permiten letras y números',
  noSpecialChars: 'No se permiten caracteres especiales',
  weakPassword: 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número'
};