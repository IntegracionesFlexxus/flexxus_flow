/**
 * Theme Store - Dashboard Layout System
 * Gestión del tema y colores con persistencia
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type ThemeMode = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';

export interface ThemePreferences {
  mode: ThemeMode;
  customColors: Partial<ColorScheme>;
  fontSize: FontSize;
  borderRadius: number;
  spacing: number;
  fontFamily: string;
  glassmorphism: boolean;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  error: string;
  warning: string;
  info: string;
  success: string;
  textPrimary: string;
  textSecondary: string;
  divider: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  colors: Partial<ColorScheme>;
}

export interface ThemeState {
  // Theme Mode
  mode: ThemeMode;
  systemPreference: 'light' | 'dark';
  
  // Colors
  lightColors: ColorScheme;
  darkColors: ColorScheme;
  customColors: Partial<ColorScheme>;
  
  // Typography
  fontSize: FontSize;
  fontFamily: string;
  
  // Styling
  borderRadius: number;
  spacing: number;
  shadows: boolean;
  gradients: boolean;
  glassmorphism: boolean;
  
  // Presets
  activePreset: string | null;
  customPresets: ThemePreset[];
  
  // Actions - Mode
  setThemeMode: (mode: ThemeMode) => void;
  setSystemPreference: (preference: 'light' | 'dark') => void;
  toggleTheme: () => void;
  
  // Actions - Colors
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  setAccentColor: (color: string) => void;
  setCustomColors: (colors: Partial<ColorScheme>) => void;
  updateColors: (colors: Partial<ColorScheme>) => void;
  resetColors: () => void;
  resetTheme: () => void;
  
  // Actions - Typography
  setFontSize: (size: FontSize) => void;
  setFontFamily: (family: string) => void;
  
  // Actions - Styling
  setBorderRadius: (radius: number) => void;
  setSpacing: (spacing: number) => void;
  setShadows: (enabled: boolean) => void;
  setGradients: (enabled: boolean) => void;
  setGlassmorphism: (enabled: boolean) => void;
  
  // Actions - Presets
  applyPreset: (presetId: string) => void;
  saveCustomPreset: (name: string) => void;
  deleteCustomPreset: (presetId: string) => void;
  
  // Actions - Theme Application
  applyTheme: () => void;
  getActiveColors: () => ColorScheme;
  exportTheme: () => string;
  importTheme: (themeData: string) => void;
}

// Default color schemes
const defaultLightColors: ColorScheme = {
  primary: '#3b82f6',
  secondary: '#64748b',
  accent: '#f59e0b',
  background: '#ffffff',
  surface: '#f8fafc',
  error: '#ef4444',
  warning: '#f97316',
  info: '#0ea5e9',
  success: '#10b981',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  divider: '#e2e8f0'
};

const defaultDarkColors: ColorScheme = {
  primary: '#60a5fa',
  secondary: '#94a3b8',
  accent: '#fbbf24',
  background: '#0f172a',
  surface: '#1e293b',
  error: '#f87171',
  warning: '#fb923c',
  info: '#38bdf8',
  success: '#34d399',
  textPrimary: '#f1f5f9',
  textSecondary: '#cbd5e1',
  divider: '#334155'
};

// Built-in theme presets
const builtInPresets: ThemePreset[] = [
  {
    id: 'ocean',
    name: 'Ocean Blue',
    mode: 'light',
    colors: {
      primary: '#006994',
      secondary: '#0099cc',
      accent: '#00d4ff'
    }
  },
  {
    id: 'forest',
    name: 'Forest Green',
    mode: 'light',
    colors: {
      primary: '#2d5016',
      secondary: '#4a7c28',
      accent: '#8bc34a'
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    mode: 'dark',
    colors: {
      primary: '#ff6b6b',
      secondary: '#ff9f43',
      accent: '#ffd93d'
    }
  },
  {
    id: 'midnight',
    name: 'Midnight',
    mode: 'dark',
    colors: {
      primary: '#4a00e0',
      secondary: '#8e2de2',
      accent: '#b06ab3',
      background: '#000000',
      surface: '#0a0a0a'
    }
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    mode: 'dark',
    colors: {
      primary: '#ff00ff',
      secondary: '#00ffff',
      accent: '#ffff00',
      background: '#0a0014',
      surface: '#1a0028'
    }
  }
];

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        mode: 'system',
        systemPreference: 'light',
        lightColors: defaultLightColors,
        darkColors: defaultDarkColors,
        customColors: {},
        fontSize: 'medium',
        fontFamily: 'Inter, system-ui, sans-serif',
        borderRadius: 8,
        spacing: 8,
        shadows: true,
        gradients: false,
        glassmorphism: false,
        activePreset: null,
        customPresets: [],
        
        // Actions - Mode
        setThemeMode: (mode) => {
          set((state) => {
            state.mode = mode;
          });
          get().applyTheme();
        },
        
        setSystemPreference: (preference) =>
          set((state) => {
            state.systemPreference = preference;
            if (state.mode === 'system') {
              get().applyTheme();
            }
          }),
        
        toggleTheme: () => {
          const currentMode = get().mode;
          const effectiveMode = currentMode === 'system' 
            ? get().systemPreference 
            : currentMode;
          
          const newMode = effectiveMode === 'light' ? 'dark' : 'light';
          get().setThemeMode(newMode);
        },
        
        // Actions - Colors
        setPrimaryColor: (color) => {
          set((state) => {
            state.customColors.primary = color;
          });
          get().applyTheme();
        },
        
        setSecondaryColor: (color) => {
          set((state) => {
            state.customColors.secondary = color;
          });
          get().applyTheme();
        },
        
        setAccentColor: (color) => {
          set((state) => {
            state.customColors.accent = color;
          });
          get().applyTheme();
        },
        
        setCustomColors: (colors) => {
          set((state) => {
            state.customColors = colors;
          });
          get().applyTheme();
        },
        
        updateColors: (colors) => {
          set((state) => {
            state.customColors = { ...state.customColors, ...colors };
          });
          get().applyTheme();
        },
        
        resetColors: () => {
          set((state) => {
            state.customColors = {};
            state.lightColors = defaultLightColors;
            state.darkColors = defaultDarkColors;
            state.activePreset = null;
          });
          get().applyTheme();
        },
        
        resetTheme: () => {
          set((state) => {
            state.mode = 'system';
            state.customColors = {};
            state.lightColors = defaultLightColors;
            state.darkColors = defaultDarkColors;
            state.fontSize = 'medium';
            state.fontFamily = 'Inter, system-ui, sans-serif';
            state.borderRadius = 8;
            state.spacing = 8;
            state.shadows = true;
            state.gradients = false;
            state.glassmorphism = false;
            state.activePreset = null;
          });
          get().applyTheme();
        },
        
        // Actions - Typography
        setFontSize: (size) => {
          set((state) => {
            state.fontSize = size;
          });
          get().applyTheme();
        },
        
        setFontFamily: (family) => {
          set((state) => {
            state.fontFamily = family;
          });
          get().applyTheme();
        },
        
        // Actions - Styling
        setBorderRadius: (radius) => {
          set((state) => {
            state.borderRadius = Math.max(0, Math.min(24, radius));
          });
          get().applyTheme();
        },
        
        setSpacing: (spacing) => {
          set((state) => {
            state.spacing = Math.max(4, Math.min(16, spacing));
          });
          get().applyTheme();
        },
        
        setShadows: (enabled) => {
          set((state) => {
            state.shadows = enabled;
          });
          get().applyTheme();
        },
        
        setGradients: (enabled) => {
          set((state) => {
            state.gradients = enabled;
          });
          get().applyTheme();
        },
        
        setGlassmorphism: (enabled) => {
          set((state) => {
            state.glassmorphism = enabled;
          });
          get().applyTheme();
        },
        
        // Actions - Presets
        applyPreset: (presetId) => {
          const preset = [...builtInPresets, ...get().customPresets]
            .find(p => p.id === presetId);
          
          if (preset) {
            set((state) => {
              state.activePreset = presetId;
              if (preset.mode === 'light') {
                state.lightColors = { ...defaultLightColors, ...preset.colors };
              } else {
                state.darkColors = { ...defaultDarkColors, ...preset.colors };
              }
              state.customColors = preset.colors;
            });
            get().applyTheme();
          }
        },
        
        saveCustomPreset: (name) => {
          const state = get();
          const colors = state.getActiveColors();
          const mode = state.mode === 'system' ? state.systemPreference : state.mode;
          
          const preset: ThemePreset = {
            id: `custom-${Date.now()}`,
            name,
            mode: mode as 'light' | 'dark',
            colors: state.customColors
          };
          
          set((state) => {
            state.customPresets.push(preset);
          });
        },
        
        deleteCustomPreset: (presetId) =>
          set((state) => {
            state.customPresets = state.customPresets.filter(p => p.id !== presetId);
            if (state.activePreset === presetId) {
              state.activePreset = null;
            }
          }),
        
        // Actions - Theme Application
        applyTheme: () => {
          const state = get();
          const colors = state.getActiveColors();
          const root = document.documentElement;
          
          // Determine effective mode
          const effectiveMode = state.mode === 'system' 
            ? state.systemPreference 
            : state.mode;
          
          // Set data attribute for CSS
          root.setAttribute('data-theme', effectiveMode);
          
          // Apply CSS variables
          Object.entries(colors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value);
          });
          
          // Apply typography
          const fontSizes = {
            small: '14px',
            medium: '16px',
            large: '18px'
          };
          root.style.setProperty('--font-size-base', fontSizes[state.fontSize]);
          root.style.setProperty('--font-family', state.fontFamily);
          
          // Apply styling
          root.style.setProperty('--border-radius', `${state.borderRadius}px`);
          root.style.setProperty('--spacing-unit', `${state.spacing}px`);
          root.style.setProperty('--shadows-enabled', state.shadows ? '1' : '0');
          root.style.setProperty('--gradients-enabled', state.gradients ? '1' : '0');
          root.style.setProperty('--glassmorphism-enabled', state.glassmorphism ? '1' : '0');
          
          // Dispatch custom event for components to react
          window.dispatchEvent(new CustomEvent('themechange', { 
            detail: { mode: effectiveMode, colors } 
          }));
        },
        
        getActiveColors: () => {
          const state = get();
          const effectiveMode = state.mode === 'system' 
            ? state.systemPreference 
            : state.mode;
          
          const baseColors = effectiveMode === 'light' 
            ? state.lightColors 
            : state.darkColors;
          
          return { ...baseColors, ...state.customColors };
        },
        
        exportTheme: () => {
          const state = get();
          const themeData = {
            mode: state.mode,
            colors: state.customColors,
            typography: {
              fontSize: state.fontSize,
              fontFamily: state.fontFamily
            },
            styling: {
              borderRadius: state.borderRadius,
              spacing: state.spacing,
              shadows: state.shadows,
              gradients: state.gradients,
              glassmorphism: state.glassmorphism
            }
          };
          return JSON.stringify(themeData, null, 2);
        },
        
        importTheme: (themeData) => {
          try {
            const data = JSON.parse(themeData);
            set((state) => {
              if (data.mode) state.mode = data.mode;
              if (data.colors) state.customColors = data.colors;
              if (data.typography) {
                state.fontSize = data.typography.fontSize || state.fontSize;
                state.fontFamily = data.typography.fontFamily || state.fontFamily;
              }
              if (data.styling) {
                state.borderRadius = data.styling.borderRadius ?? state.borderRadius;
                state.spacing = data.styling.spacing ?? state.spacing;
                state.shadows = data.styling.shadows ?? state.shadows;
                state.gradients = data.styling.gradients ?? state.gradients;
                state.glassmorphism = data.styling.glassmorphism ?? state.glassmorphism;
              }
            });
            get().applyTheme();
          } catch (error) {
            console.error('Failed to import theme:', error);
          }
        }
      })),
      {
        name: 'dashboard-theme',
        partialize: (state) => ({
          mode: state.mode,
          customColors: state.customColors,
          fontSize: state.fontSize,
          fontFamily: state.fontFamily,
          borderRadius: state.borderRadius,
          spacing: state.spacing,
          shadows: state.shadows,
          gradients: state.gradients,
          glassmorphism: state.glassmorphism,
          activePreset: state.activePreset,
          customPresets: state.customPresets
        })
      }
    ),
    { name: 'theme-store' }
  )
);

// Selectors
export const selectThemeMode = (state: ThemeState) => state.mode;
export const selectActiveColors = (state: ThemeState) => state.getActiveColors();
export const selectFontSize = (state: ThemeState) => state.fontSize;
export const selectBorderRadius = (state: ThemeState) => state.borderRadius;

// Built-in presets export for UI
export const getBuiltInPresets = () => builtInPresets;

// Helper to detect system preference
export const detectSystemPreference = (): 'light' | 'dark' => {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
};