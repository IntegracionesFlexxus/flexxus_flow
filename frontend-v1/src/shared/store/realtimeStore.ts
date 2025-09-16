import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { ConnectionStatus } from '@/config/websocket.config';
import { websocketService } from '@/services/websocket.service';
import { eventBus, SystemEvents } from '@/services/eventBus.service';

// Store para estado real-time - MVP Nivel 1
// TODO: En Nivel 2 agregar persistencia, optimistic updates, conflict resolution

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  timestamp: number;
  read: boolean;
  data?: any;
  actions?: {
    label: string;
    action: () => void;
  }[];
}

interface OnlineUser {
  id: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastActivity: number;
}

interface ActiveConversation {
  id: string;
  participants: string[];
  lastMessage?: any;
  unreadCount: number;
  typing: string[];
}

interface RealtimeState {
  // Estado de conexión
  connectionStatus: ConnectionStatus;
  isConnected: boolean;
  reconnectAttempts: number;
  lastConnectionTime: number | null;
  connectionError: any | null;
  
  // Notificaciones
  notifications: Notification[];
  unreadNotifications: number;
  
  // Presencia de usuarios
  onlineUsers: Map<string, OnlineUser>;
  typingUsers: Map<string, Set<string>>; // channelId -> Set<userId>
  
  // Conversaciones activas
  activeConversations: Map<string, ActiveConversation>;
  
  // Cola de mensajes
  messageQueue: any[];
  queueSize: number;
  
  // Canales suscritos
  subscribedChannels: Set<string>;
  
  // Estadísticas
  stats: {
    messagesReceived: number;
    messagesSent: number;
    reconnections: number;
    errors: number;
    lastActivity: number;
  };
}

interface RealtimeActions {
  // Conexión
  setConnectionStatus: (status: ConnectionStatus) => void;
  setConnectionError: (error: any) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;
  
  // Notificaciones
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Presencia
  setUserOnline: (user: OnlineUser) => void;
  setUserOffline: (userId: string) => void;
  updateUserStatus: (userId: string, status: OnlineUser['status']) => void;
  setUserTyping: (channelId: string, userId: string, isTyping: boolean) => void;
  
  // Conversaciones
  addConversation: (conversation: ActiveConversation) => void;
  updateConversation: (id: string, updates: Partial<ActiveConversation>) => void;
  removeConversation: (id: string) => void;
  incrementUnreadCount: (conversationId: string) => void;
  resetUnreadCount: (conversationId: string) => void;
  
  // Canales
  subscribeToChannel: (channel: string) => void;
  unsubscribeFromChannel: (channel: string) => void;
  
  // Cola de mensajes
  addToQueue: (message: any) => void;
  processQueue: () => void;
  clearQueue: () => void;
  
  // Estadísticas
  updateStats: (updates: Partial<RealtimeState['stats']>) => void;
  incrementMessageCount: (type: 'received' | 'sent') => void;
  
  // Utilidades
  reset: () => void;
  init: () => void;
}

const initialState: RealtimeState = {
  connectionStatus: ConnectionStatus.DISCONNECTED,
  isConnected: false,
  reconnectAttempts: 0,
  lastConnectionTime: null,
  connectionError: null,
  
  notifications: [],
  unreadNotifications: 0,
  
  onlineUsers: new Map(),
  typingUsers: new Map(),
  
  activeConversations: new Map(),
  
  messageQueue: [],
  queueSize: 0,
  
  subscribedChannels: new Set(),
  
  stats: {
    messagesReceived: 0,
    messagesSent: 0,
    reconnections: 0,
    errors: 0,
    lastActivity: Date.now()
  }
};

export const useRealtimeStore = create<RealtimeState & RealtimeActions>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // Conexión
        setConnectionStatus: (status) => set(state => {
          state.connectionStatus = status;
          state.isConnected = status === ConnectionStatus.CONNECTED;
          
          if (status === ConnectionStatus.CONNECTED) {
            state.lastConnectionTime = Date.now();
            state.connectionError = null;
            eventBus.emit(SystemEvents.WS_CONNECTED);
          } else if (status === ConnectionStatus.DISCONNECTED) {
            eventBus.emit(SystemEvents.WS_DISCONNECTED);
          }
        }),

        setConnectionError: (error) => set(state => {
          state.connectionError = error;
          state.stats.errors++;
          eventBus.emit(SystemEvents.WS_ERROR, error);
        }),

        incrementReconnectAttempts: () => set(state => {
          state.reconnectAttempts++;
          state.stats.reconnections++;
        }),

        resetReconnectAttempts: () => set(state => {
          state.reconnectAttempts = 0;
        }),

        // Notificaciones
        addNotification: (notification) => set(state => {
          const newNotification: Notification = {
            ...notification,
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            read: false
          };
          
          state.notifications.unshift(newNotification);
          state.unreadNotifications++;
          
          // Limitar a 100 notificaciones
          if (state.notifications.length > 100) {
            state.notifications = state.notifications.slice(0, 100);
          }
          
          eventBus.emit(SystemEvents.NOTIFICATION_SHOW, newNotification);
        }),

        markNotificationAsRead: (id) => set(state => {
          const notification = state.notifications.find(n => n.id === id);
          if (notification && !notification.read) {
            notification.read = true;
            state.unreadNotifications = Math.max(0, state.unreadNotifications - 1);
          }
        }),

        markAllNotificationsAsRead: () => set(state => {
          state.notifications.forEach(n => { n.read = true; });
          state.unreadNotifications = 0;
        }),

        removeNotification: (id) => set(state => {
          const index = state.notifications.findIndex(n => n.id === id);
          if (index !== -1) {
            const notification = state.notifications[index];
            if (!notification.read) {
              state.unreadNotifications = Math.max(0, state.unreadNotifications - 1);
            }
            state.notifications.splice(index, 1);
            eventBus.emit(SystemEvents.NOTIFICATION_DISMISS, { id });
          }
        }),

        clearNotifications: () => set(state => {
          state.notifications = [];
          state.unreadNotifications = 0;
        }),

        // Presencia
        setUserOnline: (user) => set(state => {
          state.onlineUsers.set(user.id, user);
        }),

        setUserOffline: (userId) => set(state => {
          state.onlineUsers.delete(userId);
          
          // Remover de typing en todos los canales
          state.typingUsers.forEach(users => {
            users.delete(userId);
          });
        }),

        updateUserStatus: (userId, status) => set(state => {
          const user = state.onlineUsers.get(userId);
          if (user) {
            user.status = status;
            user.lastActivity = Date.now();
          }
        }),

        setUserTyping: (channelId, userId, isTyping) => set(state => {
          if (!state.typingUsers.has(channelId)) {
            state.typingUsers.set(channelId, new Set());
          }
          
          const channelTypingUsers = state.typingUsers.get(channelId)!;
          
          if (isTyping) {
            channelTypingUsers.add(userId);
          } else {
            channelTypingUsers.delete(userId);
          }
        }),

        // Conversaciones
        addConversation: (conversation) => set(state => {
          state.activeConversations.set(conversation.id, conversation);
        }),

        updateConversation: (id, updates) => set(state => {
          const conversation = state.activeConversations.get(id);
          if (conversation) {
            Object.assign(conversation, updates);
          }
        }),

        removeConversation: (id) => set(state => {
          state.activeConversations.delete(id);
        }),

        incrementUnreadCount: (conversationId) => set(state => {
          const conversation = state.activeConversations.get(conversationId);
          if (conversation) {
            conversation.unreadCount++;
          }
        }),

        resetUnreadCount: (conversationId) => set(state => {
          const conversation = state.activeConversations.get(conversationId);
          if (conversation) {
            conversation.unreadCount = 0;
          }
        }),

        // Canales
        subscribeToChannel: (channel) => set(state => {
          state.subscribedChannels.add(channel);
          websocketService.subscribe(channel);
        }),

        unsubscribeFromChannel: (channel) => set(state => {
          state.subscribedChannels.delete(channel);
          websocketService.unsubscribe(channel);
        }),

        // Cola de mensajes
        addToQueue: (message) => set(state => {
          state.messageQueue.push(message);
          state.queueSize = state.messageQueue.length;
        }),

        processQueue: () => set(state => {
          while (state.messageQueue.length > 0 && websocketService.isConnected()) {
            const message = state.messageQueue.shift();
            websocketService.send(message);
          }
          state.queueSize = state.messageQueue.length;
        }),

        clearQueue: () => set(state => {
          state.messageQueue = [];
          state.queueSize = 0;
        }),

        // Estadísticas
        updateStats: (updates) => set(state => {
          Object.assign(state.stats, updates);
          state.stats.lastActivity = Date.now();
        }),

        incrementMessageCount: (type) => set(state => {
          if (type === 'received') {
            state.stats.messagesReceived++;
          } else {
            state.stats.messagesSent++;
          }
          state.stats.lastActivity = Date.now();
        }),

        // Utilidades
        reset: () => set(() => initialState),

        init: () => {
          const state = get();
          
          // Suscribirse a eventos del WebSocket
          websocketService.on('ws:status_change', ({ current }) => {
            state.setConnectionStatus(current);
          });
          
          websocketService.on('ws:message', (message) => {
            state.incrementMessageCount('received');
            
            // Procesar diferentes tipos de mensajes
            if (message.type === 'notification') {
              state.addNotification(message.data);
            }
          });
          
          websocketService.on('ws:reconnecting', ({ attempt }) => {
            state.incrementReconnectAttempts();
          });
          
          websocketService.on('ws:error', (error) => {
            state.setConnectionError(error);
          });
          
          // Re-suscribir a canales después de reconexión
          websocketService.on('ws:connected', () => {
            state.subscribedChannels.forEach(channel => {
              websocketService.subscribe(channel);
            });
            state.processQueue();
          });
        }
      }))
    ),
    {
      name: 'realtime-store'
    }
  )
);

// Selectores
export const selectConnectionStatus = (state: RealtimeState) => state.connectionStatus;
export const selectIsConnected = (state: RealtimeState) => state.isConnected;
export const selectNotifications = (state: RealtimeState) => state.notifications;
export const selectUnreadNotifications = (state: RealtimeState) => state.unreadNotifications;
export const selectOnlineUsers = (state: RealtimeState) => Array.from(state.onlineUsers.values());
export const selectActiveConversations = (state: RealtimeState) => Array.from(state.activeConversations.values());
export const selectStats = (state: RealtimeState) => state.stats;

// Inicializar el store cuando se importe
if (typeof window !== 'undefined') {
  useRealtimeStore.getState().init();
}

export default useRealtimeStore;