// store/channelsStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Channel, ChannelType, CreateChannelRequest, UpdateChannelRequest } from '../types';
import { channelService } from '../services';

interface ChannelsState {
  channels: Channel[];
  activeChannel: Channel | null;
  loading: boolean;
  error: string | null;
  stats: any;
}

interface ChannelsActions {
  // Data actions
  fetchChannels: (type?: ChannelType) => Promise<void>;
  createChannel: (data: CreateChannelRequest) => Promise<void>;
  updateChannel: (id: string, data: UpdateChannelRequest) => Promise<void>;
  deleteChannel: (id: string) => Promise<void>;
  toggleChannelStatus: (id: string) => Promise<void>;
  checkChannelHealth: (id: string) => Promise<void>;
  fetchChannelStats: () => Promise<void>;

  // UI actions
  setActiveChannel: (channel: Channel | null) => void;
  updateChannelHealth: (id: string, status: string) => void;
  clearError: () => void;
  resetChannels: () => void;
}

type ChannelsStore = ChannelsState & ChannelsActions;

const initialState: ChannelsState = {
  channels: [],
  activeChannel: null,
  loading: false,
  error: null,
  stats: null
};

export const useChannelsStore = create<ChannelsStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Data actions
      fetchChannels: async (type?: ChannelType) => {
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        try {
          const response = await channelService.getChannels(type);
          set((state) => {
            state.loading = false;
            state.channels = response.data;
          });
        } catch (error) {
          set((state) => {
            state.loading = false;
            state.error = error instanceof Error ? error.message : 'Failed to fetch channels';
          });
        }
      },

      createChannel: async (data: CreateChannelRequest) => {
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        try {
          const response = await channelService.createChannel(data);
          set((state) => {
            state.loading = false;
            state.channels.push(response.data);
          });
        } catch (error) {
          set((state) => {
            state.loading = false;
            state.error = error instanceof Error ? error.message : 'Failed to create channel';
          });
        }
      },

      updateChannel: async (id: string, data: UpdateChannelRequest) => {
        try {
          const response = await channelService.updateChannel(id, data);
          set((state) => {
            const index = state.channels.findIndex(c => c.id === id);
            if (index !== -1) {
              state.channels[index] = response.data;
            }
            if (state.activeChannel?.id === id) {
              state.activeChannel = response.data;
            }
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to update channel';
          });
        }
      },

      deleteChannel: async (id: string) => {
        try {
          await channelService.deleteChannel(id);
          set((state) => {
            state.channels = state.channels.filter(c => c.id !== id);
            if (state.activeChannel?.id === id) {
              state.activeChannel = null;
            }
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to delete channel';
          });
        }
      },

      toggleChannelStatus: async (id: string) => {
        try {
          const response = await channelService.toggleChannelStatus(id);
          set((state) => {
            const index = state.channels.findIndex(c => c.id === id);
            if (index !== -1) {
              state.channels[index] = response.data;
            }
            if (state.activeChannel?.id === id) {
              state.activeChannel = response.data;
            }
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to toggle channel status';
          });
        }
      },

      checkChannelHealth: async (id: string) => {
        try {
          await channelService.checkChannelHealth(id);
          // The health status will be updated via WebSocket or polling
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to check channel health';
          });
        }
      },

      fetchChannelStats: async () => {
        try {
          const response = await channelService.getChannelStats();
          set((state) => {
            state.stats = response.data;
          });
        } catch (error) {
          set((state) => {
            state.error = error instanceof Error ? error.message : 'Failed to fetch channel stats';
          });
        }
      },

      // UI actions
      setActiveChannel: (channel: Channel | null) => {
        set((state) => {
          state.activeChannel = channel;
        });
      },

      updateChannelHealth: (id: string, status: string) => {
        set((state) => {
          const channel = state.channels.find(c => c.id === id);
          if (channel) {
            channel.healthStatus = status as any;
            channel.lastHealthCheck = new Date();
          }
          if (state.activeChannel?.id === id) {
            state.activeChannel.healthStatus = status as any;
            state.activeChannel.lastHealthCheck = new Date();
          }
        });
      },

      clearError: () => {
        set((state) => {
          state.error = null;
        });
      },

      resetChannels: () => {
        set((state) => {
          Object.assign(state, initialState);
        });
      }
    })),
    {
      name: 'omni-channels-store'
    }
  )
);

// Selectores
export const selectChannels = (state: ChannelsStore) => state.channels;
export const selectActiveChannel = (state: ChannelsStore) => state.activeChannel;
export const selectChannelsLoading = (state: ChannelsStore) => state.loading;
export const selectChannelsError = (state: ChannelsStore) => state.error;
export const selectChannelStats = (state: ChannelsStore) => state.stats;