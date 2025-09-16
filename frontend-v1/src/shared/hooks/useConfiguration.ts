/**
 * useConfiguration Hook - Sprint 2 & 3
 * Siguiendo lineamientos nivel 2: Hook personalizado para gestión de configuraciones
 * Implementa validación, caché y sincronización siguiendo principios SOLID
 */

import { useState, useEffect, useCallback } from 'react';
import { configurationService, type ConfigurationResponse, type SystemHealthResponse, type ConfigurationStatsResponse } from '@/modules/auth/services/configurationService';
import { toast } from 'sonner';

// Estados de configuración
interface ConfigurationState {
  isLoading: boolean;
  isValidating: boolean;
  isSaving: boolean;
  error: string | null;
  lastModified: Date | null;
  validationStatus: 'valid' | 'warnings' | 'errors' | 'unknown';
  cacheStatus: 'active' | 'stale' | 'disabled';
}

// Hook para configuraciones de empresa
export const useCompanyConfiguration = () => {
  const [state, setState] = useState<ConfigurationState>({
    isLoading: false,
    isValidating: false,
    isSaving: false,
    error: null,
    lastModified: null,
    validationStatus: 'unknown',
    cacheStatus: 'disabled'
  });
  const [basicSettings, setBasicSettings] = useState<any>(null);
  const [advancedSettings, setAdvancedSettings] = useState<any>(null);

  // Cargar configuraciones básicas
  const loadBasicSettings = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await configurationService.getCompanySettings();
      if (response.success) {
        setBasicSettings(response.data);
        setState(prev => ({ 
          ...prev, 
          lastModified: response.data.lastModified ? new Date(response.data.lastModified) : new Date(),
          validationStatus: 'valid'
        }));
      } else {
        throw new Error(response.message || 'Error al cargar configuraciones básicas');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast.error('Error al cargar configuraciones básicas');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Cargar configuraciones avanzadas
  const loadAdvancedSettings = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await configurationService.getAdvancedCompanySettings();
      if (response.success) {
        setAdvancedSettings(response.data);
        setState(prev => ({ 
          ...prev, 
          lastModified: response.data.lastModified ? new Date(response.data.lastModified) : new Date(),
          validationStatus: 'valid'
        }));
      } else {
        throw new Error(response.message || 'Error al cargar configuraciones avanzadas');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast.error('Error al cargar configuraciones avanzadas');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Guardar configuraciones básicas
  const saveBasicSettings = useCallback(async (settings: any) => {
    setState(prev => ({ ...prev, isSaving: true, error: null }));
    try {
      const response = await configurationService.updateCompanySettings(settings);
      if (response.success) {
        setBasicSettings(response.data.settings);
        setState(prev => ({ 
          ...prev, 
          lastModified: new Date(),
          validationStatus: 'valid'
        }));
        toast.success('Configuraciones básicas guardadas correctamente');
        return response;
      } else {
        throw new Error(response.message || 'Error al guardar configuraciones');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast.error('Error al guardar configuraciones básicas');
      throw error;
    } finally {
      setState(prev => ({ ...prev, isSaving: false }));
    }
  }, []);

  // Guardar configuraciones avanzadas
  const saveAdvancedSettings = useCallback(async (settings: any) => {
    setState(prev => ({ ...prev, isSaving: true, error: null }));
    try {
      const response = await configurationService.updateAdvancedCompanySettings(settings);
      if (response.success) {
        setAdvancedSettings(response.data.settings);
        setState(prev => ({ 
          ...prev, 
          lastModified: new Date(),
          validationStatus: 'valid'
        }));
        toast.success('Configuraciones avanzadas guardadas correctamente');
        return response;
      } else {
        throw new Error(response.message || 'Error al guardar configuraciones avanzadas');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast.error('Error al guardar configuraciones avanzadas');
      throw error;
    } finally {
      setState(prev => ({ ...prev, isSaving: false }));
    }
  }, []);

  return {
    ...state,
    basicSettings,
    advancedSettings,
    loadBasicSettings,
    loadAdvancedSettings,
    saveBasicSettings,
    saveAdvancedSettings
  };
};

// Hook para preferencias de usuario
export const useUserPreferences = () => {
  const [state, setState] = useState<ConfigurationState>({
    isLoading: false,
    isValidating: false,
    isSaving: false,
    error: null,
    lastModified: null,
    validationStatus: 'unknown',
    cacheStatus: 'disabled'
  });
  const [advancedPreferences, setAdvancedPreferences] = useState<any>(null);

  // Cargar preferencias avanzadas
  const loadAdvancedPreferences = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await configurationService.getAdvancedUserPreferences();
      if (response.success) {
        setAdvancedPreferences(response.data);
        setState(prev => ({ 
          ...prev, 
          lastModified: response.data.lastModified ? new Date(response.data.lastModified) : new Date(),
          validationStatus: 'valid'
        }));
      } else {
        throw new Error(response.message || 'Error al cargar preferencias avanzadas');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast.error('Error al cargar preferencias avanzadas');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Guardar preferencias avanzadas
  const saveAdvancedPreferences = useCallback(async (preferences: any) => {
    setState(prev => ({ ...prev, isSaving: true, error: null }));
    try {
      const response = await configurationService.updateAdvancedUserPreferences(preferences);
      if (response.success) {
        setAdvancedPreferences(response.data.preferences);
        setState(prev => ({ 
          ...prev, 
          lastModified: new Date(),
          validationStatus: 'valid'
        }));
        toast.success('Preferencias avanzadas guardadas correctamente');
        return response;
      } else {
        throw new Error(response.message || 'Error al guardar preferencias');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast.error('Error al guardar preferencias avanzadas');
      throw error;
    } finally {
      setState(prev => ({ ...prev, isSaving: false }));
    }
  }, []);

  return {
    ...state,
    advancedPreferences,
    loadAdvancedPreferences,
    saveAdvancedPreferences
  };
};

// Hook para gestión del sistema
export const useSystemManagement = () => {
  const [state, setState] = useState<ConfigurationState>({
    isLoading: false,
    isValidating: false,
    isSaving: false,
    error: null,
    lastModified: null,
    validationStatus: 'unknown',
    cacheStatus: 'disabled'
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealthResponse | null>(null);
  const [configStats, setConfigStats] = useState<ConfigurationStatsResponse | null>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);

  // Verificar estado del sistema
  const checkSystemHealth = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await configurationService.getSystemHealth();
      setSystemHealth(response);
      setState(prev => ({ 
        ...prev, 
        lastModified: new Date(),
        validationStatus: response.overall === 'healthy' ? 'valid' : response.overall === 'warning' ? 'warnings' : 'errors'
      }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast.error('Error al verificar estado del sistema');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Obtener estadísticas de configuración
  const loadConfigurationStats = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await configurationService.getConfigurationStats();
      setConfigStats(response);
      setState(prev => ({ 
        ...prev, 
        lastModified: new Date(response.lastModified),
        validationStatus: response.validationStatus,
        cacheStatus: response.cacheStatus
      }));
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast.error('Error al cargar estadísticas de configuración');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Validar configuración
  const validateConfiguration = useCallback(async () => {
    setState(prev => ({ ...prev, isValidating: true, error: null }));
    try {
      const response = await configurationService.validateConfiguration();
      if (response.success) {
        setState(prev => ({ 
          ...prev, 
          validationStatus: response.data?.hasErrors ? 'errors' : response.data?.hasWarnings ? 'warnings' : 'valid'
        }));
        
        if (response.data?.hasErrors) {
          toast.error(`Errores de validación encontrados: ${response.data.errors.length}`);
        } else if (response.data?.hasWarnings) {
          toast.warning(`Advertencias de validación: ${response.data.warnings.length}`);
        } else {
          toast.success('Configuración validada correctamente');
        }
        return response;
      } else {
        throw new Error(response.message || 'Error en la validación');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast.error('Error al validar configuración');
      throw error;
    } finally {
      setState(prev => ({ ...prev, isValidating: false }));
    }
  }, []);

  // Limpiar caché
  const clearCache = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await configurationService.clearCache();
      if (response.success) {
        setState(prev => ({ 
          ...prev, 
          cacheStatus: 'active'
        }));
        toast.success('Caché limpiado correctamente');
        return response;
      } else {
        throw new Error(response.message || 'Error al limpiar caché');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast.error('Error al limpiar caché');
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Cargar snapshots
  const loadSnapshots = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await configurationService.getSnapshots();
      setSnapshots(response);
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast.error('Error al cargar snapshots');
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Crear snapshot
  const createSnapshot = useCallback(async (name: string, description: string, type: 'full' | 'company' | 'user' = 'full') => {
    setState(prev => ({ ...prev, isSaving: true, error: null }));
    try {
      const response = await configurationService.createSnapshot(name, description, type);
      if (response.success) {
        await loadSnapshots(); // Recargar lista de snapshots
        toast.success('Snapshot creado correctamente');
        return response;
      } else {
        throw new Error(response.message || 'Error al crear snapshot');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast.error('Error al crear snapshot');
      throw error;
    } finally {
      setState(prev => ({ ...prev, isSaving: false }));
    }
  }, [loadSnapshots]);

  // Restaurar snapshot
  const restoreSnapshot = useCallback(async (snapshotId: string) => {
    setState(prev => ({ ...prev, isSaving: true, error: null }));
    try {
      const response = await configurationService.restoreSnapshot(snapshotId);
      if (response.success) {
        setState(prev => ({ 
          ...prev, 
          validationStatus: 'valid',
          cacheStatus: 'stale' // El caché necesita ser actualizado después de la restauración
        }));
        toast.success('Configuración restaurada correctamente');
        return response;
      } else {
        throw new Error(response.message || 'Error al restaurar snapshot');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast.error('Error al restaurar snapshot');
      throw error;
    } finally {
      setState(prev => ({ ...prev, isSaving: false }));
    }
  }, []);

  // Sincronizar configuraciones
  const synchronizeConfigurations = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await configurationService.synchronizeConfigurations();
      if (response.success) {
        toast.success('Configuraciones sincronizadas correctamente');
        return response;
      } else {
        throw new Error(response.message || 'Error en la sincronización');
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, error: error.message }));
      toast.error('Error al sincronizar configuraciones');
      throw error;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  return {
    ...state,
    systemHealth,
    configStats,
    snapshots,
    checkSystemHealth,
    loadConfigurationStats,
    validateConfiguration,
    clearCache,
    loadSnapshots,
    createSnapshot,
    restoreSnapshot,
    synchronizeConfigurations
  };
};

// Hook principal que combina todas las funcionalidades
export const useConfiguration = () => {
  const companyConfig = useCompanyConfiguration();
  const userPrefs = useUserPreferences();
  const systemMgmt = useSystemManagement();

  // Estado global del sistema de configuraciones
  const overallState = {
    isLoading: companyConfig.isLoading || userPrefs.isLoading || systemMgmt.isLoading,
    isSaving: companyConfig.isSaving || userPrefs.isSaving || systemMgmt.isSaving,
    isValidating: companyConfig.isValidating || userPrefs.isValidating || systemMgmt.isValidating,
    hasErrors: companyConfig.error || userPrefs.error || systemMgmt.error,
    validationStatus: systemMgmt.validationStatus !== 'unknown' ? systemMgmt.validationStatus : 'unknown',
    cacheStatus: systemMgmt.cacheStatus
  };

  // Inicialización completa del sistema
  const initializeSystem = useCallback(async () => {
    try {
      await Promise.all([
        companyConfig.loadBasicSettings(),
        companyConfig.loadAdvancedSettings(),
        userPrefs.loadAdvancedPreferences(),
        systemMgmt.checkSystemHealth(),
        systemMgmt.loadConfigurationStats(),
        systemMgmt.loadSnapshots()
      ]);
    } catch (error) {
      console.error('Error initializing configuration system:', error);
    }
  }, [
    companyConfig.loadBasicSettings,
    companyConfig.loadAdvancedSettings,
    userPrefs.loadAdvancedPreferences,
    systemMgmt.checkSystemHealth,
    systemMgmt.loadConfigurationStats,
    systemMgmt.loadSnapshots
  ]);

  return {
    // Estados globales
    ...overallState,
    
    // Funcionalidades de empresa
    company: companyConfig,
    
    // Funcionalidades de usuario
    user: userPrefs,
    
    // Funcionalidades de sistema
    system: systemMgmt,
    
    // Inicialización
    initializeSystem
  };
};

export default useConfiguration;