import { createTheme } from '@mui/material/styles'
import { Z_INDEX, TRANSITIONS, SHADOWS, RADIUS } from './constants'

// Configuración de tema unificado con sistemas completos
// Incluye z-index, transiciones, sombras y más

// Paleta de colores personalizada
const palette = {
  primary: {
    main: '#1976d2',
    light: '#42a5f5', 
    dark: '#1565c0',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#dc004e',
    light: '#ff5983',
    dark: '#9a0036', 
    contrastText: '#ffffff',
  },
  error: {
    main: '#f44336',
    light: '#ef5350',
    dark: '#c62828',
  },
  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
  },
  info: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
  },
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
  },
  background: {
    default: '#f5f5f5',
    paper: '#ffffff',
  },
  text: {
    primary: '#212121',
    secondary: '#757575',
  },
}

// Tipografía personalizada
const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontSize: '2.5rem',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.6,
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.6,
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.6,
  },
  button: {
    textTransform: 'none' as const,
  }
}

// Espaciado base
const spacing = 8

// Sistema de z-index personalizado
const zIndex = {
  ...Z_INDEX,
  mobileStepper: Z_INDEX.fixed,
  fab: Z_INDEX.fixed,
  speedDial: Z_INDEX.fixed,
  appBar: Z_INDEX.fixed,
  drawer: Z_INDEX.drawer,
  modal: Z_INDEX.modal,
  snackbar: Z_INDEX.snackbar,
  tooltip: Z_INDEX.tooltip,
}

// Sistema de transiciones
const transitions = {
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },
  duration: TRANSITIONS,
}

// Tema principal
export const theme = createTheme({
  palette,
  typography,
  spacing,
  shape: {
    borderRadius: RADIUS.md,
  },
  zIndex,
  transitions,
  components: {
    // Personalización de Button
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: '0.875rem',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          },
        },
        containedPrimary: {
          '&:hover': {
            backgroundColor: palette.primary.dark,
          },
        },
      },
      defaultProps: {
        disableElevation: true,
      },
    },
    // Personalización de Card
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          },
        },
      },
    },
    // Personalización de TextField
    MuiTextField: {
      defaultProps: {
        variant: 'outlined' as const,
        size: 'medium' as const,
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    // Personalización de Paper
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        elevation1: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
        },
        elevation2: {
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        },
        elevation3: {
          boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
        },
      },
    },
    // Personalización de Alert
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    // Personalización de Chip
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    // Personalización de Dialog
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
        },
      },
    },
    // Personalización de Drawer
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },
  },
})

// Exportar sistemas para uso directo
export const colors = palette
export const breakpoints = theme.breakpoints
export const shadows = SHADOWS
export const radius = RADIUS

// Helpers para uso consistente
export const getSpacing = (value: number) => theme.spacing(value)
export const getColor = (path: string) => {
  const keys = path.split('.')
  let result: any = theme.palette
  for (const key of keys) {
    result = result[key]
  }
  return result
}