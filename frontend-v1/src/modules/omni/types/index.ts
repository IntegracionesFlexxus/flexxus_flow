// types/index.ts
export * from './channel.types';
export * from './conversation.types';
export * from './message.types';
export * from './customer.types';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface ApiListResponse<T> extends ApiResponse<T[]> {
  count: number;
  total?: number;
  hasMore?: boolean;
  nextCursor?: string;
}

// WebSocket types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: Date;
}

export interface TypingIndicator {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}