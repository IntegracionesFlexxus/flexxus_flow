/**
 * Eventos WebSocket Compartidos
 * Archivo compartido entre frontend y backend para sincronizar eventos
 * IMPORTANTE: Cualquier cambio debe reflejarse en ambos lados
 */

// Eventos de Notificaciones
export enum NotificationEvents {
  NEW = 'notification:new',
  UPDATED = 'notification:updated',
  DELETED = 'notification:deleted',
  BULK = 'notifications:bulk',
  UNREAD_COUNT = 'notifications:unread-count',
  MARK_READ = 'notification:mark-read',
  MARK_ALL_READ = 'notifications:mark-all-read',
  DELETE = 'notification:delete'
}

// Eventos de Presencia
export enum PresenceEvents {
  UPDATE = 'presence:update',
  UPDATED = 'presence:updated',
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',
  USER_AWAY = 'user:away',
  USER_BUSY = 'user:busy'
}

// Eventos de Conexión
export enum ConnectionEvents {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  RECONNECT = 'reconnect',
  RECONNECTING = 'reconnecting',
  RECONNECT_ERROR = 'reconnect_error',
  RECONNECT_FAILED = 'reconnect_failed'
}

// Eventos de Autenticación
export enum AuthEvents {
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  AUTHENTICATION_ERROR = 'authentication:error',
  UNAUTHORIZED = 'unauthorized'
}

// Eventos de Mensajes
export enum MessageEvents {
  SEND = 'message:send',
  RECEIVED = 'message:received',
  DELIVERED = 'message:delivered',
  READ = 'message:read',
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',
  TYPING_INDICATOR = 'typing:indicator'
}

// Eventos de Rooms/Canales
export enum RoomEvents {
  JOIN = 'room:join',
  LEAVE = 'room:leave',
  JOINED = 'room:joined',
  LEFT = 'room:left',
  USER_JOINED = 'room:user:joined',
  USER_LEFT = 'room:user:left'
}

// Eventos del Sistema
export enum SystemEvents {
  HEARTBEAT = 'heartbeat',
  HEARTBEAT_ACK = 'heartbeat:ack',
  SERVER_MESSAGE = 'server:message',
  MAINTENANCE = 'server:maintenance',
  UPDATE_AVAILABLE = 'server:update:available'
}

// Tipos de datos para eventos
export interface NotificationEventData {
  id: string;
  type: string;
  title: string;
  message: string;
  userId: string;
  companyId?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface PresenceEventData {
  userId: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastSeen?: string;
  metadata?: Record<string, any>;
}

export interface MessageEventData {
  id: string;
  content: string;
  senderId: string;
  recipientId?: string;
  roomId?: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'system';
  metadata?: Record<string, any>;
}

export interface RoomEventData {
  roomId: string;
  userId: string;
  roomName?: string;
  participants?: string[];
  metadata?: Record<string, any>;
}

// Mapeo completo de todos los eventos
export const ALL_EVENTS = {
  ...NotificationEvents,
  ...PresenceEvents,
  ...ConnectionEvents,
  ...AuthEvents,
  ...MessageEvents,
  ...RoomEvents,
  ...SystemEvents
} as const;

// Tipo para cualquier evento
export type WebSocketEvent = typeof ALL_EVENTS[keyof typeof ALL_EVENTS];

// Helper para obtener el nombre del evento
export function getEventName(event: WebSocketEvent): string {
  return event;
}

// Helper para validar si un string es un evento válido
export function isValidEvent(eventName: string): boolean {
  return Object.values(ALL_EVENTS).includes(eventName as WebSocketEvent);
}