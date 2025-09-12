/**
 * WebSocket Types and Interfaces
 * Sprint 4 - Tipos para el sistema WebSocket multi-tenant
 */
import { Socket } from 'socket.io';
export interface AuthenticatedSocket extends Socket {
  userId: string;
  companyId: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
}
export interface ConnectionInfo {
  socketId: string;
  userId: string;
  companyId: string;
  namespace: string;
  connectedAt: Date;
  lastPingAt?: Date;
  ipAddress: string;
  userAgent?: string;
  rooms: Set<string>;
}
export interface NamespaceConfig {
  companyId: string;
  maxConnections: number;
  enablePresence: boolean;
  enableTypingIndicators: boolean;
  enableReadReceipts: boolean;
}
export interface RoomConfig {
  name: string;
  type: 'department' | 'user' | 'broadcast' | 'project' | 'custom';
  maxMembers?: number;
  persistent: boolean;
  metadata?: Record<string, any>;
}
export interface HeartbeatConfig {
  interval: number; // milliseconds
  timeout: number; // milliseconds
  maxMissedBeats: number;
}
export interface WebSocketConfig {
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  pingTimeout: number;
  pingInterval: number;
  maxHttpBufferSize: number;
  transports: ('polling' | 'websocket')[];
  path: string;
}
export interface ConnectionLimits {
  maxConnectionsPerUser: number;
  maxConnectionsPerCompany: number;
  maxConnectionsTotal: number;
}
// Event types
export enum ClientEvents {
  AUTHENTICATE = 'authenticate',
  JOIN_ROOM = 'join:room',
  LEAVE_ROOM = 'leave:room',
  MESSAGE_SEND = 'message:send',
  PRESENCE_UPDATE = 'presence:update',
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',
  HEARTBEAT = 'heartbeat',
  DISCONNECT = 'disconnect'
}
export enum ServerEvents {
  AUTHENTICATED = 'authenticated',
  AUTHENTICATION_ERROR = 'authentication:error',
  ROOM_JOINED = 'room:joined',
  ROOM_LEFT = 'room:left',
  MESSAGE_RECEIVED = 'message:received',
  PRESENCE_UPDATED = 'presence:updated',
  USER_CONNECTED = 'user:connected',
  USER_DISCONNECTED = 'user:disconnected',
  TYPING_INDICATOR = 'typing:indicator',
  ERROR = 'error',
  HEARTBEAT_ACK = 'heartbeat:ack',
  CONNECTION_LIMIT_REACHED = 'connection:limit:reached'
}
// Message types
export interface WebSocketMessage {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
  metadata?: {
    userId?: string;
    companyId?: string;
    roomId?: string;
  };
}
export interface PresenceData {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: Date;
  metadata?: Record<string, any>;
}
export interface TypingIndicator {
  userId: string;
  roomId: string;
  isTyping: boolean;
}
// Error types
export interface WebSocketError {
  code: string;
  message: string;
  details?: any;
}
export enum WebSocketErrorCodes {
  AUTHENTICATION_FAILED = 'WS_AUTH_FAILED',
  UNAUTHORIZED = 'WS_UNAUTHORIZED',
  CONNECTION_LIMIT = 'WS_CONNECTION_LIMIT',
  INVALID_NAMESPACE = 'WS_INVALID_NAMESPACE',
  ROOM_NOT_FOUND = 'WS_ROOM_NOT_FOUND',
  ROOM_FULL = 'WS_ROOM_FULL',
  INVALID_MESSAGE = 'WS_INVALID_MESSAGE',
  RATE_LIMIT = 'WS_RATE_LIMIT',
  INTERNAL_ERROR = 'WS_INTERNAL_ERROR'
}
