import { useCallback } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';

export const useDashboard = () => {
  const {
    dashboards,
    currentDashboard,
    widgets,
    loading,
    error,
    fetchDashboards,
    selectDashboard,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    cloneDashboard,
    setDefaultDashboard,
    addWidget,
    updateWidget,
    deleteWidget,
    updateWidgetPositions,
    clearError
  } = useDashboardStore();

  const getPublicDashboards = useCallback(() => {
    return dashboards.filter(dashboard => dashboard.is_public);
  }, [dashboards]);

  const getPrivateDashboards = useCallback(() => {
    return dashboards.filter(dashboard => !dashboard.is_public);
  }, [dashboards]);

  const getDefaultDashboard = useCallback(() => {
    return dashboards.find(dashboard => dashboard.is_default);
  }, [dashboards]);

  const getDashboardById = useCallback((id: number) => {
    return dashboards.find(dashboard => dashboard.id === id);
  }, [dashboards]);

  const getWidgetsByType = useCallback((type: string) => {
    return widgets.filter(widget => widget.widget_type === type);
  }, [widgets]);

  const getVisibleWidgets = useCallback(() => {
    return widgets.filter(widget => widget.is_visible);
  }, [widgets]);

  const duplicateDashboard = useCallback(async (dashboardId: number, newName?: string) => {
    const dashboard = getDashboardById(dashboardId);
    if (!dashboard) {
      throw new Error('Dashboard not found');
    }

    const cloneName = newName || `${dashboard.name} (Copy)`;
    return cloneDashboard(dashboardId, cloneName);
  }, [cloneDashboard, getDashboardById]);

  const createEmptyDashboard = useCallback(async (name: string, description?: string) => {
    return createDashboard({
      name,
      description: description || '',
      is_public: false,
      layout: { columns: 12, rows: 'auto' },
      settings: {}
    });
  }, [createDashboard]);

  const addWidgetToDashboard = useCallback(async (
    dashboardId: number,
    widgetType: string,
    config: any = {}
  ) => {
    const widget = {
      widget_type: widgetType,
      title: config.title || widgetType,
      position_x: config.position_x || 0,
      position_y: config.position_y || 0,
      width: config.width || 4,
      height: config.height || 3,
      config: config.config || {},
      is_visible: config.is_visible !== undefined ? config.is_visible : true
    };

    return addWidget(dashboardId, widget);
  }, [addWidget]);

  const moveWidget = useCallback(async (
    widgetId: number,
    newPosition: { x: number; y: number }
  ) => {
    return updateWidget(widgetId, {
      position_x: newPosition.x,
      position_y: newPosition.y
    });
  }, [updateWidget]);

  const resizeWidget = useCallback(async (
    widgetId: number,
    newSize: { width: number; height: number }
  ) => {
    return updateWidget(widgetId, {
      width: newSize.width,
      height: newSize.height
    });
  }, [updateWidget]);

  const toggleWidgetVisibility = useCallback(async (widgetId: number) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;

    return updateWidget(widgetId, {
      is_visible: !widget.is_visible
    });
  }, [widgets, updateWidget]);

  const getDashboardStats = useCallback(() => {
    return {
      total: dashboards.length,
      public: dashboards.filter(d => d.is_public).length,
      private: dashboards.filter(d => !d.is_public).length,
      hasDefault: dashboards.some(d => d.is_default),
      totalWidgets: dashboards.reduce((sum, d) => sum + (d.widgets?.length || 0), 0),
      avgWidgetsPerDashboard: dashboards.length > 0
        ? Math.round(dashboards.reduce((sum, d) => sum + (d.widgets?.length || 0), 0) / dashboards.length)
        : 0
    };
  }, [dashboards]);

  const getWidgetStats = useCallback(() => {
    const typeCount = widgets.reduce((acc, widget) => {
      acc[widget.widget_type] = (acc[widget.widget_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: widgets.length,
      visible: widgets.filter(w => w.is_visible).length,
      hidden: widgets.filter(w => !w.is_visible).length,
      byType: typeCount
    };
  }, [widgets]);

  const optimizeDashboardLayout = useCallback(async (dashboardId: number) => {
    // Simple layout optimization - arrange widgets in a grid
    const dashboardWidgets = widgets.filter(w => w.dashboard_id === dashboardId);
    const positions = [];

    let currentX = 0;
    let currentY = 0;
    const maxColumns = 12;

    for (const widget of dashboardWidgets) {
      if (currentX + widget.width > maxColumns) {
        currentX = 0;
        currentY += 1;
      }

      positions.push({
        id: widget.id,
        position_x: currentX,
        position_y: currentY
      });

      currentX += widget.width;
    }

    return updateWidgetPositions(positions);
  }, [widgets, updateWidgetPositions]);

  const exportDashboard = useCallback((dashboardId: number) => {
    const dashboard = getDashboardById(dashboardId);
    if (!dashboard) return null;

    const dashboardWidgets = widgets.filter(w => w.dashboard_id === dashboardId);

    return {
      dashboard: {
        name: dashboard.name,
        description: dashboard.description,
        layout: dashboard.layout,
        settings: dashboard.settings
      },
      widgets: dashboardWidgets.map(widget => ({
        widget_type: widget.widget_type,
        title: widget.title,
        position_x: widget.position_x,
        position_y: widget.position_y,
        width: widget.width,
        height: widget.height,
        config: widget.config,
        is_visible: widget.is_visible
      }))
    };
  }, [dashboards, widgets, getDashboardById]);

  const importDashboard = useCallback(async (dashboardConfig: any) => {
    // Create the dashboard
    const newDashboard = await createDashboard({
      name: dashboardConfig.dashboard.name,
      description: dashboardConfig.dashboard.description,
      is_public: false,
      layout: dashboardConfig.dashboard.layout,
      settings: dashboardConfig.dashboard.settings
    });

    // Add widgets
    for (const widgetConfig of dashboardConfig.widgets) {
      await addWidget(newDashboard.id, widgetConfig);
    }

    return newDashboard;
  }, [createDashboard, addWidget]);

  const searchDashboards = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return dashboards;

    const term = searchTerm.toLowerCase();
    return dashboards.filter(dashboard =>
      dashboard.name.toLowerCase().includes(term) ||
      dashboard.description?.toLowerCase().includes(term)
    );
  }, [dashboards]);

  const sortDashboards = useCallback((
    sortBy: 'name' | 'created_at' | 'updated_at',
    direction: 'asc' | 'desc' = 'desc'
  ) => {
    return [...dashboards].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortBy === 'created_at' || sortBy === 'updated_at') {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [dashboards]);

  const canEditDashboard = useCallback((dashboardId: number) => {
    const dashboard = getDashboardById(dashboardId);
    if (!dashboard) return false;

    // Add your authorization logic here
    // For now, assume all dashboards can be edited
    return true;
  }, [getDashboardById]);

  const canDeleteDashboard = useCallback((dashboardId: number) => {
    const dashboard = getDashboardById(dashboardId);
    if (!dashboard) return false;

    // Prevent deletion of default dashboard
    if (dashboard.is_default) return false;

    // Add your authorization logic here
    return true;
  }, [getDashboardById]);

  return {
    // Data
    dashboards,
    currentDashboard,
    widgets,
    loading,
    error,

    // Basic dashboard actions
    fetchDashboards,
    selectDashboard,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    duplicateDashboard,
    setDefaultDashboard,
    createEmptyDashboard,
    clearError,

    // Widget actions
    addWidget,
    updateWidget,
    deleteWidget,
    addWidgetToDashboard,
    moveWidget,
    resizeWidget,
    toggleWidgetVisibility,
    updateWidgetPositions,

    // Data retrieval
    getPublicDashboards,
    getPrivateDashboards,
    getDefaultDashboard,
    getDashboardById,
    getWidgetsByType,
    getVisibleWidgets,

    // Utilities
    getDashboardStats,
    getWidgetStats,
    optimizeDashboardLayout,
    exportDashboard,
    importDashboard,
    searchDashboards,
    sortDashboards,
    canEditDashboard,
    canDeleteDashboard
  };
};