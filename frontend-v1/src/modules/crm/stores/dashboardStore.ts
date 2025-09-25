import { create } from 'zustand';
import dashboardService, { DashboardConfiguration, DashboardWidget } from '../services/dashboardService';
import kpiService, { KpiDefinition, KpiSnapshot } from '../services/kpiService';

interface DashboardState {
  dashboards: DashboardConfiguration[];
  currentDashboard: DashboardConfiguration | null;
  widgets: DashboardWidget[];
  kpis: KpiDefinition[];
  kpiDashboard: any;
  kpiSnapshots: Record<number, KpiSnapshot[]>;
  loading: boolean;
  error: string | null;

  // Dashboard actions
  fetchDashboards: () => Promise<void>;
  selectDashboard: (id: number) => Promise<void>;
  createDashboard: (dashboard: DashboardConfiguration) => Promise<void>;
  updateDashboard: (id: number, updates: Partial<DashboardConfiguration>) => Promise<void>;
  deleteDashboard: (id: number) => Promise<void>;
  cloneDashboard: (id: number, name: string) => Promise<void>;
  setDefaultDashboard: (id: number) => Promise<void>;

  // Widget actions
  addWidget: (dashboardId: number, widget: DashboardWidget) => Promise<void>;
  updateWidget: (widgetId: number, updates: Partial<DashboardWidget>) => Promise<void>;
  deleteWidget: (widgetId: number) => Promise<void>;
  updateWidgetPositions: (positions: Array<{ id: number; position_x: number; position_y: number }>) => Promise<void>;

  // KPI actions
  fetchKpis: () => Promise<void>;
  fetchKpiDashboard: () => Promise<void>;
  calculateKpi: (kpiId: number) => Promise<void>;
  fetchKpiTrends: (kpiId: number, period?: string, days?: number) => Promise<void>;
  createKpiAlert: (kpiId: number, alertConfig: any) => Promise<void>;

  clearError: () => void;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboards: [],
  currentDashboard: null,
  widgets: [],
  kpis: [],
  kpiDashboard: null,
  kpiSnapshots: {},
  loading: false,
  error: null,

  // Dashboard actions
  fetchDashboards: async () => {
    set({ loading: true, error: null });
    try {
      const dashboards = await dashboardService.getDashboards();
      set({ dashboards, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch dashboards', loading: false });
    }
  },

  selectDashboard: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const dashboard = await dashboardService.getDashboard(id);
      set({
        currentDashboard: dashboard,
        widgets: dashboard.widgets || [],
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to select dashboard', loading: false });
    }
  },

  createDashboard: async (dashboard: DashboardConfiguration) => {
    set({ loading: true, error: null });
    try {
      const newDashboard = await dashboardService.createDashboard(dashboard);
      const { dashboards } = get();
      set({
        dashboards: [...dashboards, newDashboard],
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to create dashboard', loading: false });
    }
  },

  updateDashboard: async (id: number, updates: Partial<DashboardConfiguration>) => {
    set({ loading: true, error: null });
    try {
      const updated = await dashboardService.updateDashboard(id, updates);
      const { dashboards, currentDashboard } = get();
      set({
        dashboards: dashboards.map(d => d.id === id ? updated : d),
        currentDashboard: currentDashboard?.id === id ? updated : currentDashboard,
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update dashboard', loading: false });
    }
  },

  deleteDashboard: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await dashboardService.deleteDashboard(id);
      const { dashboards, currentDashboard } = get();
      set({
        dashboards: dashboards.filter(d => d.id !== id),
        currentDashboard: currentDashboard?.id === id ? null : currentDashboard,
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete dashboard', loading: false });
    }
  },

  cloneDashboard: async (id: number, name: string) => {
    set({ loading: true, error: null });
    try {
      const cloned = await dashboardService.cloneDashboard(id, name);
      const { dashboards } = get();
      set({
        dashboards: [...dashboards, cloned],
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to clone dashboard', loading: false });
    }
  },

  setDefaultDashboard: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const updated = await dashboardService.setDefaultDashboard(id);
      const { dashboards } = get();
      set({
        dashboards: dashboards.map(d => ({
          ...d,
          is_default: d.id === id
        })),
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to set default dashboard', loading: false });
    }
  },

  // Widget actions
  addWidget: async (dashboardId: number, widget: DashboardWidget) => {
    set({ loading: true, error: null });
    try {
      const newWidget = await dashboardService.addWidget(dashboardId, widget);
      const { widgets } = get();
      set({
        widgets: [...widgets, newWidget],
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to add widget', loading: false });
    }
  },

  updateWidget: async (widgetId: number, updates: Partial<DashboardWidget>) => {
    set({ loading: true, error: null });
    try {
      const updated = await dashboardService.updateWidget(widgetId, updates);
      const { widgets } = get();
      set({
        widgets: widgets.map(w => w.id === widgetId ? updated : w),
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update widget', loading: false });
    }
  },

  deleteWidget: async (widgetId: number) => {
    set({ loading: true, error: null });
    try {
      await dashboardService.deleteWidget(widgetId);
      const { widgets } = get();
      set({
        widgets: widgets.filter(w => w.id !== widgetId),
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete widget', loading: false });
    }
  },

  updateWidgetPositions: async (positions) => {
    set({ loading: true, error: null });
    try {
      await dashboardService.updateWidgetPositions(positions);
      const { widgets } = get();
      const updatedWidgets = widgets.map(widget => {
        const position = positions.find(p => p.id === widget.id);
        return position ? { ...widget, ...position } : widget;
      });
      set({
        widgets: updatedWidgets,
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to update widget positions', loading: false });
    }
  },

  // KPI actions
  fetchKpis: async () => {
    set({ loading: true, error: null });
    try {
      const kpis = await kpiService.getKpis();
      set({ kpis, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch KPIs', loading: false });
    }
  },

  fetchKpiDashboard: async () => {
    set({ loading: true, error: null });
    try {
      const dashboard = await kpiService.getKpiDashboard();
      set({ kpiDashboard: dashboard, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch KPI dashboard', loading: false });
    }
  },

  calculateKpi: async (kpiId: number) => {
    set({ loading: true, error: null });
    try {
      const snapshot = await kpiService.calculateKpi(kpiId);
      // Refresh KPI dashboard after calculation
      const dashboard = await kpiService.getKpiDashboard();
      set({ kpiDashboard: dashboard, loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to calculate KPI', loading: false });
    }
  },

  fetchKpiTrends: async (kpiId: number, period = 'daily', days = 30) => {
    set({ loading: true, error: null });
    try {
      const trends = await kpiService.getKpiTrends(kpiId, period, days);
      const { kpiSnapshots } = get();
      set({
        kpiSnapshots: { ...kpiSnapshots, [kpiId]: trends },
        loading: false
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to fetch KPI trends', loading: false });
    }
  },

  createKpiAlert: async (kpiId: number, alertConfig: any) => {
    set({ loading: true, error: null });
    try {
      await kpiService.createKpiAlert(kpiId, alertConfig);
      set({ loading: false });
    } catch (error: any) {
      set({ error: error.message || 'Failed to create KPI alert', loading: false });
    }
  },

  clearError: () => set({ error: null })
}));