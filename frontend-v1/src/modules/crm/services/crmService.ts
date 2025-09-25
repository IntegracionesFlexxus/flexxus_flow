/**
 * CRM Service - Sprint 15
 * Centralized API service for CRM module
 */

import { api } from '@/shared/services/api';
import type { Contact, ContactFilters, ContactFormData, Activity, ActivityFilters, ActivityFormData, ActivityMetrics } from '../types';

class CRMService {
  /**
   * Contact Management
   */
  contacts = {
    async getContacts(filters?: ContactFilters): Promise<{ data: Contact[]; total: number; page: number; totalPages: number }> {
      const { data } = await api.get('/crm/contacts', { params: filters });
      return data;
    },

    async getContactById(id: number): Promise<Contact> {
      const { data } = await api.get(`/crm/contacts/${id}`);
      return data.data;
    },

    async createContact(contact: ContactFormData): Promise<Contact> {
      const { data } = await api.post('/crm/contacts', contact);
      return data.data;
    },

    async updateContact(id: number, updates: Partial<Contact>): Promise<Contact> {
      const { data } = await api.put(`/crm/contacts/${id}`, updates);
      return data.data;
    },

    async deleteContact(id: number): Promise<void> {
      await api.delete(`/crm/contacts/${id}`);
    },

    async getContactsByAccount(accountId: number): Promise<Contact[]> {
      const { data } = await api.get(`/crm/contacts/account/${accountId}`);
      return data.data;
    },

    async setPrimaryContact(id: number): Promise<Contact> {
      const { data } = await api.put(`/crm/contacts/${id}/primary`);
      return data.data;
    },

    async getContactHierarchy(id: number): Promise<any> {
      const { data } = await api.get(`/crm/contacts/${id}/hierarchy`);
      return data.data;
    },

    async findDuplicates(email?: string, phone?: string): Promise<Contact[]> {
      const { data } = await api.get('/crm/contacts/duplicates', {
        params: { email, phone }
      });
      return data.data;
    },

    async mergeContacts(primaryId: number, duplicateIds: number[]): Promise<Contact> {
      const { data } = await api.post('/crm/contacts/merge', {
        primary_id: primaryId,
        duplicate_ids: duplicateIds
      });
      return data.data;
    },

    async getBirthdayContacts(month?: number): Promise<Contact[]> {
      const { data } = await api.get('/crm/contacts/birthdays', {
        params: { month }
      });
      return data.data;
    }
  };

  /**
   * Activity Management
   */
  activities = {
    async getActivities(filters?: ActivityFilters): Promise<{ data: Activity[]; total: number; page: number; totalPages: number }> {
      const { data } = await api.get('/crm/activities', { params: filters });
      return data;
    },

    async getActivityById(id: number): Promise<Activity> {
      const { data } = await api.get(`/crm/activities/${id}`);
      return data.data;
    },

    async createActivity(activity: ActivityFormData): Promise<Activity> {
      const { data } = await api.post('/crm/activities', activity);
      return data.data;
    },

    async updateActivity(id: number, updates: Partial<Activity>): Promise<Activity> {
      const { data } = await api.put(`/crm/activities/${id}`, updates);
      return data.data;
    },

    async deleteActivity(id: number): Promise<void> {
      await api.delete(`/crm/activities/${id}`);
    },

    async completeActivity(id: number, outcome: string): Promise<Activity> {
      const { data } = await api.post(`/crm/activities/${id}/complete`, { outcome });
      return data.data;
    },

    async rescheduleActivity(id: number, dueDate: string, reminderDate?: string): Promise<Activity> {
      const { data } = await api.post(`/crm/activities/${id}/reschedule`, {
        due_date: dueDate,
        reminder_date: reminderDate
      });
      return data.data;
    },

    async getOverdueActivities(assignedTo?: number): Promise<Activity[]> {
      const { data } = await api.get('/crm/activities/overdue', {
        params: { assignedTo }
      });
      return data.data;
    },

    async getActivitiesWithReminders(): Promise<Activity[]> {
      const { data } = await api.get('/crm/activities/reminders');
      return data.data;
    },

    async getActivityMetrics(dateRange?: { start: string; end: string }): Promise<ActivityMetrics> {
      const { data } = await api.get('/crm/activities/metrics', {
        params: dateRange ? { startDate: dateRange.start, endDate: dateRange.end } : undefined
      });
      return data.data;
    },

    async getMyActivities(): Promise<Activity[]> {
      const { data } = await api.get('/crm/activities/my');
      return data.data;
    },

    async getUserActivities(userId: number): Promise<Activity[]> {
      const { data } = await api.get(`/crm/activities/user/${userId}`);
      return data.data;
    },

    async getEntityTimeline(entityType: string, entityId: number): Promise<Activity[]> {
      const { data } = await api.get(`/crm/activities/timeline/${entityType}/${entityId}`);
      return data.data;
    },

    async bulkUpdateStatus(activityIds: number[], status: string): Promise<{ updatedCount: number }> {
      const { data } = await api.post('/crm/activities/bulk/status', {
        activityIds,
        status
      });
      return data.data;
    }
  };

  /**
   * Reference Data
   */
  referenceData = {
    async getIndustries(): Promise<any[]> {
      const { data } = await api.get('/crm/reference/industries');
      return data.data;
    },

    async getLeadSources(): Promise<any[]> {
      const { data } = await api.get('/crm/reference/lead-sources');
      return data.data;
    },

    async getStages(): Promise<any[]> {
      const { data } = await api.get('/crm/reference/stages');
      return data.data;
    }
  };
}

export const crmService = new CRMService();