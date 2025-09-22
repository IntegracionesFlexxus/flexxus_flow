// store/conversationsStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import {
  Conversation,
  ConversationStatus,
  ConversationFilters,
  CreateConversationRequest,
  ConversationStats
} from '../types';
import { conversationService } from '../services';

interface ConversationsState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  filters: ConversationFilters;
  loading: boolean;
  error: string | null;
  stats: ConversationStats | null;
  typingUsers: Map<string, string[]>; // conversationId -> userIds
}

interface ConversationsActions {
  // Data actions
  fetchConversations: (filters?: ConversationFilters) => Promise<void>;
  fetchConversation: (id: string) => Promise<void>;
  createConversation: (data: CreateConversationRequest) => Promise<void>;
  assignConversation: (id: string, userId: string) => Promise<void>;
  updateConversationStatus: (id: string, status: ConversationStatus) => Promise<void>;
  resolveConversation: (id: string) => Promise<void>;
  reopenConversation: (id: string) => Promise<void>;
  fetchConversationStats: () => Promise<void>;

  // UI actions
  setActiveConversation: (conversation: Conversation | null) => void;
  updateConversation: (data: Partial<Conversation> & { id: string }) => void;
  addConversation: (conversation: Conversation) => void;
  setFilters: (filters: ConversationFilters) => void;
  incrementUnread: (conversationId: string) => void;
  resetUnread: (conversationId: string) => void;
  setTypingUsers: (conversationId: string, userIds: string[]) => void;
  addTypingUser: (conversationId: string, userId: string) => void;
  removeTypingUser: (conversationId: string, userId: string) => void;
  clearError: () => void;
  resetConversations: () => void;
}

type ConversationsStore = ConversationsState & ConversationsActions;

const initialState: ConversationsState = {
  conversations: [],
  activeConversation: null,
  filters: {},
  loading: false,
  error: null,
  stats: null,
  typingUsers: new Map()
};

export const useConversationsStore = create<ConversationsStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Data actions
      fetchConversations: async (filters?: ConversationFilters) => {
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        try {
          const response = await conversationService.getConversations(filters);
          set((state) => {
            state.loading = false;
            state.conversations = response.data;
          });
        } catch (error) {
          set((state) => {
            state.loading = false;
            state.error = error instanceof Error ? error.message : 'Failed to fetch conversations';
          });
        }
      },

      fetchConversation: async (id: string) => {
        try {
          const response = await conversationService.getConversation(id);
          set((state) => {
            const index = state.conversations.findIndex(c => c.id === id);
            if (index !== -1) {
              state.conversations[index] = response.data;
            } else {
              state.conversations.unshift(response.data);
            }
            if (state.activeConversation?.id === id) {
              state.activeConversation = response.data;
            }
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to fetch conversation';
          });
        }
      },

      createConversation: async (data: CreateConversationRequest) => {
        try {
          const response = await conversationService.createConversation(data);
          set((state) => {
            state.conversations.unshift(response.data);
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to create conversation';
          });
        }
      },

      assignConversation: async (id: string, userId: string) => {
        try {
          const response = await conversationService.assignConversation(id, userId);
          set((state) => {
            const index = state.conversations.findIndex(c => c.id === id);
            if (index !== -1) {
              state.conversations[index] = response.data;
            }
            if (state.activeConversation?.id === id) {
              state.activeConversation = response.data;
            }
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to assign conversation';
          });
        }
      },

      updateConversationStatus: async (id: string, status: ConversationStatus) => {
        try {
          const response = await conversationService.updateConversationStatus(id, status);
          set((state) => {
            const index = state.conversations.findIndex(c => c.id === id);
            if (index !== -1) {
              state.conversations[index] = response.data;
            }
            if (state.activeConversation?.id === id) {
              state.activeConversation = response.data;
            }
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to update conversation status';
          });
        }
      },

      resolveConversation: async (id: string) => {
        try {
          const response = await conversationService.resolveConversation(id);
          set((state) => {
            const index = state.conversations.findIndex(c => c.id === id);
            if (index !== -1) {
              state.conversations[index] = response.data;
            }
            if (state.activeConversation?.id === id) {
              state.activeConversation = response.data;
            }
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to resolve conversation';
          });
        }
      },

      reopenConversation: async (id: string) => {
        try {
          const response = await conversationService.reopenConversation(id);
          set((state) => {
            const index = state.conversations.findIndex(c => c.id === id);
            if (index !== -1) {
              state.conversations[index] = response.data;
            }
            if (state.activeConversation?.id === id) {
              state.activeConversation = response.data;
            }
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to reopen conversation';
          });
        }
      },

      fetchConversationStats: async () => {
        try {
          const response = await conversationService.getConversationStats();
          set((state) => {
            state.stats = response.data;
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to fetch conversation stats';
          });
        }
      },

      // UI actions
      setActiveConversation: (conversation: Conversation | null) => {
        set((state) => {
          state.activeConversation = conversation;
        });
      },

      updateConversation: (data: Partial<Conversation> & { id: string }) => {
        set((state) => {
          const index = state.conversations.findIndex(c => c.id === data.id);
          if (index !== -1) {
            Object.assign(state.conversations[index], data);
          }
          if (state.activeConversation?.id === data.id) {
            Object.assign(state.activeConversation, data);
          }
        });
      },

      addConversation: (conversation: Conversation) => {
        set((state) => {
          // Agregar al inicio para mostrar las más recientes primero
          state.conversations.unshift(conversation);
        });
      },

      setFilters: (filters: ConversationFilters) => {
        set((state) => {
          state.filters = filters;
        });
      },

      incrementUnread: (conversationId: string) => {
        set((state) => {
          const conversation = state.conversations.find(c => c.id === conversationId);
          if (conversation) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
          }
        });
      },

      resetUnread: (conversationId: string) => {
        set((state) => {
          const conversation = state.conversations.find(c => c.id === conversationId);
          if (conversation) {
            conversation.unreadCount = 0;
          }
        });
      },

      setTypingUsers: (conversationId: string, userIds: string[]) => {
        set((state) => {
          if (userIds.length > 0) {
            state.typingUsers.set(conversationId, userIds);
          } else {
            state.typingUsers.delete(conversationId);
          }
        });
      },

      addTypingUser: (conversationId: string, userId: string) => {
        set((state) => {
          const current = state.typingUsers.get(conversationId) || [];
          if (!current.includes(userId)) {
            state.typingUsers.set(conversationId, [...current, userId]);
          }
        });
      },

      removeTypingUser: (conversationId: string, userId: string) => {
        set((state) => {
          const current = state.typingUsers.get(conversationId) || [];
          const filtered = current.filter(id => id !== userId);
          if (filtered.length > 0) {
            state.typingUsers.set(conversationId, filtered);
          } else {
            state.typingUsers.delete(conversationId);
          }
        });
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      resetConversations: () => {
        set((state) => {
          Object.assign(state, { ...initialState, typingUsers: new Map() });
        });
      }
    })),
    {
      name: 'omni-conversations-store'
    }
  )
);

// Selectores
export const selectConversations = (state: ConversationsStore) => state.conversations;
export const selectActiveConversation = (state: ConversationsStore) => state.activeConversation;
export const selectConversationFilters = (state: ConversationsStore) => state.filters;
export const selectConversationsLoading = (state: ConversationsStore) => state.loading;
export const selectConversationsError = (state: ConversationsStore) => state.error;
export const selectConversationStats = (state: ConversationsStore) => state.stats;
export const selectTypingUsers = (state: ConversationsStore) => state.typingUsers;