/**
 * OmniChannel Integration Configuration
 * TODO: OMNICHANNEL - Update when actual module is available
 */

export interface IOmniChannelConfig {
  enabled: boolean;
  adapterType: 'mock' | 'stub' | 'api';
  apiUrl?: string;
  apiKey?: string;
  webhookSecret?: string;
  retryAttempts: number;
  retryDelay: number;
  syncInterval: number;
}

export const omniChannelConfig: IOmniChannelConfig = {
  // Feature flag to enable/disable omnichannel integration
  enabled: process.env.ENABLE_OMNICHANNEL_INTEGRATION === 'true',

  // Adapter type to use: 'mock' for development, 'stub' for logging, 'api' for production
  adapterType: (process.env.OMNICHANNEL_ADAPTER_TYPE as any) || 'mock',

  // API configuration (when available)
  apiUrl: process.env.OMNICHANNEL_API_URL,
  apiKey: process.env.OMNICHANNEL_API_KEY,
  webhookSecret: process.env.OMNICHANNEL_WEBHOOK_SECRET,

  // Retry configuration
  retryAttempts: parseInt(process.env.OMNICHANNEL_RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.OMNICHANNEL_RETRY_DELAY || '1000'),

  // Sync interval in milliseconds (default: 5 minutes)
  syncInterval: parseInt(process.env.OMNICHANNEL_SYNC_INTERVAL || '300000')
};

/**
 * Get the appropriate adapter based on configuration
 */
export function getOmniChannelAdapterType(): 'mock' | 'stub' | 'api' {
  if (!omniChannelConfig.enabled) {
    return 'stub';
  }

  if (process.env.NODE_ENV === 'test') {
    return 'mock';
  }

  return omniChannelConfig.adapterType;
}