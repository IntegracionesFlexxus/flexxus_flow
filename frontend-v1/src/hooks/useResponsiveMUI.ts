/**
 * Hook para manejo consistente de responsive design con Material-UI
 * Versión mejorada que usa los breakpoints del theme
 */
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';

export const useResponsiveMUI = () => {
  const theme = useTheme();
  
  // Breakpoints estándar de Material-UI
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const isLargeDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  const isExtraLarge = useMediaQuery(theme.breakpoints.up('xl'));
  
  // Breakpoints específicos
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const isMediumScreen = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  
  // Orientación
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isLandscape = useMediaQuery('(orientation: landscape)');
  
  // Touch device detection
  const isTouchDevice = useMediaQuery('(hover: none) and (pointer: coarse)');
  
  // Información del dispositivo actual
  const deviceInfo = {
    type: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
    orientation: isPortrait ? 'portrait' : 'landscape',
    size: {
      mobile: isMobile,
      tablet: isTablet,
      desktop: isDesktop,
      largeDesktop: isLargeDesktop,
      extraLarge: isExtraLarge,
    },
    isTouch: isTouchDevice,
  };
  
  return {
    // Estados básicos
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isExtraLarge,
    
    // Agrupaciones útiles
    isSmallScreen,
    isMediumScreen,
    isLargeScreen,
    
    // Orientación
    isPortrait,
    isLandscape,
    
    // Touch
    isTouchDevice,
    
    // Info completa
    deviceInfo,
    
    // Acceso directo al theme
    theme,
    breakpoints: theme.breakpoints,
  };
};

export default useResponsiveMUI;