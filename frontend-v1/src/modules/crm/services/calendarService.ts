import axios from 'axios';
import { CalendarIntegration, AvailableSlot, CalendarEvent } from '../types/calendar.types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export class CalendarService {
  private static instance: CalendarService;
  
  private constructor() {}
  
  static getInstance(): CalendarService {
    if (!this.instance) {
      this.instance = new CalendarService();
    }
    return this.instance;
  }

  // OAuth Integration
  async initializeOAuth(provider: 'google' | 'outlook'): Promise<{ authUrl: string }> {
    const response = await axios.get(`${API_BASE}/crm/calendar/oauth/init`, {
      params: { provider }
    });
    return response.data;
  }

  // Handle OAuth callback
  async handleOAuthCallback(code: string, state: string): Promise<CalendarIntegration> {
    const response = await axios.get(`${API_BASE}/crm/calendar/oauth/callback`, {
      params: { code, state }
    });
    return response.data;
  }

  // Get all calendar integrations
  async getIntegrations(): Promise<CalendarIntegration[]> {
    const response = await axios.get(`${API_BASE}/crm/calendar/integrations`);
    return response.data;
  }

  // Sync calendar
  async syncCalendar(integrationId: number): Promise<{
    imported: number;
    exported: number;
    conflicts: any[];
  }> {
    const response = await axios.post(`${API_BASE}/crm/calendar/sync/${integrationId}`);
    return response.data;
  }

  // Get available slots
  async getAvailableSlots(
    startDate: string,
    endDate: string,
    duration: number,
    attendees?: string[]
  ): Promise<AvailableSlot[]> {
    const response = await axios.get(`${API_BASE}/crm/calendar/available-slots`, {
      params: { startDate, endDate, duration, attendees }
    });
    return response.data;
  }

  // Import external calendar events
  async importExternalEvents(
    integrationId: number,
    startDate?: string,
    endDate?: string
  ): Promise<{ imported: number; events: CalendarEvent[] }> {
    const response = await axios.post(
      `${API_BASE}/crm/calendar/integrations/${integrationId}/import`,
      { startDate, endDate }
    );
    return response.data;
  }

  // Export activities to external calendar
  async exportToCalendar(
    integrationId: number,
    activityIds: number[]
  ): Promise<{ exported: number; failed: number[] }> {
    const response = await axios.post(
      `${API_BASE}/crm/calendar/integrations/${integrationId}/export`,
      { activityIds }
    );
    return response.data;
  }

  // Remove calendar integration
  async removeIntegration(integrationId: number): Promise<void> {
    await axios.delete(`${API_BASE}/crm/calendar/integrations/${integrationId}`);
  }

  // Update integration settings
  async updateIntegrationSettings(
    integrationId: number,
    settings: {
      syncEnabled?: boolean;
      syncDirection?: 'import' | 'export' | 'both';
      autoSync?: boolean;
      conflictResolution?: 'local' | 'remote' | 'manual';
    }
  ): Promise<CalendarIntegration> {
    const response = await axios.put(
      `${API_BASE}/crm/calendar/integrations/${integrationId}/settings`,
      settings
    );
    return response.data;
  }

  // Get sync history
  async getSyncHistory(
    integrationId?: number,
    limit: number = 50
  ): Promise<any[]> {
    const response = await axios.get(`${API_BASE}/crm/calendar/sync-history`, {
      params: { integrationId, limit }
    });
    return response.data;
  }

  // Resolve sync conflict
  async resolveSyncConflict(
    conflictId: string,
    resolution: 'keep_local' | 'keep_remote' | 'merge',
    mergedData?: any
  ): Promise<void> {
    await axios.post(`${API_BASE}/crm/calendar/conflicts/${conflictId}/resolve`, {
      resolution,
      mergedData
    });
  }

  // Get calendar preferences
  async getPreferences(): Promise<any> {
    const response = await axios.get(`${API_BASE}/crm/calendar/preferences`);
    return response.data;
  }

  // Update calendar preferences
  async updatePreferences(preferences: {
    defaultView?: 'month' | 'week' | 'day' | 'agenda';
    weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    workingHours?: { start: string; end: string };
    timezone?: string;
    defaultReminders?: number[];
  }): Promise<any> {
    const response = await axios.put(`${API_BASE}/crm/calendar/preferences`, preferences);
    return response.data;
  }
}

export default CalendarService.getInstance();