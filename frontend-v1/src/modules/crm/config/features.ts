/**
 * Feature Flags Configuration
 *
 * OMNICHANNEL STATUS: Adapted for missing module
 * See: FRONTEND_OMNICHANNEL_ADAPTATIONS.md for pending changes
 *
 * TODO: OMNICHANNEL - Update flags when module is ready
 */

// Feature flags for OmniChannel integration
export const FEATURE_FLAGS = {
  // Core OmniChannel integration
  OMNICHANNEL_INTEGRATION: false,     // Master switch - set to true when OmniChannel is ready

  // Specific features
  REAL_TIME_ENGAGEMENT: false,        // Requires WebSocket connection
  AUTOMATED_CAPTURE: false,            // Requires form builder integration
  EMAIL_TRACKING: false,               // Requires email service integration
  WEBSITE_TRACKING: false,             // Requires tracking pixel
  CHAT_INTEGRATION: false,             // Requires chat widget
  SOCIAL_LISTENING: false,             // Requires social media APIs

  // Lead management features (available now)
  MANUAL_LEAD_ENTRY: true,            // Always enabled as fallback
  LEAD_SCORING: true,                 // Available with limited data
  DUPLICATE_DETECTION: true,          // Available without OmniChannel
  LEAD_ASSIGNMENT: true,              // Available without OmniChannel
  LEAD_CONVERSION: true,              // Available without OmniChannel

  // UI/UX features
  SHOW_OMNICHANNEL_STATUS: true,     // Show banner about missing integration
  SHOW_UNVERIFIED_BADGES: true,      // Show badges for unverified sources
  SHOW_MOCK_DATA_WARNING: true,      // Show warnings about mock data
  USE_POLLING_UPDATES: true,         // Use polling instead of WebSocket

  // Development features
  ENABLE_MOCK_DATA: true,            // Use mock data for missing features
  ENABLE_DEBUG_LOGGING: process.env.NODE_ENV === 'development',
  SHOW_FEATURE_FLAGS_UI: process.env.NODE_ENV === 'development'
} as const;

// Helper function to check if OmniChannel is enabled
export const isOmniChannelEnabled = (): boolean => {
  return process.env.REACT_APP_OMNICHANNEL_ENABLED === 'true' ||
         FEATURE_FLAGS.OMNICHANNEL_INTEGRATION;
};

// Helper function to check if real-time features are available
export const isRealTimeEnabled = (): boolean => {
  return isOmniChannelEnabled() && FEATURE_FLAGS.REAL_TIME_ENGAGEMENT;
};

// Helper function to check if we should use mock data
export const shouldUseMockData = (): boolean => {
  return !isOmniChannelEnabled() && FEATURE_FLAGS.ENABLE_MOCK_DATA;
};

// Helper function to check if polling is needed
export const shouldUsePolling = (): boolean => {
  return !isRealTimeEnabled() && FEATURE_FLAGS.USE_POLLING_UPDATES;
};

// Configuration for polling intervals (in milliseconds)
export const POLLING_INTERVALS = {
  LEADS_LIST: 30000,        // 30 seconds for lead list updates
  LEAD_DETAIL: 60000,       // 1 minute for individual lead updates
  SCORING_UPDATE: 120000,   // 2 minutes for scoring updates
  ENGAGEMENT_DATA: 300000,  // 5 minutes for engagement data (mock)
  SYNC_STATUS: 10000        // 10 seconds for sync status checks
} as const;

// Messages to show users about OmniChannel status
export const OMNICHANNEL_MESSAGES = {
  BANNER_WARNING: "OmniChannel integration pending - Some features are limited",
  ENGAGEMENT_UNAVAILABLE: "Engagement tracking will be available once OmniChannel is connected",
  SCORING_LIMITED: "Behavioral scoring requires OmniChannel data for full accuracy",
  SOURCE_UNVERIFIED: "Lead source verification pending OmniChannel integration",
  MANUAL_ENTRY_INFO: "Using manual entry mode. Automated capture will be available with OmniChannel",
  SYNC_PENDING: "This lead is awaiting synchronization with OmniChannel",
  MOCK_DATA_WARNING: "Displaying sample data. Real data will be available when OmniChannel is connected",
  FEATURE_DISABLED: "This feature requires OmniChannel integration",
  COMING_SOON: "Coming Soon - Requires OmniChannel Module"
} as const;

// Feature availability checks
export const checkFeatureAvailability = (feature: keyof typeof FEATURE_FLAGS): boolean => {
  return FEATURE_FLAGS[feature] === true;
};

// Get appropriate message for disabled feature
export const getDisabledFeatureMessage = (feature: string): string => {
  if (!isOmniChannelEnabled()) {
    return OMNICHANNEL_MESSAGES.FEATURE_DISABLED;
  }
  return `Feature "${feature}" is currently disabled`;
};

// Export type for feature flags
export type FeatureFlag = keyof typeof FEATURE_FLAGS;
export type PollingInterval = keyof typeof POLLING_INTERVALS;

// Configuration for gradual feature rollout
export const ROLLOUT_CONFIG = {
  enabled: false,
  percentage: 0,  // 0-100, percentage of users who see new features
  userGroups: [] as string[], // Specific user groups for testing
  testUsers: [] as number[]    // Specific user IDs for testing
} as const;

// Check if current user should see new features
export const isUserInRollout = (userId: number, userGroup?: string): boolean => {
  if (!ROLLOUT_CONFIG.enabled) return false;

  // Check specific test users
  if (ROLLOUT_CONFIG.testUsers.includes(userId)) return true;

  // Check user groups
  if (userGroup && ROLLOUT_CONFIG.userGroups.includes(userGroup)) return true;

  // Check percentage rollout (simple hash-based)
  const hash = userId % 100;
  return hash < ROLLOUT_CONFIG.percentage;
};

// Export default configuration
export default {
  FEATURE_FLAGS,
  POLLING_INTERVALS,
  OMNICHANNEL_MESSAGES,
  isOmniChannelEnabled,
  isRealTimeEnabled,
  shouldUseMockData,
  shouldUsePolling,
  checkFeatureAvailability,
  getDisabledFeatureMessage
};