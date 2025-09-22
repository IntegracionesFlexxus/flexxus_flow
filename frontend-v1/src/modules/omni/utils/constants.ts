// utils/constants.ts
import { ChannelType } from '../types';

export const CHANNEL_TYPES = {
  [ChannelType.WHATSAPP]: {
    name: 'WhatsApp',
    icon: '💬',
    color: '#25D366',
    description: 'WhatsApp Business messaging'
  },
  [ChannelType.INSTAGRAM]: {
    name: 'Instagram',
    icon: '📷',
    color: '#E4405F',
    description: 'Instagram Direct messaging'
  },
  [ChannelType.EMAIL]: {
    name: 'Email',
    icon: '📧',
    color: '#1976D2',
    description: 'Email marketing and support'
  },
  [ChannelType.SMS]: {
    name: 'SMS',
    icon: '📱',
    color: '#4CAF50',
    description: 'SMS text messaging'
  }
};

export const CONVERSATION_STATUSES = {
  OPEN: { label: 'Open', color: 'green' },
  PENDING: { label: 'Pending', color: 'yellow' },
  RESOLVED: { label: 'Resolved', color: 'gray' },
  ARCHIVED: { label: 'Archived', color: 'gray' }
};

export const PRIORITIES = {
  LOW: { label: 'Low', color: 'gray' },
  NORMAL: { label: 'Normal', color: 'blue' },
  HIGH: { label: 'High', color: 'orange' },
  URGENT: { label: 'Urgent', color: 'red' }
};

export const MESSAGE_TYPES = {
  TEXT: { label: 'Text', icon: '💬' },
  IMAGE: { label: 'Image', icon: '🖼️' },
  VIDEO: { label: 'Video', icon: '🎥' },
  AUDIO: { label: 'Audio', icon: '🎵' },
  DOCUMENT: { label: 'Document', icon: '📄' },
  LOCATION: { label: 'Location', icon: '📍' }
};

export const HEALTH_STATUSES = {
  HEALTHY: { label: 'Healthy', color: 'green' },
  DEGRADED: { label: 'Degraded', color: 'yellow' },
  DOWN: { label: 'Down', color: 'red' },
  UNKNOWN: { label: 'Unknown', color: 'gray' }
};

// WebSocket events
export const WS_EVENTS = {
  CONVERSATION_NEW: 'conversation:new',
  CONVERSATION_ASSIGNED: 'conversation:assigned',
  CONVERSATION_RESOLVED: 'conversation:resolved',
  MESSAGE_RECEIVED: 'message:received',
  MESSAGE_STATUS: 'message:status',
  TYPING_STARTED: 'typing:started',
  TYPING_STOPPED: 'typing:stopped',
  CHANNEL_STATUS_CHANGED: 'channel:status:changed'
};

// Default limits
export const DEFAULT_LIMITS = {
  CONVERSATIONS_PER_PAGE: 50,
  MESSAGES_PER_PAGE: 50,
  SEARCH_RESULTS: 20
};

// File upload constraints
export const FILE_CONSTRAINTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'application/msword'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/mpeg'],
  ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav']
};