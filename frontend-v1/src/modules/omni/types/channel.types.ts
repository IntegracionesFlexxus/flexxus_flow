/**
 * Channel Types
 * Definiciones de tipos para canales de omnicanalidad
 */

export enum ChannelType {
  WHATSAPP = 'whatsapp',
  EMAIL = 'email',
  SMS = 'sms',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook'
}

export enum ChannelStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  PENDING = 'pending',
  ERROR = 'error'
}

export enum ChannelHealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
  UNKNOWN = 'unknown'
}

export interface ChannelStats {
  messagesSent: number;
  messagesReceived: number;
  messagesFailed: number;
  conversationsActive: number;
  conversationsResolved?: number;
  avgResponseTime?: number;
}

export interface ChannelLimits {
  dailyLimit: number;
  messageSentToday: number;
  lastLimitReset: Date;
  rateLimitTier?: string;
}

export interface Channel {
  id: string;
  channel_type: ChannelType;
  name: string;
  description?: string;
  is_active: boolean;
  health_status: ChannelHealthStatus;
  last_health_check?: Date;
  configuration: any; // Se especificará según el tipo en config.types.ts
  metadata?: Record<string, any>;
  stats?: ChannelStats;
  limits?: ChannelLimits;
  company_id: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ChannelFormData {
  channel_type: ChannelType;
  name: string;
  description?: string;
  configuration: any;
}

export interface ChannelHealthCheck {
  channelId: string;
  healthy: boolean;
  status: ChannelHealthStatus;
  message?: string;
  lastCheck: Date;
  details?: {
    responseTime?: number;
    errorRate?: number;
    queueSize?: number;
  };
}

export interface ChannelWebhookConfig {
  url: string;
  verifyToken: string;
  events: string[];
  isActive: boolean;
  lastVerified?: Date;
}

// Interfaz para la respuesta de la API
export interface ChannelResponse {
  success: boolean;
  data?: Channel | Channel[];
  message?: string;
  error?: string;
}

// Interfaz para estadísticas agregadas
export interface ChannelAggregateStats {
  totalChannels: number;
  activeChannels: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalConversations: number;
  channelBreakdown: {
    [key in ChannelType]?: {
      count: number;
      active: number;
      messagesSent: number;
      messagesReceived: number;
    };
  };
}