import axios from 'axios';
import { Activity, ActivityFilter, RecurringActivityConfig, ActivityComment } from '../types/activity.types';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export class ActivityService {
  private static instance: ActivityService;
  
  private constructor() {}
  
  static getInstance(): ActivityService {
    if (!this.instance) {
      this.instance = new ActivityService();
    }
    return this.instance;
  }

  // Get all activities with filters
  async getActivities(filters?: ActivityFilter): Promise<Activity[]> {
    const response = await axios.get(`${API_BASE}/crm/activities`, { params: filters });
    return response.data;
  }

  // Get single activity
  async getActivityById(id: number): Promise<Activity> {
    const response = await axios.get(`${API_BASE}/crm/activities/${id}`);
    return response.data;
  }

  // Create activity
  async createActivity(activity: Partial<Activity>): Promise<Activity> {
    const response = await axios.post(`${API_BASE}/crm/activities`, activity);
    return response.data;
  }

  // Update activity
  async updateActivity(id: number, updates: Partial<Activity>): Promise<Activity> {
    const response = await axios.put(`${API_BASE}/crm/activities/${id}`, updates);
    return response.data;
  }

  // Delete activity
  async deleteActivity(id: number): Promise<void> {
    await axios.delete(`${API_BASE}/crm/activities/${id}`);
  }

  // Bulk update activities
  async bulkUpdateActivities(ids: number[], updates: Partial<Activity>): Promise<Activity[]> {
    const response = await axios.put(`${API_BASE}/crm/activities/bulk`, { ids, updates });
    return response.data;
  }

  // Create recurring activity
  async createRecurringActivity(
    activity: Partial<Activity>,
    config: RecurringActivityConfig
  ): Promise<Activity[]> {
    const response = await axios.post(`${API_BASE}/crm/activities/recurring`, {
      activity,
      recurringConfig: config
    });
    return response.data;
  }

  // Get activities for calendar view
  async getCalendarActivities(
    startDate: string,
    endDate: string,
    filters?: ActivityFilter
  ): Promise<Activity[]> {
    const response = await axios.get(`${API_BASE}/crm/calendar/view`, {
      params: { startDate, endDate, ...filters }
    });
    return response.data;
  }

  // Complete activity
  async completeActivity(id: number): Promise<Activity> {
    const response = await axios.post(`${API_BASE}/crm/activities/${id}/complete`);
    return response.data;
  }

  // Reschedule activity
  async rescheduleActivity(
    id: number,
    newStartTime: string,
    newEndTime?: string
  ): Promise<Activity> {
    const response = await axios.post(`${API_BASE}/crm/activities/${id}/reschedule`, {
      startTime: newStartTime,
      endTime: newEndTime
    });
    return response.data;
  }

  // Add comment to activity
  async addComment(activityId: number, comment: string): Promise<ActivityComment> {
    const response = await axios.post(`${API_BASE}/crm/activities/${activityId}/comments`, {
      comment
    });
    return response.data;
  }

  // Get activity comments
  async getComments(activityId: number): Promise<ActivityComment[]> {
    const response = await axios.get(`${API_BASE}/crm/activities/${activityId}/comments`);
    return response.data;
  }

  // Clone activity
  async cloneActivity(id: number): Promise<Activity> {
    const response = await axios.post(`${API_BASE}/crm/activities/${id}/clone`);
    return response.data;
  }

  // Get activity templates
  async getTemplates(): Promise<any[]> {
    const response = await axios.get(`${API_BASE}/crm/activities/templates`);
    return response.data;
  }

  // Create activity from template
  async createFromTemplate(templateId: number, data: Partial<Activity>): Promise<Activity> {
    const response = await axios.post(`${API_BASE}/crm/activities/templates/${templateId}/apply`, data);
    return response.data;
  }

  // Get activity stats
  async getStats(filters?: ActivityFilter): Promise<any> {
    const response = await axios.get(`${API_BASE}/crm/activities/stats`, { params: filters });
    return response.data;
  }

  // Export activities
  async exportActivities(format: 'csv' | 'excel', filters?: ActivityFilter): Promise<Blob> {
    const response = await axios.get(`${API_BASE}/crm/activities/export`, {
      params: { format, ...filters },
      responseType: 'blob'
    });
    return response.data;
  }
}

export default ActivityService.getInstance();