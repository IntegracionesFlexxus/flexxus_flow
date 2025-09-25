/**
 * Lead Service
 *
 * OMNICHANNEL STATUS: Adapted for missing module
 * See: FRONTEND_OMNICHANNEL_ADAPTATIONS.md for pending changes
 *
 * TODO: OMNICHANNEL - Add real-time sync when module is ready
 */

import axios from 'axios';
import {
  ILead,
  ILeadsResponse,
  ILeadResponse,
  ILeadFilters,
  ILeadFormData,
  ILeadBulkAction,
  ILeadActivity,
  ILeadEngagement
} from '../types/lead.types';
import { isOmniChannelEnabled, shouldUseMockData } from '../config/features';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api/v1';
const CRM_API_URL = `${API_BASE_URL}/crm`;

// Create axios instance with default config
const api = axios.create({
  baseURL: CRM_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

class LeadService {
  // Get all leads with filters
  async getLeads(filters?: ILeadFilters & { page?: number; limit?: number }): Promise<ILeadsResponse> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              params.append(key, value.join(','));
            } else {
              params.append(key, value.toString());
            }
          }
        });
      }

      const response = await api.get<ILeadsResponse>(`/leads?${params}`);

      // Add mock/pending sync indicators if OmniChannel not available
      if (!isOmniChannelEnabled() && response.data.data) {
        response.data.data = response.data.data.map(lead => ({
          ...lead,
          manual_entry: lead.manual_entry ?? true,
          source_verified: lead.source_verified ?? false,
          pending_sync: !lead.source_verified
        }));
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }
  }

  // Get single lead by ID
  async getLead(id: number): Promise<ILead> {
    try {
      const response = await api.get<ILeadResponse>(`/leads/${id}`);
      const lead = response.data.data;

      // Add mock indicators if needed
      if (!isOmniChannelEnabled()) {
        lead.manual_entry = lead.manual_entry ?? true;
        lead.source_verified = lead.source_verified ?? false;
        lead.pending_sync = !lead.source_verified;
      }

      return lead;
    } catch (error) {
      console.error(`Error fetching lead ${id}:`, error);
      throw error;
    }
  }

  // Create new lead
  async createLead(data: ILeadFormData): Promise<ILead> {
    try {
      // TODO: OMNICHANNEL - Remove manual_entry flag when automated capture ready
      const leadData = {
        ...data,
        manual_entry: true,
        source_verified: false,
        source: data.source || 'manual'
      };

      const response = await api.post<ILeadResponse>('/leads', leadData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  }

  // Update lead
  async updateLead(id: number, data: Partial<ILead>): Promise<ILead> {
    try {
      const response = await api.put<ILeadResponse>(`/leads/${id}`, data);
      return response.data.data;
    } catch (error) {
      console.error(`Error updating lead ${id}:`, error);
      throw error;
    }
  }

  // Delete lead
  async deleteLead(id: number): Promise<void> {
    try {
      await api.delete(`/leads/${id}`);
    } catch (error) {
      console.error(`Error deleting lead ${id}:`, error);
      throw error;
    }
  }

  // Bulk update leads
  async bulkUpdateLeads(ids: number[], data: Partial<ILead>): Promise<void> {
    try {
      await api.patch('/leads/bulk', {
        lead_ids: ids,
        data
      });
    } catch (error) {
      console.error('Error bulk updating leads:', error);
      throw error;
    }
  }

  // Bulk actions on leads
  async performBulkAction(action: ILeadBulkAction): Promise<void> {
    try {
      await api.post('/leads/bulk-action', action);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      throw error;
    }
  }

  // Assign leads
  async assignLeads(leadIds: number[], userId: number): Promise<void> {
    try {
      await api.post('/leads/assign', {
        lead_ids: leadIds,
        user_id: userId
      });
    } catch (error) {
      console.error('Error assigning leads:', error);
      throw error;
    }
  }

  // Get lead activities
  async getLeadActivities(leadId: number): Promise<ILeadActivity[]> {
    try {
      const response = await api.get<{ data: ILeadActivity[] }>(`/leads/${leadId}/activities`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching activities for lead ${leadId}:`, error);
      throw error;
    }
  }

  // Get lead engagement data
  async getLeadEngagement(leadId: number): Promise<ILeadEngagement> {
    try {
      // TODO: OMNICHANNEL - Replace with real API call when available
      if (!isOmniChannelEnabled() || shouldUseMockData()) {
        // Return mock engagement data
        return {
          lead_id: leadId,
          email_opens: 0,
          email_clicks: 0,
          website_visits: 0,
          page_views: 0,
          form_submissions: 0,
          chat_interactions: 0,
          content_downloads: 0,
          social_interactions: 0,
          last_engagement_date: null,
          engagement_score: 0,
          is_mock_data: true
        };
      }

      const response = await api.get<{ data: ILeadEngagement }>(`/leads/${leadId}/engagement`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching engagement for lead ${leadId}:`, error);
      // Return mock data on error
      return {
        lead_id: leadId,
        email_opens: 0,
        email_clicks: 0,
        website_visits: 0,
        page_views: 0,
        form_submissions: 0,
        chat_interactions: 0,
        content_downloads: 0,
        social_interactions: 0,
        last_engagement_date: null,
        engagement_score: 0,
        is_mock_data: true
      };
    }
  }

  // Get lead score
  async getLeadScore(leadId: number): Promise<any> {
    try {
      const response = await api.get(`/leads/${leadId}/score`);
      return response.data.data;
    } catch (error) {
      console.error(`Error fetching score for lead ${leadId}:`, error);
      throw error;
    }
  }

  // Calculate lead score
  async calculateLeadScore(leadId: number): Promise<any> {
    try {
      const response = await api.post(`/leads/${leadId}/score`);
      return response.data.data;
    } catch (error) {
      console.error(`Error calculating score for lead ${leadId}:`, error);
      throw error;
    }
  }

  // Find duplicates
  async findDuplicates(leadId: number): Promise<any[]> {
    try {
      const response = await api.get(`/leads/${leadId}/duplicates`);
      return response.data.data;
    } catch (error) {
      console.error(`Error finding duplicates for lead ${leadId}:`, error);
      throw error;
    }
  }

  // Merge leads
  async mergeLeads(primaryLeadId: number, duplicateIds: number[]): Promise<void> {
    try {
      await api.post(`/leads/${primaryLeadId}/merge`, {
        duplicateIds
      });
    } catch (error) {
      console.error('Error merging leads:', error);
      throw error;
    }
  }

  // Convert lead
  async convertLead(leadId: number, conversionData: any): Promise<any> {
    try {
      const response = await api.post(`/leads/${leadId}/convert`, conversionData);
      return response.data.data;
    } catch (error) {
      console.error(`Error converting lead ${leadId}:`, error);
      throw error;
    }
  }

  // Get pending sync count
  async getPendingSyncCount(): Promise<number> {
    try {
      // TODO: OMNICHANNEL - Get real sync status
      if (!isOmniChannelEnabled()) {
        const response = await api.get('/leads/pending-sync/count');
        return response.data.count || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error fetching pending sync count:', error);
      return 0;
    }
  }

  // Force sync for a lead (when OmniChannel is ready)
  async forceSyncLead(leadId: number): Promise<void> {
    try {
      // TODO: OMNICHANNEL - Implement actual sync
      if (isOmniChannelEnabled()) {
        await api.post(`/leads/${leadId}/sync`);
      } else {
        console.log('OmniChannel not enabled - sync queued');
      }
    } catch (error) {
      console.error(`Error syncing lead ${leadId}:`, error);
      throw error;
    }
  }

  // Import leads from file
  async importLeads(file: File, options: any): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify(options));

      const response = await api.post('/leads/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error importing leads:', error);
      throw error;
    }
  }

  // Export leads
  async exportLeads(filters?: ILeadFilters): Promise<Blob> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await api.get(`/leads/export?${params}`, {
        responseType: 'blob'
      });

      return response.data;
    } catch (error) {
      console.error('Error exporting leads:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const leadService = new LeadService();

export default leadService;