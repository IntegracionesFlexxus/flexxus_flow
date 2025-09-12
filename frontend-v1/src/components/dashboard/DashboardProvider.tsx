/**
 * DashboardProvider - Dashboard Layout System
 * Context provider para el sistema de dashboard
 */

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useMemo, 
  useCallback,
  ReactNode 
} from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import { useLayoutStore, LayoutState } from '@/stores/layoutStore';
import { useThemeStore, ThemeState, detectSystemPreference } from '@/stores/themeStore';
import { useResponsive, ResponsiveResult } from '@/hooks/useResponsive';

// Dashboard Context Types
interface DashboardContextValue {
  layout: LayoutState;
  theme: ThemeState;
  responsive: ResponsiveResult;
  isLoading: boolean;
  error: Error | null;
  refreshPreferences: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
}

// Create Context
const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

// Query client instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 3,
      refetchOnWindowFocus: false
    }
  }
});

interface DashboardProviderProps {
  children: ReactNode;
  initialPreferences?: any;
  onPreferencesChange?: (preferences: any) => void;
}

/**
 * DashboardProvider Component
 */
export const DashboardProvider: React.FC<DashboardProviderProps> = ({
  children,
  initialPreferences,
  onPreferencesChange
}) => {
  const layout = useLayoutStore();
  const theme = useThemeStore();
  const responsive = useResponsive();
  
  // Initialize system theme preference
  useEffect(() => {
    const systemPreference = detectSystemPreference();
    theme.setSystemPreference(systemPreference);
    
    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      theme.setSystemPreference(e.matches ? 'dark' : 'light');
    };
    
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);
  
  // Apply theme on mount and changes
  useEffect(() => {
    theme.applyTheme();
  }, [theme.mode, theme.customColors, theme.fontSize, theme.borderRadius]);
  
  // Load preferences on mount
  useEffect(() => {
    layout.loadLayoutPreferences();
    
    if (initialPreferences) {
      // Apply initial preferences if provided
      if (initialPreferences.layout) {
        Object.assign(layout, initialPreferences.layout);
      }
      if (initialPreferences.theme) {
        Object.assign(theme, initialPreferences.theme);
      }
    }
  }, []);
  
  // Notify parent of preference changes
  useEffect(() => {
    if (onPreferencesChange) {
      const preferences = {
        layout: {
          sidebarCollapsed: layout.sidebarCollapsed,
          sidebarPinned: layout.sidebarPinned,
          compactMode: layout.compactMode,
          density: layout.density,
          gridLayouts: layout.gridLayouts
        },
        theme: {
          mode: theme.mode,
          customColors: theme.customColors,
          fontSize: theme.fontSize,
          borderRadius: theme.borderRadius
        }
      };
      onPreferencesChange(preferences);
    }
  }, [
    layout.sidebarCollapsed,
    layout.compactMode,
    theme.mode,
    theme.customColors,
    onPreferencesChange
  ]);
  
  // Create MUI theme based on store
  const muiTheme = useMemo(() => {
    const colors = theme.getActiveColors();
    const isDark = theme.mode === 'dark' || 
      (theme.mode === 'system' && theme.systemPreference === 'dark');
    
    return createTheme({
      palette: {
        mode: isDark ? 'dark' : 'light',
        primary: {
          main: colors.primary
        },
        secondary: {
          main: colors.secondary
        },
        error: {
          main: colors.error
        },
        warning: {
          main: colors.warning
        },
        info: {
          main: colors.info
        },
        success: {
          main: colors.success
        },
        background: {
          default: colors.background,
          paper: colors.surface
        },
        text: {
          primary: colors.textPrimary,
          secondary: colors.textSecondary
        },
        divider: colors.divider
      },
      typography: {
        fontFamily: theme.fontFamily,
        fontSize: theme.fontSize === 'small' ? 14 : theme.fontSize === 'large' ? 18 : 16
      },
      shape: {
        borderRadius: theme.borderRadius
      },
      spacing: theme.spacing,
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              borderRadius: theme.borderRadius,
              transition: layout.animationsEnabled 
                ? 'all 0.2s ease-in-out' 
                : 'none'
            }
          }
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              borderRadius: theme.borderRadius,
              ...(theme.glassmorphism && {
                backdropFilter: 'blur(10px)',
                backgroundColor: isDark 
                  ? 'rgba(30, 41, 59, 0.8)' 
                  : 'rgba(248, 250, 252, 0.8)'
              })
            }
          }
        },
        MuiDrawer: {
          styleOverrides: {
            paper: {
              transition: layout.animationsEnabled 
                ? 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' 
                : 'none'
            }
          }
        }
      }
    });
  }, [
    theme.mode, 
    theme.systemPreference, 
    theme.customColors,
    theme.fontFamily,
    theme.fontSize,
    theme.borderRadius,
    theme.spacing,
    theme.glassmorphism,
    layout.animationsEnabled
  ]);
  
  // API functions (placeholders for now)
  const refreshPreferences = useCallback(async () => {
    // TODO: Fetch preferences from backend
    await layout.loadLayoutPreferences();
  }, [layout]);
  
  const syncWithBackend = useCallback(async () => {
    // TODO: Sync preferences with backend
    await layout.saveLayoutPreferences();
  }, [layout]);
  
  // Context value
  const contextValue = useMemo<DashboardContextValue>(() => ({
    layout,
    theme,
    responsive,
    isLoading: false,
    error: null,
    refreshPreferences,
    syncWithBackend
  }), [layout, theme, responsive, refreshPreferences, syncWithBackend]);
  
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardContext.Provider value={contextValue}>
        <ThemeProvider theme={muiTheme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </DashboardContext.Provider>
    </QueryClientProvider>
  );
};

/**
 * Hook to use Dashboard context
 */
export const useDashboard = (): DashboardContextValue => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within DashboardProvider');
  }
  return context;
};

/**
 * HOC to inject dashboard props
 */
export const withDashboard = <P extends object>(
  Component: React.ComponentType<P & DashboardContextValue>
): React.FC<P> => {
  return (props: P) => {
    const dashboardProps = useDashboard();
    return <Component {...props} {...dashboardProps} />;
  };
};