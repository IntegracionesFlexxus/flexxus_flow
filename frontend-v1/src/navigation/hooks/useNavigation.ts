/**
 * useNavigation Hook
 * Hook principal para navegación
 */

import { useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavigationStore } from '@navigation/stores/navigationStore';
import { usePermissionStore } from '@navigation/stores/permissionStore';
import { navigationService } from '@navigation/services/navigationService';
import { menuService } from '@navigation/services/menuService';
import type { MenuItem, NavigationTab } from '@navigation/types/navigation.types';

export function useNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationStore = useNavigationStore();
  const permissionStore = usePermissionStore();
  
  // Sync with router on location change
  useEffect(() => {
    navigationStore.syncWithRouter(location.pathname);
    navigationService.updateBreadcrumbs(location.pathname);
  }, [location.pathname]);
  
  // Navigate to path
  const navigateTo = useCallback((path: string, options?: {
    openInTab?: boolean;
    replaceTab?: boolean;
    metadata?: any;
  }) => {
    navigate(path);
    navigationService.navigateTo(path, options);
  }, [navigate]);
  
  // Open tab
  const openTab = useCallback((path: string, label?: string, metadata?: any) => {
    navigationService.openTab(path, label, metadata);
    navigate(path);
  }, [navigate]);
  
  // Close tab
  const closeTab = useCallback(async (tabId: string) => {
    const success = await navigationService.closeTab(tabId);
    if (success) {
      // Navigate to next active tab or dashboard
      const { activeTabId, tabs } = navigationStore;
      if (activeTabId && tabs.length > 0) {
        const activeTab = tabs.find(t => t.id === activeTabId);
        if (activeTab) {
          navigate(activeTab.path);
        }
      } else {
        navigate('/dashboard');
      }
    }
    return success;
  }, [navigate, navigationStore]);
  
  // Close all tabs
  const closeAllTabs = useCallback(async () => {
    const success = await navigationService.closeAllTabs();
    if (success) {
      navigate('/dashboard');
    }
    return success;
  }, [navigate]);
  
  // Go back
  const goBack = useCallback(() => {
    if (navigationStore.previousRoute) {
      navigate(navigationStore.previousRoute);
    } else {
      navigate(-1);
    }
  }, [navigate, navigationStore.previousRoute]);
  
  return {
    // State
    currentPath: location.pathname,
    activeRoute: navigationStore.activeRoute,
    breadcrumbs: navigationStore.breadcrumbs,
    tabs: navigationStore.tabs,
    activeTab: navigationStore.tabs.find(t => t.id === navigationStore.activeTabId),
    
    // Actions
    navigateTo,
    openTab,
    closeTab,
    closeAllTabs,
    goBack,
    
    // Store actions
    setActiveTab: navigationStore.setActiveTab,
    reorderTabs: navigationStore.reorderTabs,
    markTabDirty: navigationStore.markTabDirty
  };
}

export function useMenu() {
  const navigationStore = useNavigationStore();
  const permissionStore = usePermissionStore();
  
  // Get filtered menu items
  const getMenuItems = useCallback(async (): Promise<MenuItem[]> => {
    // Ensure permissions are synced
    if (!permissionStore.lastSync) {
      await permissionStore.syncPermissions();
    }
    
    // Get menu items filtered by permissions
    let items = menuService.getMenuItems();
    
    // Add dynamic badges
    items = await menuService.addDynamicBadges(items);
    
    // Sort by priority
    items = menuService.sortMenuByPriority(items);
    
    return items;
  }, [permissionStore]);
  
  // Initialize menu
  useEffect(() => {
    getMenuItems().then(items => {
      navigationStore.setMenuItems(items);
    });
  }, [permissionStore.effectivePermissions]); // Re-fetch when permissions change
  
  return {
    menuItems: navigationStore.menuItems,
    menuCollapsed: navigationStore.menuCollapsed,
    expandedMenuItems: navigationStore.expandedMenuItems,
    
    // Actions
    toggleMenuCollapse: navigationStore.toggleMenuCollapse,
    toggleMenuItem: navigationStore.toggleMenuItem,
    expandMenuItem: navigationStore.expandMenuItem,
    collapseMenuItem: navigationStore.collapseMenuItem,
    
    // Search
    searchMenu: (query: string) => menuService.searchMenuItems(query)
  };
}

export function usePermissions() {
  const permissionStore = usePermissionStore();
  
  // Sync permissions on mount
  useEffect(() => {
    if (!permissionStore.lastSync) {
      permissionStore.syncPermissions();
    }
  }, []);
  
  return {
    // State
    hasPermissions: permissionStore.effectivePermissions.size > 0,
    isSyncing: permissionStore.isSyncing,
    lastSync: permissionStore.lastSync,
    
    // Checks
    hasPermission: permissionStore.hasPermission,
    hasAnyPermission: permissionStore.hasAnyPermission,
    hasAllPermissions: permissionStore.hasAllPermissions,
    canAccess: permissionStore.canAccess,
    
    // Actions
    syncPermissions: permissionStore.syncPermissions,
    clearCache: permissionStore.clearCache
  };
}