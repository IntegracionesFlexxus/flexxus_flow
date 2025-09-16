/**
 * Navigation Service
 * Lógica central de navegación
 */

import { NavigationTab, BreadcrumbItem, MenuItem } from '@navigation/types/navigation.types';
import { useNavigationStore } from '@navigation/stores/navigationStore';
import { checkPermission } from '@navigation/stores/permissionStore';

class NavigationService {
  private static instance: NavigationService;
  
  private constructor() {}
  
  static getInstance(): NavigationService {
    if (!NavigationService.instance) {
      NavigationService.instance = new NavigationService();
    }
    return NavigationService.instance;
  }
  
  /**
   * Navigate to a route and update state
   */
  navigateTo(path: string, options?: { 
    openInTab?: boolean; 
    replaceTab?: boolean;
    metadata?: any;
  }): void {
    const store = useNavigationStore.getState();
    
    // Update active route
    store.setActiveRoute(path);
    
    // Handle tab navigation if requested
    if (options?.openInTab) {
      const tabId = this.generateTabId(path);
      const tab: NavigationTab = {
        id: tabId,
        label: this.getRouteLabel(path),
        path,
        closable: true,
        metadata: options.metadata
      };
      
      if (options.replaceTab && store.activeTabId) {
        store.closeTab(store.activeTabId);
      }
      
      store.openTab(tab);
    }
    
    // Update breadcrumbs
    this.updateBreadcrumbs(path);
  }
  
  /**
   * Generate breadcrumbs from path
   */
  updateBreadcrumbs(path: string): void {
    const store = useNavigationStore.getState();
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];
    
    // Always add home
    breadcrumbs.push({
      label: 'Dashboard',
      path: '/dashboard'
    });
    
    // Build breadcrumbs from path segments
    let currentPath = '';
    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Skip dashboard since we already have it
      if (segment === 'dashboard') return;
      
      breadcrumbs.push({
        label: this.formatSegmentLabel(segment),
        path: currentPath,
        metadata: {
          module: segments[0],
          entity: segments[1],
          entityId: segments[2]
        }
      });
    });
    
    store.setBreadcrumbs(breadcrumbs);
  }
  
  /**
   * Filter menu items by permissions
   */
  filterMenuByPermissions(menuItems: MenuItem[]): MenuItem[] {
    return menuItems
      .filter(item => {
        // Check permission if defined
        if (item.permission) {
          return checkPermission(item.permission);
        }
        return true;
      })
      .map(item => {
        // Recursively filter children
        if (item.children) {
          return {
            ...item,
            children: this.filterMenuByPermissions(item.children)
          };
        }
        return item;
      })
      .filter(item => {
        // Remove items with no accessible children
        if (item.children && item.children.length === 0) {
          return false;
        }
        return true;
      });
  }
  
  /**
   * Open a new tab or activate existing
   */
  openTab(path: string, label?: string, metadata?: any): void {
    const store = useNavigationStore.getState();
    const tabId = this.generateTabId(path);
    
    // Check if tab already exists
    const existingTab = store.tabs.find(t => t.id === tabId);
    if (existingTab) {
      store.setActiveTab(tabId);
      return;
    }
    
    // Create new tab
    const tab: NavigationTab = {
      id: tabId,
      label: label || this.getRouteLabel(path),
      path,
      closable: true,
      metadata
    };
    
    store.openTab(tab);
  }
  
  /**
   * Close tab with confirmation if dirty
   */
  async closeTab(tabId: string): Promise<boolean> {
    const store = useNavigationStore.getState();
    const tab = store.tabs.find(t => t.id === tabId);
    
    if (!tab) return false;
    
    // Check if tab is dirty
    if (tab.dirty) {
      const confirmed = await this.confirmCloseTab(tab);
      if (!confirmed) return false;
    }
    
    store.closeTab(tabId);
    return true;
  }
  
  /**
   * Close all tabs with confirmation
   */
  async closeAllTabs(): Promise<boolean> {
    const store = useNavigationStore.getState();
    const dirtyTabs = store.tabs.filter(t => t.dirty);
    
    if (dirtyTabs.length > 0) {
      const confirmed = await this.confirmCloseMultipleTabs(dirtyTabs);
      if (!confirmed) return false;
    }
    
    store.closeAllTabs();
    return true;
  }
  
  /**
   * Get previous route
   */
  goBack(): void {
    const store = useNavigationStore.getState();
    if (store.previousRoute) {
      this.navigateTo(store.previousRoute);
    }
  }
  
  // ============= Private Helpers =============
  
  private generateTabId(path: string): string {
    return path.replace(/\//g, '-').replace(/^-/, '') || 'home';
  }
  
  private getRouteLabel(path: string): string {
    const segments = path.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || 'Home';
    return this.formatSegmentLabel(lastSegment);
  }
  
  private formatSegmentLabel(segment: string): string {
    // Convert kebab-case or snake_case to Title Case
    return segment
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }
  
  private async confirmCloseTab(tab: NavigationTab): Promise<boolean> {
    // This would typically show a confirmation dialog
    // For now, return true
    return confirm(`Tab "${tab.label}" has unsaved changes. Close anyway?`);
  }
  
  private async confirmCloseMultipleTabs(tabs: NavigationTab[]): Promise<boolean> {
    return confirm(`${tabs.length} tabs have unsaved changes. Close all anyway?`);
  }
}

// Export singleton instance
export const navigationService = NavigationService.getInstance();