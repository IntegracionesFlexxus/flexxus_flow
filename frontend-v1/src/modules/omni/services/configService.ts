/**
 * Configuration Service
 * Servicio para gestionar configuraciones de canales con seguridad integrada
 */

import { ChannelType } from '../types/channel.types';
import {
  WhatsAppConfig,
  EmailConfig,
  SMSConfig,
  InstagramConfig,
  FacebookConfig
} from '../types/config.types';
import { securityService, SecurityUtils } from '../utils/security';

export const configService = {
  /**
   * Obtener configuración por defecto según el tipo de canal
   */
  getDefaultConfig: (channelType: ChannelType): any => {
    switch (channelType) {
      case ChannelType.WHATSAPP:
        return {
          phoneNumber: '',
          phoneNumberId: '',
          businessAccountId: '',
          accessToken: '',
          webhookVerifyToken: configService.generateToken(),
          apiVersion: 'v18.0'
        } as WhatsAppConfig;

      case ChannelType.EMAIL:
        return {
          provider: 'smtp',
          fromEmail: '',
          fromName: '',
          replyToEmail: '',
          smtpHost: '',
          smtpPort: 587,
          smtpUser: '',
          smtpPassword: '',
          apiKey: ''
        } as EmailConfig;

      case ChannelType.SMS:
        return {
          provider: 'twilio',
          phoneNumber: '',
          accountSid: '',
          authToken: '',
          apiKey: '',
          messagingServiceSid: '',
          countryCode: 'AR'
        } as SMSConfig;

      case ChannelType.INSTAGRAM:
        return {
          instagramAccountId: '',
          instagramUsername: '',
          pageId: '',
          pageAccessToken: '',
          webhookVerifyToken: configService.generateToken(),
          apiVersion: 'v18.0'
        } as InstagramConfig;

      case ChannelType.FACEBOOK:
        return {
          pageId: '',
          pageName: '',
          pageAccessToken: '',
          appId: '',
          appSecret: '',
          webhookVerifyToken: configService.generateToken()
        } as FacebookConfig;

      default:
        return {};
    }
  },

  /**
   * Validar configuración antes de enviar
   */
  validateConfig: (channelType: ChannelType, config: any): {
    valid: boolean;
    errors: string[];
  } => {
    const errors: string[] = [];

    switch (channelType) {
      case ChannelType.WHATSAPP:
        if (!config.phoneNumber) errors.push('Número de teléfono requerido');
        if (!config.accessToken) errors.push('Access Token requerido');
        if (config.phoneNumber && !config.phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
          errors.push('Formato de número inválido (debe incluir código de país)');
        }
        break;

      case ChannelType.EMAIL:
        if (!config.fromEmail) errors.push('Email de envío requerido');
        if (config.fromEmail && !config.fromEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
          errors.push('Formato de email inválido');
        }
        if (config.provider === 'smtp') {
          if (!config.smtpHost) errors.push('Host SMTP requerido');
          if (!config.smtpPort) errors.push('Puerto SMTP requerido');
          if (!config.smtpUser) errors.push('Usuario SMTP requerido');
          if (!config.smtpPassword) errors.push('Contraseña SMTP requerida');
        } else {
          if (!config.apiKey) errors.push('API Key requerida');
        }
        break;

      case ChannelType.SMS:
        if (!config.phoneNumber) errors.push('Número de teléfono requerido');
        if (config.provider === 'twilio') {
          if (!config.accountSid) errors.push('Account SID requerido');
          if (!config.authToken) errors.push('Auth Token requerido');
        } else {
          if (!config.apiKey) errors.push('API Key requerida');
        }
        break;

      case ChannelType.INSTAGRAM:
        if (!config.instagramAccountId) errors.push('ID de cuenta Instagram requerido');
        if (!config.pageAccessToken) errors.push('Token de acceso requerido');
        break;

      case ChannelType.FACEBOOK:
        if (!config.pageId) errors.push('ID de página requerido');
        if (!config.pageAccessToken) errors.push('Token de acceso requerido');
        break;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Sanitizar configuración antes de guardar (eliminar espacios, encriptar datos sensibles)
   */
  sanitizeConfig: (config: any): any => {
    const sanitized: any = {};

    // Primero, limpiar espacios y sanitizar entradas
    Object.keys(config).forEach(key => {
      const value = config[key];
      if (typeof value === 'string') {
        // Sanitizar input para prevenir XSS
        sanitized[key] = securityService.sanitizeInput(value.trim());
      } else {
        sanitized[key] = value;
      }
    });

    // Luego, encriptar campos sensibles
    return securityService.encryptSensitiveFields(sanitized);
  },

  /**
   * Desencriptar configuración para mostrar/editar
   */
  decryptConfig: (config: any): any => {
    return securityService.decryptSensitiveFields(config);
  },

  /**
   * Generar token aleatorio seguro para webhooks
   */
  generateToken: (): string => {
    return securityService.generateSecureToken(32);
  },

  /**
   * Validar seguridad de credenciales
   */
  validateCredentialSecurity: (config: any): {
    isSecure: boolean;
    warnings: string[];
  } => {
    const warnings: string[] = [];

    // Verificar tokens
    if (config.accessToken && !SecurityUtils.isSecureToken(config.accessToken)) {
      warnings.push('El Access Token no cumple con los requisitos de seguridad');
    }

    if (config.apiKey && !SecurityUtils.isSecureToken(config.apiKey)) {
      warnings.push('La API Key no cumple con los requisitos de seguridad');
    }

    // Verificar contraseñas
    if (config.smtpPassword) {
      const passwordCheck = securityService.validatePasswordStrength(config.smtpPassword);
      if (!passwordCheck.isValid) {
        warnings.push(...passwordCheck.feedback);
      }
    }

    // Verificar URLs
    if (config.webhookUrl && !SecurityUtils.isSecureUrl(config.webhookUrl)) {
      warnings.push('La URL del webhook debe usar HTTPS');
    }

    return {
      isSecure: warnings.length === 0,
      warnings
    };
  },

  /**
   * Obtener instrucciones de configuración por canal
   */
  getSetupInstructions: (channelType: ChannelType): string[] => {
    switch (channelType) {
      case ChannelType.WHATSAPP:
        return [
          'Crea una cuenta de WhatsApp Business',
          'Accede a Meta Business Manager',
          'Crea una app de WhatsApp Business',
          'Obtén el Phone Number ID de tu número',
          'Genera un Access Token permanente',
          'Configura los webhooks en Meta'
        ];

      case ChannelType.EMAIL:
        return [
          'Para SMTP: Obtén las credenciales de tu servidor de correo',
          'Para Gmail: Genera una contraseña de aplicación',
          'Para SendGrid/SES: Obtén tu API Key desde el dashboard',
          'Verifica el dominio de envío si es necesario'
        ];

      case ChannelType.SMS:
        return [
          'Crea una cuenta en Twilio/MessageBird/Vonage',
          'Compra un número de teléfono',
          'Obtén las credenciales de API',
          'Configura los webhooks para recibir mensajes'
        ];

      case ChannelType.INSTAGRAM:
        return [
          'Convierte tu cuenta a Instagram Business',
          'Conecta con una página de Facebook',
          'Obtén permisos de Instagram en Meta',
          'Genera el token de acceso de página',
          'Configura webhooks para mensajes'
        ];

      case ChannelType.FACEBOOK:
        return [
          'Crea una página de Facebook',
          'Crea una app en Meta Developers',
          'Obtén permisos de páginas y Messenger',
          'Genera el token de acceso de página',
          'Configura webhooks de Messenger'
        ];

      default:
        return [];
    }
  },

  /**
   * Obtener URLs de documentación
   */
  getDocumentationUrls: (channelType: ChannelType): {
    title: string;
    url: string;
  }[] => {
    switch (channelType) {
      case ChannelType.WHATSAPP:
        return [
          {
            title: 'WhatsApp Business API',
            url: 'https://developers.facebook.com/docs/whatsapp'
          },
          {
            title: 'Guía de inicio rápido',
            url: 'https://developers.facebook.com/docs/whatsapp/getting-started'
          }
        ];

      case ChannelType.EMAIL:
        return [
          {
            title: 'SendGrid Docs',
            url: 'https://docs.sendgrid.com'
          },
          {
            title: 'Amazon SES',
            url: 'https://docs.aws.amazon.com/ses/'
          }
        ];

      case ChannelType.SMS:
        return [
          {
            title: 'Twilio Docs',
            url: 'https://www.twilio.com/docs/sms'
          },
          {
            title: 'MessageBird',
            url: 'https://developers.messagebird.com'
          }
        ];

      default:
        return [];
    }
  }
};