/**
 * Navigation Store
 * Estado global de navegación con Zustand
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { 
  NavigationState, 
  MenuItem, 
  BreadcrumbItem, 
  NavigationTab, 
  QuickAction,
  SearchHistoryItem 
} from '@navigation/types/navigation.types';

interface NavigationStore extends NavigationState {
  // Route actions
  setActiveRoute: (route: string) => void;
  navigateTo: (route: string) => void;
  
  // Breadcrumb actions
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  addBreadcrumb: (breadcrumb: BreadcrumbItem) => void;
  removeBreadcrumb: (index: number) => void;
  
  // Tab actions
  openTab: (tab: NavigationTab) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  reorderTabs: (tabs: NavigationTab[]) => void;
  markTabDirty: (tabId: string, dirty: boolean) => void;
  closeAllTabs: () => void;
  closeOtherTabs: (tabId: string) => void;
  
  // Menu actions
  setMenuItems: (items: MenuItem[]) => void;
  setMenuCollapsed: (collapsed: boolean) => void;
  toggleMenuCollapse: () => void;
  expandMenuItem: (itemId: string) => void;
  collapseMenuItem: (itemId: string) => void;
  toggleMenuItem: (itemId: string) => void;
  
  // Quick Action actions
  setQuickActions: (actions: QuickAction[]) => void;
  addQuickAction: (action: QuickAction) => void;
  removeQuickAction: (actionId: string) => void;
  
  // Search actions
  addSearchHistory: (item: SearchHistoryItem) => void;
  clearSearchHistory: () => void;
  addRecentSearch: (query: string) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  
  // Utils
  reset: () => void;
  syncWithRouter: (path: string) => void;
}

const initialState: NavigationState = {
  activeRoute: '/',
  previousRoute: undefined,
  breadcrumbs: [],
  tabs: [],
  activeTabId: undefined,
  maxTabs: 10,
  menuItems: [],
  menuCollapsed: false,
  expandedMenuItems: [],
  quickActions: [],
  searchHistory: [],
  recentSearches: [],
  commandPaletteOpen: false
};

export const useNavigationStore = create<NavigationStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Route actions
        setActiveRoute: (route) => set((state) => {
          state.previousRoute = state.activeRoute;
          state.activeRoute = route;
        }),
        
        navigateTo: (route) => {
          const state = get();
          set((draft) => {
            draft.previousRoute = state.activeRoute;
            draft.activeRoute = route;
          });
          // Navigate using window.location or react-router
          window.history.pushState({}, '', route);
        },
        
        // Breadcrumb actions
        setBreadcrumbs: (breadcrumbs) => set((state) => {
          state.breadcrumbs = breadcrumbs;
        }),
        
        addBreadcrumb: (breadcrumb) => set((state) => {
          state.breadcrumbs.push(breadcrumb);
        }),
        
        removeBreadcrumb: (index) => set((state) => {
          state.breadcrumbs.splice(index, 1);
        }),
        
        // Tab actions
        openTab: (tab) => set((state) => {
          const existingIndex = state.tabs.findIndex(t => t.id === tab.id);
          
          if (existingIndex === -1) {
            // Add new tab if under limit
            if (state.tabs.length < state.maxTabs) {
              state.tabs.push(tab);
              state.activeTabId = tab.id;
            } else {
              // Replace least recently used tab
              const lruTab = state.tabs[0];
              if (!lruTab.dirty) {
                state.tabs[0] = tab;
                state.activeTabId = tab.id;
              }
            }
          } else {
            // Activate existing tab
            state.activeTabId = tab.id;
          }
        }),
        
        closeTab: (tabId) => set((state) => {
          const index = state.tabs.findIndex(t => t.id === tabId);
          if (index !== -1) {
            state.tabs.splice(index, 1);
            
            // Update active tab if needed
            if (state.activeTabId === tabId) {
              if (state.tabs.length > 0) {
                // Activate nearest tab
                const newActiveIndex = Math.min(index, state.tabs.length - 1);
                state.activeTabId = state.tabs[newActiveIndex]?.id;
              } else {
                state.activeTabId = undefined;
              }
            }
          }
        }),
        
        setActiveTab: (tabId) => set((state) => {
          if (state.tabs.some(t => t.id === tabId)) {
            state.activeTabId = tabId;
          }
        }),
        
        reorderTabs: (tabs) => set((state) => {
          state.tabs = tabs;
        }),
        
        markTabDirty: (tabId, dirty) => set((state) => {
          const tab = state.tabs.find(t => t.id === tabId);
          if (tab) {
            tab.dirty = dirty;
          }
        }),
        
        closeAllTabs: () => set((state) => {
          const dirtyTabs = state.tabs.filter(t => t.dirty);
          if (dirtyTabs.length === 0) {
            state.tabs = [];
            state.activeTabId = undefined;
          }
        }),
        
        closeOtherTabs: (tabId) => set((state) => {
          const tab = state.tabs.find(t => t.id === tabId);
          if (tab) {
            const otherTabs = state.tabs.filter(t => t.id !== tabId);
            const dirtyOtherTabs = otherTabs.filter(t => t.dirty);
            if (dirtyOtherTabs.length === 0) {
              state.tabs = [tab];
              state.activeTabId = tabId;
            }
          }
        }),
        
        // Menu actions
        setMenuItems: (items) => set((state) => {
          state.menuItems = items;
        }),
        
        setMenuCollapsed: (collapsed) => set((state) => {
          state.menuCollapsed = collapsed;
        }),
        
        toggleMenuCollapse: () => set((state) => {
          state.menuCollapsed = !state.menuCollapsed;
        }),
        
        expandMenuItem: (itemId) => set((state) => {
          if (!state.expandedMenuItems.includes(itemId)) {
            state.expandedMenuItems.push(itemId);
          }
        }),
        
        collapseMenuItem: (itemId) => set((state) => {
          const index = state.expandedMenuItems.indexOf(itemId);
          if (index !== -1) {
            state.expandedMenuItems.splice(index, 1);
          }
        }),
        
        toggleMenuItem: (itemId) => set((state) => {
          const index = state.expandedMenuItems.indexOf(itemId);
          if (index !== -1) {
            state.expandedMenuItems.splice(index, 1);
          } else {
            state.expandedMenuItems.push(itemId);
          }
        }),
        
        // Quick Action actions
        setQuickActions: (actions) => set((state) => {
          state.quickActions = actions;
        }),
        
        addQuickAction: (action) => set((state) => {
          if (!state.quickActions.some(a => a.id === action.id)) {
            state.quickActions.push(action);
          }
        }),
        
        removeQuickAction: (actionId) => set((state) => {
          const index = state.quickActions.findIndex(a => a.id === actionId);
          if (index !== -1) {
            state.quickActions.splice(index, 1);
          }
        }),
        
        // Search actions
        addSearchHistory: (item) => set((state) => {
          state.searchHistory.unshift(item);
          // Keep only last 50 items
          if (state.searchHistory.length > 50) {
            state.searchHistory = state.searchHistory.slice(0, 50);
          }
        }),
        
        clearSearchHistory: () => set((state) => {
          state.searchHistory = [];
        }),
        
        addRecentSearch: (query) => set((state) => {
          // Remove if exists
          const index = state.recentSearches.indexOf(query);
          if (index !== -1) {
            state.recentSearches.splice(index, 1);
          }
          // Add to beginning
          state.recentSearches.unshift(query);
          // Keep only last 10
          if (state.recentSearches.length > 10) {
            state.recentSearches = state.recentSearches.slice(0, 10);
          }
        }),
        
        setCommandPaletteOpen: (open) => set((state) => {
          state.commandPaletteOpen = open;
        }),
        
        // Utils
        reset: () => set(() => initialState),
        
        syncWithRouter: (path) => {
          const state = get();
          if (state.activeRoute !== path) {
            set((draft) => {
              draft.previousRoute = state.activeRoute;
              draft.activeRoute = path;
            });
          }
        }
      })),
      {
        name: 'navigation-store',
        partialize: (state) => ({
          tabs: state.tabs,
          expandedMenuItems: state.expandedMenuItems,
          menuCollapsed: state.menuCollapsed,
          recentSearches: state.recentSearches,
          searchHistory: state.searchHistory.slice(0, 10) // Keep only recent 10
        })
      }
    ),
    { name: 'navigation-store' }
  )
);

// Selectors
export const selectActiveRoute = (state: NavigationStore) => state.activeRoute;
export const selectBreadcrumbs = (state: NavigationStore) => state.breadcrumbs;
export const selectTabs = (state: NavigationStore) => state.tabs;
export const selectActiveTab = (state: NavigationStore) => 
  state.tabs.find(t => t.id === state.activeTabId);
export const selectMenuItems = (state: NavigationStore) => state.menuItems;
export const selectQuickActions = (state: NavigationStore) => state.quickActions;