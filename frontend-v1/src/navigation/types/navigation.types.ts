/**
 * Navigation System Types
 * Tipos centrales para el sistema de navegación
 */

import { ReactNode } from 'react';

// ============= Menu Types =============
export interface MenuItem {
  id: string;
  label: string;
  path: string;
  icon?: ReactNode;
  permission?: string;
  badge?: {
    content: string | number;
    color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  };
  children?: MenuItem[];
  metadata?: {
    module: string;
    category?: string;
    priority?: number;
    searchable?: boolean;
  };
  disabled?: boolean;
  divider?: boolean;
}

// ============= Breadcrumb Types =============
export interface BreadcrumbItem {
  label: string;
  path: string;
  icon?: ReactNode;
  params?: Record<string, any>;
  metadata?: {
    module?: string;
    entity?: string;
    entityId?: string;
  };
}

// ============= Tab Types =============
export interface NavigationTab {
  id: string;
  label: string;
  path: string;
  icon?: ReactNode;
  closable?: boolean;
  dirty?: boolean;
  metadata?: any;
  order?: number;
}

// ============= Quick Action Types =============
export interface QuickAction {
  id: string;
  label: string;
  icon?: ReactNode;
  shortcut?: string;
  permission?: string;
  handler: () => void | Promise<void>;
  context?: 'global' | 'module' | 'page';
  priority?: number;
}

// ============= Search Types =============
export interface SearchResult {
  id: string;
  type: 'page' | 'action' | 'entity' | 'help' | 'setting';
  label: string;
  description?: string;
  icon?: ReactNode;
  path?: string;
  handler?: () => void | Promise<void>;
  score?: number;
  metadata?: any;
}

export interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  resultCount: number;
  selectedResult?: string;
}

// ============= Route Config Types =============
export interface RouteConfig {
  path: string;
  label: string;
  icon?: ReactNode;
  permission?: string;
  component?: ReactNode;
  layout?: 'default' | 'auth' | 'blank';
  metadata?: {
    module: string;
    breadcrumb?: boolean;
    searchable?: boolean;
    quickAction?: boolean;
    tabEnabled?: boolean;
  };
  children?: RouteConfig[];
}

// ============= Navigation State Types =============
export interface NavigationState {
  // Current navigation
  activeRoute: string;
  previousRoute?: string;
  
  // Breadcrumbs
  breadcrumbs: BreadcrumbItem[];
  
  // Tabs
  tabs: NavigationTab[];
  activeTabId?: string;
  maxTabs: number;
  
  // Menu
  menuItems: MenuItem[];
  menuCollapsed: boolean;
  expandedMenuItems: string[];
  
  // Quick Actions
  quickActions: QuickAction[];
  
  // Search
  searchHistory: SearchHistoryItem[];
  recentSearches: string[];
  commandPaletteOpen: boolean;
}

// ============= Permission State Types =============
export interface PermissionState {
  userPermissions: string[];
  rolePermissions: string[];
  effectivePermissions: Set<string>;
  permissionMatrix: Map<string, boolean>;
  lastSync: Date | null;
  isSyncing: boolean;
}

// ============= Module Registration =============
export interface NavigationModule {
  id: string;
  name: string;
  icon?: ReactNode;
  basePermission?: string;
  routes: RouteConfig[];
  menuItems: MenuItem[];
  quickActions?: QuickAction[];
  searchProviders?: SearchProvider[];
}

export interface SearchProvider {
  id: string;
  name: string;
  search: (query: string) => Promise<SearchResult[]>;
  priority?: number;
}