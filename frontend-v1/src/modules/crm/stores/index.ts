// Store Index - Sprint 19 Frontend Implementation
// Centralized exports for all CRM stores

// Core CRM Stores
export { useCRMStore } from './crmStore';
export { useLeadStore } from './leadStore';
export { default as usePipelineStore } from './usePipelineStore';
export { default as useForecastStore } from './useForecastStore';
export { default as useActivityStore } from './useActivityStore';
export { useAnalyticsStore } from './analyticsStore';
export { useDashboardStore } from './dashboardStore';

// Product Quote Module Stores
export { useProductStore } from './productStore';
export { usePricingStore } from './pricingStore';
export { useQuoteStore } from './quoteStore';
export { useApprovalStore } from './approvalStore';

// Combined store hook for accessing all stores
export const useCombinedStore = () => ({
  productStore: useProductStore(),
  pricingStore: usePricingStore(),
  quoteStore: useQuoteStore(),
  approvalStore: useApprovalStore()
});

// Store reset utility
export const resetAllStores = () => {
  useProductStore.getState().resetStore();
  usePricingStore.getState().resetStore();
  useQuoteStore.getState().resetStore();
  useApprovalStore.getState().resetStore();
};

// Store cleanup utility for unmount
export const cleanupAllStores = () => {
  // Disable real-time features
  usePricingStore.getState().disableRealTimePricing();
  useApprovalStore.getState().disableRealTimeUpdates();

  // Destroy quote builder if active
  useQuoteStore.getState().destroyBuilder();

  // Reset all stores
  resetAllStores();
};