/**
 * LayoutService - Dashboard Layout System
 * Service para persistencia de preferencias de layout
 */

import { apiService } from '@/services/apiService';
import { LayoutPreferences } from '@/stores/layoutStore';
import { ThemePreferences } from '@/stores/themeStore';

export interface DashboardPreferences {
  layout: LayoutPreferences;
  theme: ThemePreferences;
  widgets?: WidgetPreferences[];
  lastModified?: string;
  version?: string;
}

export interface WidgetPreferences {
  id: string;
  type: string;
  position: { x: number; y: number; w: number; h: number };
  settings?: Record<string, any>;
  visible: boolean;
}

class LayoutService {
  private readonly STORAGE_KEY = 'dashboard_preferences';
  private readonly API_ENDPOINT = '/api/user/preferences/dashboard';
  
  /**
   * Load preferences from localStorage first, then sync with backend
   */
  async loadPreferences(): Promise<DashboardPreferences | null> {
    try {
      // First, get from localStorage for immediate response
      const localData = this.getLocalPreferences();
      
      // Then, fetch from backend and update if different
      this.syncWithBackend();
      
      return localData;
    } catch (error) {
      console.error('Error loading preferences:', error);
      return null;
    }
  }
  
  /**
   * Save preferences to both localStorage and backend
   */
  async savePreferences(preferences: DashboardPreferences): Promise<void> {
    try {
      // Add metadata
      preferences.lastModified = new Date().toISOString();
      preferences.version = '1.0.0';
      
      // Save to localStorage first
      this.saveLocalPreferences(preferences);
      
      // Then save to backend
      await this.saveToBackend(preferences);
    } catch (error) {
      console.error('Error saving preferences:', error);
      // Even if backend save fails, local storage is updated
      throw error;
    }
  }
  
  /**
   * Reset preferences to defaults
   */
  async resetPreferences(): Promise<void> {
    try {
      // Clear localStorage
      localStorage.removeItem(this.STORAGE_KEY);
      
      // Clear backend preferences
      await apiService.delete(this.API_ENDPOINT);
    } catch (error) {
      console.error('Error resetting preferences:', error);
      throw error;
    }
  }
  
  /**
   * Get preferences from localStorage
   */
  private getLocalPreferences(): DashboardPreferences | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }
  
  /**
   * Save preferences to localStorage
   */
  private saveLocalPreferences(preferences: DashboardPreferences): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }
  
  /**
   * Sync with backend (runs in background)
   */
  private async syncWithBackend(): Promise<void> {
    try {
      const response = await apiService.get<{ data: DashboardPreferences }>(
        this.API_ENDPOINT
      );
      
      if (response.data?.data) {
        const backendData = response.data.data;
        const localData = this.getLocalPreferences();
        
        // If backend is newer, update local
        if (!localData || 
            (backendData.lastModified && localData.lastModified &&
             new Date(backendData.lastModified) > new Date(localData.lastModified))) {
          this.saveLocalPreferences(backendData);
        }
      }
    } catch (error) {
      // Silently fail - we already have local data
      console.debug('Backend sync failed, using local data:', error);
    }
  }
  
  /**
   * Save preferences to backend
   */
  private async saveToBackend(preferences: DashboardPreferences): Promise<void> {
    try {
      await apiService.put(this.API_ENDPOINT, preferences);
    } catch (error) {
      // Log but don't throw - local storage is already updated
      console.error('Failed to save to backend:', error);
    }
  }
  
  /**
   * Export preferences as JSON
   */
  exportPreferences(): string {
    const preferences = this.getLocalPreferences();
    return JSON.stringify(preferences, null, 2);
  }
  
  /**
   * Import preferences from JSON
   */
  async importPreferences(json: string): Promise<void> {
    try {
      const preferences = JSON.parse(json) as DashboardPreferences;
      await this.savePreferences(preferences);
    } catch (error) {
      console.error('Error importing preferences:', error);
      throw new Error('Invalid preferences format');
    }
  }
  
  /**
   * Get default preferences
   */
  getDefaultPreferences(): DashboardPreferences {
    return {
      layout: {
        sidebarOpen: true,
        sidebarCollapsed: false,
        sidebarWidth: 280,
        sidebarPinned: true,
        headerHeight: 64,
        compactMode: false,
        density: 'normal',
        viewMode: 'dashboard',
        animationsEnabled: true,
        layoutLocked: false
      },
      theme: {
        mode: 'system',
        customColors: {
          primary: '#1976d2',
          secondary: '#dc004e'
        },
        fontSize: 'medium',
        borderRadius: 8,
        spacing: 8,
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        glassmorphism: false
      },
      widgets: [
        {
          id: 'stats',
          type: 'stats',
          position: { x: 0, y: 0, w: 12, h: 2 },
          visible: true
        },
        {
          id: 'chart',
          type: 'chart',
          position: { x: 0, y: 2, w: 8, h: 4 },
          visible: true
        },
        {
          id: 'activity',
          type: 'activity',
          position: { x: 8, y: 2, w: 4, h: 4 },
          visible: true
        }
      ],
      lastModified: new Date().toISOString(),
      version: '1.0.0'
    };
  }
  
  /**
   * Check if user has custom preferences
   */
  hasCustomPreferences(): boolean {
    return this.getLocalPreferences() !== null;
  }
  
  /**
   * Get preferences for specific component
   */
  getComponentPreferences<T = any>(componentId: string): T | null {
    const preferences = this.getLocalPreferences();
    if (preferences?.widgets) {
      const widget = preferences.widgets.find(w => w.id === componentId);
      return widget?.settings as T || null;
    }
    return null;
  }
  
  /**
   * Save preferences for specific component
   */
  async saveComponentPreferences(
    componentId: string, 
    settings: Record<string, any>
  ): Promise<void> {
    const preferences = this.getLocalPreferences() || this.getDefaultPreferences();
    
    if (!preferences.widgets) {
      preferences.widgets = [];
    }
    
    const widgetIndex = preferences.widgets.findIndex(w => w.id === componentId);
    if (widgetIndex >= 0) {
      preferences.widgets[widgetIndex].settings = settings;
    } else {
      preferences.widgets.push({
        id: componentId,
        type: 'custom',
        position: { x: 0, y: 0, w: 4, h: 2 },
        settings,
        visible: true
      });
    }
    
    await this.savePreferences(preferences);
  }
}

// Export singleton instance
export const layoutService = new LayoutService();

// Export types
export type { DashboardPreferences, WidgetPreferences };