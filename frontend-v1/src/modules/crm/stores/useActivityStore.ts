import { create } from 'zustand';
import { Activity, ActivityFilter } from '../types/activity.types';
import { CalendarIntegration } from '../types/calendar.types';
import { AutomationRule } from '../types/automation.types';
import activityService from '../services/activityService';
import calendarService from '../services/calendarService';
import taskAutomationService from '../services/taskAutomationService';

interface ActivityStore {
  // State
  activities: Activity[];
  selectedActivity: Activity | null;
  filters: ActivityFilter;
  viewMode: 'list' | 'calendar' | 'kanban';
  loading: boolean;
  error: string | null;
  
  // Calendar Integration
  calendarIntegrations: CalendarIntegration[];
  selectedCalendar: CalendarIntegration | null;
  syncInProgress: boolean;
  
  // Task Automation
  automationRules: AutomationRule[];
  activeRules: number;
  
  // Actions
  fetchActivities: (filters?: ActivityFilter) => Promise<void>;
  createActivity: (activity: Partial<Activity>) => Promise<Activity>;
  updateActivity: (id: number, updates: Partial<Activity>) => Promise<void>;
  deleteActivity: (id: number) => Promise<void>;
  selectActivity: (activity: Activity | null) => void;
  setFilters: (filters: ActivityFilter) => void;
  setViewMode: (mode: 'list' | 'calendar' | 'kanban') => void;
  
  // Calendar Actions
  fetchIntegrations: () => Promise<void>;
  connectCalendar: (provider: 'google' | 'outlook') => Promise<void>;
  syncCalendar: (integrationId: number) => Promise<void>;
  removeIntegration: (integrationId: number) => Promise<void>;
  
  // Automation Actions
  fetchAutomationRules: () => Promise<void>;
  createRule: (rule: Partial<AutomationRule>) => Promise<void>;
  updateRule: (id: number, updates: Partial<AutomationRule>) => Promise<void>;
  deleteRule: (id: number) => Promise<void>;
  toggleRule: (id: number, enabled: boolean) => Promise<void>;
  
  // Bulk Actions
  bulkUpdateActivities: (ids: number[], updates: Partial<Activity>) => Promise<void>;
  completeActivity: (id: number) => Promise<void>;
  rescheduleActivity: (id: number, newDate: Date) => Promise<void>;
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  // Initial State
  activities: [],
  selectedActivity: null,
  filters: {},
  viewMode: 'list',
  loading: false,
  error: null,
  calendarIntegrations: [],
  selectedCalendar: null,
  syncInProgress: false,
  automationRules: [],
  activeRules: 0,

  // Activity Actions
  fetchActivities: async (filters?: ActivityFilter) => {
    set({ loading: true, error: null });
    try {
      const activities = await activityService.getActivities(filters || get().filters);
      set({ activities, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createActivity: async (activity: Partial<Activity>) => {
    set({ loading: true, error: null });
    try {
      const newActivity = await activityService.createActivity(activity);
      set(state => ({
        activities: [newActivity, ...state.activities],
        loading: false
      }));
      return newActivity;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updateActivity: async (id: number, updates: Partial<Activity>) => {
    set({ loading: true, error: null });
    try {
      const updatedActivity = await activityService.updateActivity(id, updates);
      set(state => ({
        activities: state.activities.map(a => a.id === id ? updatedActivity : a),
        selectedActivity: state.selectedActivity?.id === id ? updatedActivity : state.selectedActivity,
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deleteActivity: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await activityService.deleteActivity(id);
      set(state => ({
        activities: state.activities.filter(a => a.id !== id),
        selectedActivity: state.selectedActivity?.id === id ? null : state.selectedActivity,
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  selectActivity: (activity: Activity | null) => {
    set({ selectedActivity: activity });
  },

  setFilters: (filters: ActivityFilter) => {
    set({ filters });
    get().fetchActivities(filters);
  },

  setViewMode: (mode: 'list' | 'calendar' | 'kanban') => {
    set({ viewMode: mode });
  },

  // Calendar Integration Actions
  fetchIntegrations: async () => {
    try {
      const integrations = await calendarService.getIntegrations();
      set({ calendarIntegrations: integrations });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  connectCalendar: async (provider: 'google' | 'outlook') => {
    try {
      const { authUrl } = await calendarService.initializeOAuth(provider);
      window.location.href = authUrl;
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  syncCalendar: async (integrationId: number) => {
    set({ syncInProgress: true });
    try {
      await calendarService.syncCalendar(integrationId);
      await get().fetchActivities();
      set({ syncInProgress: false });
    } catch (error: any) {
      set({ error: error.message, syncInProgress: false });
    }
  },

  removeIntegration: async (integrationId: number) => {
    try {
      await calendarService.removeIntegration(integrationId);
      set(state => ({
        calendarIntegrations: state.calendarIntegrations.filter(i => i.id !== integrationId)
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // Task Automation Actions
  fetchAutomationRules: async () => {
    try {
      const rules = await taskAutomationService.getRules(true);
      const activeRules = rules.filter(r => r.isActive).length;
      set({ automationRules: rules, activeRules });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  createRule: async (rule: Partial<AutomationRule>) => {
    try {
      const newRule = await taskAutomationService.createRule(rule);
      set(state => ({
        automationRules: [...state.automationRules, newRule],
        activeRules: newRule.isActive ? state.activeRules + 1 : state.activeRules
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateRule: async (id: number, updates: Partial<AutomationRule>) => {
    try {
      const updatedRule = await taskAutomationService.updateRule(id, updates);
      set(state => {
        const oldRule = state.automationRules.find(r => r.id === id);
        let activeRules = state.activeRules;
        
        if (oldRule && oldRule.isActive !== updatedRule.isActive) {
          activeRules = updatedRule.isActive ? activeRules + 1 : activeRules - 1;
        }
        
        return {
          automationRules: state.automationRules.map(r => r.id === id ? updatedRule : r),
          activeRules
        };
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deleteRule: async (id: number) => {
    try {
      await taskAutomationService.deleteRule(id);
      set(state => {
        const rule = state.automationRules.find(r => r.id === id);
        return {
          automationRules: state.automationRules.filter(r => r.id !== id),
          activeRules: rule?.isActive ? state.activeRules - 1 : state.activeRules
        };
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  toggleRule: async (id: number, enabled: boolean) => {
    try {
      await taskAutomationService.toggleRule(id, enabled);
      set(state => ({
        automationRules: state.automationRules.map(r => 
          r.id === id ? { ...r, isActive: enabled } : r
        ),
        activeRules: enabled ? state.activeRules + 1 : state.activeRules - 1
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  // Bulk Actions
  bulkUpdateActivities: async (ids: number[], updates: Partial<Activity>) => {
    set({ loading: true, error: null });
    try {
      const updatedActivities = await activityService.bulkUpdateActivities(ids, updates);
      set(state => ({
        activities: state.activities.map(a => {
          const updated = updatedActivities.find(u => u.id === a.id);
          return updated || a;
        }),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  completeActivity: async (id: number) => {
    await get().updateActivity(id, { status: 'completed' });
  },

  rescheduleActivity: async (id: number, newDate: Date) => {
    await get().updateActivity(id, { dueDate: newDate });
  }
}));

export default useActivityStore;