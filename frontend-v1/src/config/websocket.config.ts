// Configuración de WebSocket - MVP Nivel 1
// TODO: En Nivel 2 mover a variables de entorno y agregar configuración avanzada

export const WEBSOCKET_CONFIG = {
  // URL base del servidor WebSocket
  // TODO: Mover a .env en Nivel 2
  url: process.env.REACT_APP_WS_URL || 'ws://localhost:3001',
  
  // Configuración de reconexión
  reconnect: {
    enabled: true,
    maxAttempts: 5,
    delay: 5000, // ms
    backoffMultiplier: 1.5, // Aumentar delay exponencialmente
    maxDelay: 30000 // ms
  },
  
  // Configuración de heartbeat
  heartbeat: {
    enabled: true,
    interval: 30000, // ms
    timeout: 60000, // ms - tiempo máximo sin respuesta antes de reconectar
    message: { type: 'ping' }
  },
  
  // Configuración de cola de mensajes
  messageQueue: {
    enabled: true,
    maxSize: 100, // Máximo de mensajes en cola
    persistQueue: false // TODO: En Nivel 2 persistir en localStorage
  },
  
  // Timeouts
  timeouts: {
    connect: 10000, // ms
    send: 5000, // ms
    close: 5000 // ms
  },
  
  // Configuración de debug
  debug: process.env.NODE_ENV === 'development',
  
  // Protocolos WebSocket
  protocols: [],
  
  // Opciones de compresión
  compression: {
    enabled: false, // TODO: Habilitar en Nivel 2
    threshold: 1024 // bytes
  }
};

// Tipos de eventos del sistema
export enum WebSocketEvent {
  // Eventos de conexión
  CONNECTING = 'ws:connecting',
  CONNECTED = 'ws:connected',
  DISCONNECTED = 'ws:disconnected',
  RECONNECTING = 'ws:reconnecting',
  ERROR = 'ws:error',
  
  // Eventos de mensajes
  MESSAGE = 'ws:message',
  MESSAGE_SENT = 'ws:message_sent',
  MESSAGE_QUEUED = 'ws:message_queued',
  
  // Eventos de estado
  STATUS_CHANGE = 'ws:status_change',
  HEARTBEAT = 'ws:heartbeat',
  
  // Eventos de aplicación
  NOTIFICATION = 'app:notification',
  USER_ACTIVITY = 'app:user_activity',
  DATA_UPDATE = 'app:data_update',
  PRESENCE_UPDATE = 'app:presence_update'
}

// Estados de conexión
export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// Tipos de mensajes
export enum MessageType {
  // Sistema
  PING = 'ping',
  PONG = 'pong',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  
  // Aplicación
  MESSAGE = 'message',
  NOTIFICATION = 'notification',
  UPDATE = 'update',
  BROADCAST = 'broadcast',
  
  // Presencia
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',
  USER_TYPING = 'user_typing',
  USER_IDLE = 'user_idle',
  
  // Datos
  DATA_CREATE = 'data_create',
  DATA_UPDATE = 'data_update',
  DATA_DELETE = 'data_delete',
  DATA_SYNC = 'data_sync'
}

// Prioridades de mensajes
export enum MessagePriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

// Configuración de canales/rooms
export const CHANNEL_CONFIG = {
  // Canales del sistema
  system: {
    notifications: '/notifications',
    updates: '/updates',
    presence: '/presence'
  },
  
  // Canales de aplicación
  app: {
    chat: '/chat',
    omnichannel: '/omni',
    crm: '/crm',
    workflow: '/workflow',
    analytics: '/analytics'
  },
  
  // Prefijos de canales
  prefixes: {
    private: 'private-',
    presence: 'presence-',
    broadcast: 'broadcast-'
  }
};

// Configuración de retry
export const RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryMultiplier: 2,
  shouldRetry: (error: any) => {
    // No reintentar en errores de autenticación
    if (error?.code === 401 || error?.code === 403) {
      return false;
    }
    return true;
  }
};

// Configuración de logging
export const LOGGING_CONFIG = {
  enabled: process.env.NODE_ENV === 'development',
  level: 'debug', // 'error' | 'warn' | 'info' | 'debug'
  includeTimestamp: true,
  includeStackTrace: false
};

// Helpers de configuración
export const getWebSocketUrl = (path?: string): string => {
  const baseUrl = WEBSOCKET_CONFIG.url;
  return path ? `${baseUrl}${path}` : baseUrl;
};

export const getChannelUrl = (channel: string, params?: Record<string, string>): string => {
  const baseUrl = getWebSocketUrl();
  const queryString = params 
    ? '?' + new URLSearchParams(params).toString()
    : '';
  return `${baseUrl}${channel}${queryString}`;
};

export const isSystemChannel = (channel: string): boolean => {
  return Object.values(CHANNEL_CONFIG.system).includes(channel);
};

export const isPrivateChannel = (channel: string): boolean => {
  return channel.startsWith(CHANNEL_CONFIG.prefixes.private);
};

export default WEBSOCKET_CONFIG;