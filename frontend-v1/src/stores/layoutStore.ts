/**
 * Layout Store - Dashboard Layout System
 * Gestión del estado del layout con persistencia
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useThemeStore } from './themeStore';

export interface GridLayout {
  i: string; // Unique identifier
  x: number; // X position in grid units
  y: number; // Y position in grid units
  w: number; // Width in grid units
  h: number; // Height in grid units
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
}

export interface LayoutPreferences {
  sidebarOpen: boolean;
  sidebarWidth: number;
  sidebarCollapsed: boolean;
  sidebarPinned: boolean;
  headerHeight: number;
  compactMode: boolean;
  animationsEnabled: boolean;
  density: 'normal' | 'compact' | 'spacious';
  viewMode: 'grid' | 'list' | 'dashboard';
  layoutLocked: boolean;
}

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

export interface LayoutState extends LayoutPreferences {
  // Additional UI state
  sidebarOpen: boolean;
  viewMode: 'grid' | 'list' | 'dashboard';
  headerHeight: number;
  

  // Grid Layout
  gridLayouts: Record<Breakpoint, GridLayout[]>;
  currentBreakpoint: Breakpoint;
  
  // Drag and Drop
  isDragging: boolean;
  draggedItem: string | null;
  
  // Layout Lock
  layoutLocked: boolean;
  
  // Actions - Sidebar
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarPinned: (pinned: boolean) => void;
  setSidebarWidth: (width: number) => void;
  toggleSidebar: () => void;
  
  // Actions - Grid
  updateGridLayout: (breakpoint: Breakpoint, layout: GridLayout[]) => void;
  setCurrentBreakpoint: (breakpoint: Breakpoint) => void;
  resetGridLayout: (breakpoint?: Breakpoint) => void;
  
  // Actions - Preferences
  setCompactMode: (compact: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setDensity: (density: 'normal' | 'compact' | 'spacious') => void;
  setLayoutLocked: (locked: boolean) => void;
  setViewMode: (mode: 'grid' | 'list' | 'dashboard') => void;
  setHeaderHeight: (height: number) => void;
  setSidebarOpen: (open: boolean) => void;
  resetLayout: () => void;
  
  // Actions - Drag
  setIsDragging: (dragging: boolean) => void;
  setDraggedItem: (item: string | null) => void;
  
  // Actions - Persistence
  saveLayoutPreferences: () => Promise<void>;
  loadLayoutPreferences: () => Promise<void>;
  resetToDefaults: () => void;
}

// Default grid layouts for different breakpoints
const defaultGridLayouts: Record<Breakpoint, GridLayout[]> = {
  mobile: [
    { i: 'stats', x: 0, y: 0, w: 12, h: 2, minH: 2 },
    { i: 'chart', x: 0, y: 2, w: 12, h: 3, minH: 3 },
    { i: 'table', x: 0, y: 5, w: 12, h: 4, minH: 3 },
    { i: 'activity', x: 0, y: 9, w: 12, h: 3, minH: 2 }
  ],
  tablet: [
    { i: 'stats', x: 0, y: 0, w: 6, h: 2, minH: 2 },
    { i: 'chart', x: 6, y: 0, w: 6, h: 2, minH: 2 },
    { i: 'table', x: 0, y: 2, w: 8, h: 4, minH: 3 },
    { i: 'activity', x: 8, y: 2, w: 4, h: 4, minH: 2 }
  ],
  desktop: [
    { i: 'stats', x: 0, y: 0, w: 3, h: 2, minH: 2 },
    { i: 'chart', x: 3, y: 0, w: 6, h: 3, minH: 3 },
    { i: 'table', x: 9, y: 0, w: 3, h: 3, minH: 2 },
    { i: 'activity', x: 0, y: 3, w: 12, h: 3, minH: 2 }
  ],
  wide: [
    { i: 'stats', x: 0, y: 0, w: 3, h: 2, minH: 2 },
    { i: 'chart', x: 3, y: 0, w: 5, h: 3, minH: 3 },
    { i: 'table', x: 8, y: 0, w: 4, h: 3, minH: 2 },
    { i: 'activity', x: 0, y: 3, w: 12, h: 2, minH: 2 }
  ]
};

const defaultPreferences: LayoutPreferences = {
  sidebarOpen: true,
  sidebarWidth: 280,
  sidebarCollapsed: false,
  sidebarPinned: true,
  headerHeight: 64,
  compactMode: false,
  animationsEnabled: true,
  density: 'normal',
  viewMode: 'dashboard',
  layoutLocked: false
};

export const useLayoutStore = create<LayoutState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        ...defaultPreferences,
        gridLayouts: defaultGridLayouts,
        currentBreakpoint: 'desktop',
        isDragging: false,
        draggedItem: null,
        
        // Actions - Sidebar
        setSidebarCollapsed: (collapsed) =>
          set((state) => {
            state.sidebarCollapsed = collapsed;
            // Auto-save preference
            get().saveLayoutPreferences();
          }),
        
        setSidebarPinned: (pinned) =>
          set((state) => {
            state.sidebarPinned = pinned;
            get().saveLayoutPreferences();
          }),
        
        setSidebarWidth: (width) =>
          set((state) => {
            state.sidebarWidth = Math.max(200, Math.min(400, width));
            get().saveLayoutPreferences();
          }),
        
        toggleSidebar: () =>
          set((state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
            get().saveLayoutPreferences();
          }),
        
        // Actions - Grid
        updateGridLayout: (breakpoint, layout) =>
          set((state) => {
            state.gridLayouts[breakpoint] = layout;
            get().saveLayoutPreferences();
          }),
        
        setCurrentBreakpoint: (breakpoint) =>
          set((state) => {
            state.currentBreakpoint = breakpoint;
          }),
        
        resetGridLayout: (breakpoint) =>
          set((state) => {
            if (breakpoint) {
              state.gridLayouts[breakpoint] = defaultGridLayouts[breakpoint];
            } else {
              state.gridLayouts = defaultGridLayouts;
            }
            get().saveLayoutPreferences();
          }),
        
        // Actions - Preferences
        setCompactMode: (compact) =>
          set((state) => {
            state.compactMode = compact;
            get().saveLayoutPreferences();
          }),
        
        setAnimationsEnabled: (enabled) =>
          set((state) => {
            state.animationsEnabled = enabled;
            get().saveLayoutPreferences();
          }),
        
        setDensity: (density) =>
          set((state) => {
            state.density = density;
            get().saveLayoutPreferences();
          }),
        
        setLayoutLocked: (locked) =>
          set((state) => {
            state.layoutLocked = locked;
            get().saveLayoutPreferences();
          }),
        
        setViewMode: (mode) =>
          set((state) => {
            state.viewMode = mode;
            get().saveLayoutPreferences();
          }),
        
        setHeaderHeight: (height) =>
          set((state) => {
            state.headerHeight = Math.max(48, Math.min(80, height));
            get().saveLayoutPreferences();
          }),
        
        setSidebarOpen: (open) =>
          set((state) => {
            state.sidebarOpen = open;
          }),
        
        resetLayout: () => {
          set((state) => {
            Object.assign(state, defaultPreferences);
            state.gridLayouts = defaultGridLayouts;
          });
          get().saveLayoutPreferences();
        },
        
        // Actions - Drag
        setIsDragging: (dragging) =>
          set((state) => {
            state.isDragging = dragging;
          }),
        
        setDraggedItem: (item) =>
          set((state) => {
            state.draggedItem = item;
          }),
        
        // Actions - Persistence
        saveLayoutPreferences: async () => {
          const state = get();
          const preferences = {
            sidebarOpen: state.sidebarOpen,
            sidebarWidth: state.sidebarWidth,
            sidebarCollapsed: state.sidebarCollapsed,
            sidebarPinned: state.sidebarPinned,
            headerHeight: state.headerHeight,
            compactMode: state.compactMode,
            animationsEnabled: state.animationsEnabled,
            density: state.density,
            viewMode: state.viewMode,
            layoutLocked: state.layoutLocked,
            gridLayouts: state.gridLayouts
          };
          
          // Save to localStorage immediately
          localStorage.setItem('dashboardLayout', JSON.stringify(preferences));
          
          // TODO: Sync with backend API
          // await layoutService.savePreferences(preferences);
        },
        
        loadLayoutPreferences: async () => {
          try {
            // Load from localStorage first
            const stored = localStorage.getItem('dashboardLayout');
            if (stored) {
              const preferences = JSON.parse(stored);
              set((state) => {
                Object.assign(state, preferences);
              });
            }
            
            // TODO: Sync with backend API
            // const serverPrefs = await layoutService.getPreferences();
            // if (serverPrefs) { ... }
          } catch (error) {
            console.error('Failed to load layout preferences:', error);
          }
        },
        
        resetToDefaults: () =>
          set((state) => {
            Object.assign(state, defaultPreferences);
            state.gridLayouts = defaultGridLayouts;
            get().saveLayoutPreferences();
          })
      })),
      {
        name: 'dashboard-layout',
        partialize: (state) => ({
          sidebarOpen: state.sidebarOpen,
          sidebarCollapsed: state.sidebarCollapsed,
          sidebarPinned: state.sidebarPinned,
          sidebarWidth: state.sidebarWidth,
          compactMode: state.compactMode,
          density: state.density,
          viewMode: state.viewMode,
          animationsEnabled: state.animationsEnabled,
          layoutLocked: state.layoutLocked,
          gridLayouts: state.gridLayouts
        })
      }
    ),
    { name: 'layout-store' }
  )
);

// Selectors
export const selectSidebarCollapsed = (state: LayoutState) => state.sidebarCollapsed;
export const selectCurrentBreakpoint = (state: LayoutState) => state.currentBreakpoint;
export const selectGridLayout = (state: LayoutState) => state.gridLayouts[state.currentBreakpoint];
export const selectAnimationsEnabled = (state: LayoutState) => state.animationsEnabled;
export const selectDensity = (state: LayoutState) => state.density;

// Helper to get current sidebar width
export const getSidebarWidth = (collapsed: boolean, width: number) => {
  return collapsed ? 64 : width;
};