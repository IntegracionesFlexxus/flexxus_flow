/**
 * Webhook Service
 * Servicio para gestionar configuración de webhooks
 */

import { ChannelType } from '../types/channel.types';

export const webhookService = {
  /**
   * Obtener la URL del webhook para un canal
   */
  getWebhookUrl: (channelType: ChannelType, channelId: string): string => {
    // Usar la URL del backend desde las variables de entorno o window.location
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ||
                   process.env.REACT_APP_API_URL ||
                   `${window.location.protocol}//${window.location.hostname}:5000/api`;

    return `${baseUrl}/omni/webhooks/${channelType}/${channelId}`;
  },

  /**
   * Generar token de verificación para webhook
   */
  generateVerifyToken: (): string => {
    // Generar un token seguro de 32 caracteres
    const array = new Uint8Array(32);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback para navegadores antiguos
      let token = '';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return token;
    }
  },

  /**
   * Obtener instrucciones de configuración del webhook según el canal
   */
  getWebhookSetupInstructions: (
    channelType: ChannelType,
    channelId: string,
    verifyToken?: string
  ): {
    url: string;
    verifyToken: string;
    steps: string[];
    fields?: { label: string; value: string }[];
  } => {
    const webhookUrl = webhookService.getWebhookUrl(channelType, channelId);
    const token = verifyToken || webhookService.generateVerifyToken();

    switch (channelType) {
      case ChannelType.WHATSAPP:
        return {
          url: webhookUrl,
          verifyToken: token,
          steps: [
            'Accede a Meta Business Manager',
            'Ve a tu app de WhatsApp Business',
            'Navega a Configuración > Webhooks',
            'Haz clic en "Editar" en la sección de Webhooks',
            'Ingresa la URL del webhook y el token de verificación',
            'Suscríbete a los eventos: messages, message_status',
            'Haz clic en "Verificar y guardar"'
          ],
          fields: [
            { label: 'Callback URL', value: webhookUrl },
            { label: 'Verify Token', value: token },
            { label: 'Webhook Fields', value: 'messages, message_status' }
          ]
        };

      case ChannelType.EMAIL:
        return {
          url: webhookUrl,
          verifyToken: token,
          steps: [
            'Accede al dashboard de tu proveedor de email',
            'Ve a la sección de Webhooks o Event Notifications',
            'Agrega una nueva URL de webhook',
            'Selecciona los eventos: bounce, open, click, spam_report',
            'Guarda la configuración'
          ],
          fields: [
            { label: 'Webhook URL', value: webhookUrl },
            { label: 'Events', value: 'bounce, open, click, spam_report' }
          ]
        };

      case ChannelType.SMS:
        return {
          url: webhookUrl,
          verifyToken: token,
          steps: [
            'Accede al dashboard de Twilio/MessageBird',
            'Ve a la configuración del número de teléfono',
            'En la sección de Messaging',
            'Configura la URL de webhook para mensajes entrantes',
            'Guarda los cambios'
          ],
          fields: [
            { label: 'Webhook URL (SMS)', value: webhookUrl },
            { label: 'Method', value: 'POST' }
          ]
        };

      case ChannelType.INSTAGRAM:
        return {
          url: webhookUrl,
          verifyToken: token,
          steps: [
            'Accede a Meta Business Manager',
            'Ve a tu app de Instagram',
            'Navega a Configuración > Webhooks',
            'Configura el webhook para Instagram',
            'Suscríbete a: messages, messaging_postbacks',
            'Verifica y guarda'
          ],
          fields: [
            { label: 'Callback URL', value: webhookUrl },
            { label: 'Verify Token', value: token }
          ]
        };

      case ChannelType.FACEBOOK:
        return {
          url: webhookUrl,
          verifyToken: token,
          steps: [
            'Accede a Meta Developers',
            'Ve a tu app de Facebook',
            'Navega a Messenger > Settings',
            'En la sección de Webhooks',
            'Configura la URL de callback',
            'Suscríbete a: messages, messaging_postbacks, messaging_optins',
            'Verifica y guarda'
          ],
          fields: [
            { label: 'Callback URL', value: webhookUrl },
            { label: 'Verify Token', value: token },
            { label: 'Webhook Events', value: 'messages, messaging_postbacks' }
          ]
        };

      default:
        return {
          url: webhookUrl,
          verifyToken: token,
          steps: [],
          fields: []
        };
    }
  },

  /**
   * Copiar texto al portapapeles
   */
  copyToClipboard: async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback para navegadores antiguos
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const result = document.execCommand('copy');
        document.body.removeChild(textarea);
        return result;
      }
    } catch (error) {
      console.error('Error al copiar al portapapeles:', error);
      return false;
    }
  },

  /**
   * Verificar si el webhook está funcionando
   */
  testWebhook: async (
    channelType: ChannelType,
    channelId: string
  ): Promise<{
    success: boolean;
    message: string;
    lastReceived?: string;
    eventsReceived?: number;
  }> => {
    try {
      // Simular una llamada al backend para verificar el estado del webhook
      const response = await fetch(`/api/omni/webhooks/${channelType}/${channelId}/test`, {
        method: 'POST'
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Error al verificar webhook'
      };
    }
  },

  /**
   * Obtener logs de webhook
   */
  getWebhookLogs: async (
    channelId: string,
    limit: number = 10
  ): Promise<{
    logs: Array<{
      id: string;
      timestamp: string;
      event: string;
      status: 'success' | 'error';
      message?: string;
      payload?: any;
    }>;
    total: number;
  }> => {
    try {
      const response = await fetch(`/api/omni/webhooks/logs/${channelId}?limit=${limit}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return {
        logs: [],
        total: 0
      };
    }
  }
};