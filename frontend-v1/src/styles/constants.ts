/**
 * Constantes de diseño centralizadas
 * Sistema unificado de valores para consistencia visual
 */

// Breakpoints estandarizados (matching Material-UI defaults)
export const BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 900,
  lg: 1200,
  xl: 1536,
} as const;

// Sistema de espaciado basado en 8px grid
export const SPACING = {
  xs: 0.5,  // 4px
  sm: 1,    // 8px
  md: 2,    // 16px
  lg: 3,    // 24px
  xl: 4,    // 32px
  xxl: 6,   // 48px
} as const;

// Sistema de z-index ordenado
export const Z_INDEX = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  notification: 800,
  drawer: 1200,
  snackbar: 1400,
} as const;

// Duración de animaciones
export const TRANSITIONS = {
  shortest: 150,
  shorter: 200,
  short: 250,
  standard: 300,
  complex: 375,
  enteringScreen: 225,
  leavingScreen: 195,
} as const;

// Elevaciones/sombras estandarizadas
export const SHADOWS = {
  none: 'none',
  sm: '0 1px 3px rgba(0,0,0,0.12)',
  md: '0 4px 6px rgba(0,0,0,0.1)',
  lg: '0 10px 20px rgba(0,0,0,0.15)',
  xl: '0 20px 25px rgba(0,0,0,0.15)',
} as const;

// Border radius estandarizados
export const RADIUS = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: '50%',
  pill: 9999,
} as const;

// Tipo para los valores de breakpoints
export type Breakpoint = keyof typeof BREAKPOINTS;
export type Spacing = keyof typeof SPACING;
export type ZIndex = keyof typeof Z_INDEX;
export type Transition = keyof typeof TRANSITIONS;
export type Shadow = keyof typeof SHADOWS;
export type Radius = keyof typeof RADIUS;