/**
 * Configuration Types
 * Definiciones de tipos para configuraciones específicas de cada canal
 */

// Proveedores de Email
export enum EmailProvider {
  SENDGRID = 'sendgrid',
  SES = 'ses',
  SMTP = 'smtp',
  MAILGUN = 'mailgun'
}

// Proveedores de SMS
export enum SMSProvider {
  TWILIO = 'twilio',
  MESSAGEBIRD = 'messagebird',
  VONAGE = 'vonage',
  AWS_SNS = 'aws_sns'
}

// Configuración base para todos los canales
export interface BaseChannelConfig {
  [key: string]: any;
}

// Configuración de WhatsApp Business
export interface WhatsAppConfig extends BaseChannelConfig {
  phoneNumber: string;           // Número de teléfono con código de país (+5491112345678)
  phoneNumberId?: string;        // ID del número en Meta Business
  businessAccountId?: string;    // ID de la cuenta Business
  accessToken?: string;          // Token de acceso de Meta
  webhookVerifyToken?: string;   // Token para verificación de webhooks
  apiVersion?: string;           // Versión de la API (v17.0, v18.0, etc.)
  capabilities?: string[];       // Capacidades habilitadas
  displayPhoneNumber?: string;   // Número para mostrar al usuario
  qualityRating?: string;        // Rating de calidad del número
}

// Configuración de Email
export interface EmailConfig extends BaseChannelConfig {
  provider: EmailProvider;       // Proveedor de email
  fromEmail: string;             // Email de envío
  fromName?: string;             // Nombre para mostrar
  replyToEmail?: string;         // Email de respuesta

  // Configuración SMTP (cuando provider === 'smtp')
  smtpHost?: string;             // Host del servidor SMTP
  smtpPort?: number;             // Puerto SMTP (587, 465, 25)
  smtpUser?: string;             // Usuario SMTP
  smtpPassword?: string;         // Contraseña SMTP
  smtpSecure?: boolean;          // Usar TLS/SSL

  // Configuración API (cuando provider !== 'smtp')
  apiKey?: string;               // API Key del proveedor
  apiSecret?: string;            // API Secret (si aplica)
  domain?: string;               // Dominio (para Mailgun)
  region?: string;               // Región (para SES)

  // Configuración de webhooks
  bounceWebhookUrl?: string;     // URL para notificaciones de rebotes
  trackOpens?: boolean;          // Rastrear aperturas
  trackClicks?: boolean;         // Rastrear clicks
}

// Configuración de SMS
export interface SMSConfig extends BaseChannelConfig {
  provider: SMSProvider;         // Proveedor de SMS
  phoneNumber: string;           // Número de teléfono origen

  // Configuración Twilio
  accountSid?: string;           // Account SID de Twilio
  authToken?: string;            // Auth Token de Twilio
  messagingServiceSid?: string;  // Messaging Service SID

  // Configuración general de API
  apiKey?: string;               // API Key para otros proveedores
  apiSecret?: string;            // API Secret

  // Configuración adicional
  countryCode?: string;          // Código de país (AR, US, MX, etc.)
  capabilities?: string[];       // Capacidades (sms, mms, voice)
  alphanumericSenderId?: string; // ID alfanumérico de envío
  maxSmsLength?: number;         // Longitud máxima de SMS
}

// Configuración de Instagram
export interface InstagramConfig extends BaseChannelConfig {
  instagramAccountId: string;    // ID de la cuenta de Instagram
  instagramUsername?: string;     // Nombre de usuario (@usuario)
  pageId?: string;                // ID de la página de Facebook asociada
  pageAccessToken?: string;       // Token de acceso de la página
  webhookVerifyToken?: string;    // Token de verificación de webhook
  apiVersion?: string;            // Versión de la API
  igUserId?: string;              // ID de usuario de Instagram
  profilePictureUrl?: string;     // URL de la foto de perfil
}

// Configuración de Facebook Messenger
export interface FacebookConfig extends BaseChannelConfig {
  pageId: string;                 // ID de la página de Facebook
  pageName?: string;              // Nombre de la página
  pageAccessToken: string;        // Token de acceso de la página
  appId?: string;                 // ID de la aplicación
  appSecret?: string;             // Secret de la aplicación
  webhookVerifyToken?: string;    // Token de verificación
  apiVersion?: string;            // Versión de la API
  pageCategory?: string;          // Categoría de la página
  pageProfileUrl?: string;        // URL del perfil
}

// Tipo unión para todas las configuraciones
export type ChannelConfiguration =
  | WhatsAppConfig
  | EmailConfig
  | SMSConfig
  | InstagramConfig
  | FacebookConfig;

// Interfaz para validación de configuración
export interface ConfigValidation {
  field: string;
  required: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  message: string;
}

// Mapa de validaciones por tipo de canal
export const CONFIG_VALIDATIONS: Record<string, ConfigValidation[]> = {
  whatsapp: [
    {
      field: 'phoneNumber',
      required: true,
      pattern: /^\+[1-9]\d{1,14}$/,
      message: 'Número de teléfono inválido (debe incluir código de país)'
    },
    {
      field: 'accessToken',
      required: true,
      minLength: 100,
      message: 'Access Token requerido'
    }
  ],
  email: [
    {
      field: 'fromEmail',
      required: true,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Email inválido'
    }
  ],
  sms: [
    {
      field: 'phoneNumber',
      required: true,
      pattern: /^\+[1-9]\d{1,14}$/,
      message: 'Número de teléfono inválido'
    }
  ],
  instagram: [
    {
      field: 'instagramAccountId',
      required: true,
      message: 'ID de cuenta de Instagram requerido'
    },
    {
      field: 'pageAccessToken',
      required: true,
      message: 'Token de acceso requerido'
    }
  ],
  facebook: [
    {
      field: 'pageId',
      required: true,
      message: 'ID de página requerido'
    },
    {
      field: 'pageAccessToken',
      required: true,
      message: 'Token de acceso de página requerido'
    }
  ]
};