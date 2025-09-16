/**
 * Company Settings Page - Sprint 3
 * Página principal de configuración de empresa
 * Implementación siguiendo lineamientos Nivel 2: SOLID, Clean Code, componentes modulares
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Skeleton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Building,
  Shield,
  Bell,
  Palette,
  Settings,
  Save
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Components
import { GeneralSettingsTab } from '@modules/company/components/GeneralSettingsTab';
import { SecuritySettingsTab } from '@modules/company/components/SecuritySettingsTab';
import { NotificationSettingsTab } from '@modules/company/components/NotificationSettingsTab';
import { BrandingSettingsTab } from '@modules/company/components/BrandingSettingsTab';
import { LoadingOverlay } from '@/components/ui/Loading';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

// Services & Hooks
import { companyService } from '@modules/company/services/companyService';
import { useCompanySettings } from '@modules/company/hooks/useCompanySettings';
import { useAuthStore } from '@/shared/store/authStore';
import { useUIStore } from '@/shared/store/uiStore';
import { useFeatureFlag } from '@/shared/hooks/useFeatureFlag';

// Types
import type { CompanySettingsResponse } from '@modules/company/types';

// Tab configuration
interface TabConfig {
  id: string;
  label: string;
  icon: React.ElementType;
  component: React.ElementType;
  requiredPermission?: string;
  featureFlag?: string;
}

const TABS: TabConfig[] = [
  {
    id: 'general',
    label: 'Información General',
    icon: Building,
    component: GeneralSettingsTab
  },
  {
    id: 'security',
    label: 'Seguridad',
    icon: Shield,
    component: SecuritySettingsTab,
    requiredPermission: 'company:security:manage'
  },
  {
    id: 'notifications',
    label: 'Notificaciones',
    icon: Bell,
    component: NotificationSettingsTab
  },
  {
    id: 'branding',
    label: 'Personalización',
    icon: Palette,
    component: BrandingSettingsTab,
    featureFlag: 'custom_branding'
  }
];

/**
 * CompanySettings Component
 * Principios SOLID aplicados:
 * - S: Responsabilidad única para configuración de empresa
 * - O: Abierto para extensión mediante tabs modulares
 * - D: Inversión de dependencias con servicios inyectados
 */
export const CompanySettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingTabChange, setPendingTabChange] = useState<number | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();
  
  // Store hooks
  const { currentCompany, user } = useAuthStore();
  const { addNotification } = useUIStore();
  
  // Custom hook para gestión de estado (SRP)
  const {
    formData,
    setFormData,
    hasUnsavedChanges,
    resetChanges,
    validateForm
  } = useCompanySettings();
  
  // Feature flags y permisos
  const canManageSecurity = user?.permissions?.includes('company:security:manage');
  const hasCustomBranding = useFeatureFlag('custom_branding');
  
  // Query: Fetch company settings
  const {
    data: settings,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['companySettings', currentCompany?.id],
    queryFn: () => companyService.getCompanySettings(currentCompany!.id),
    enabled: !!currentCompany?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
    onSuccess: (data) => {
      setFormData(data);
    }
  });
  
  // Mutation: Update settings
  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<CompanySettingsResponse>) => 
      companyService.updateCompanySettings(currentCompany!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['companySettings']);
      addNotification({
        type: 'success',
        title: 'Configuración actualizada',
        message: 'Los cambios han sido guardados exitosamente'
      });
      resetChanges();
    },
    onError: (error: any) => {
      addNotification({
        type: 'error',
        title: 'Error al guardar',
        message: error.response?.data?.message || 'No se pudieron guardar los cambios'
      });
    }
  });
  
  // Handlers
  const handleTabChange = useCallback((event: React.SyntheticEvent, newValue: number) => {
    if (hasUnsavedChanges) {
      setPendingTabChange(newValue);
      setShowUnsavedDialog(true);
    } else {
      setActiveTab(newValue);
    }
  }, [hasUnsavedChanges]);
  
  const handleConfirmTabChange = useCallback(() => {
    if (pendingTabChange !== null) {
      resetChanges();
      setActiveTab(pendingTabChange);
      setPendingTabChange(null);
    }
    setShowUnsavedDialog(false);
  }, [pendingTabChange, resetChanges]);
  
  const handleCancelTabChange = useCallback(() => {
    setPendingTabChange(null);
    setShowUnsavedDialog(false);
  }, []);
  
  const handleSave = useCallback(async (tabId: string) => {
    // Validar formulario del tab actual
    const validationErrors = validateForm(tabId);
    if (Object.keys(validationErrors).length > 0) {
      addNotification({
        type: 'warning',
        title: 'Formulario incompleto',
        message: 'Por favor, corrige los errores antes de guardar'
      });
      return;
    }
    
    // Preparar datos para guardar según el tab
    const dataToSave = getTabData(tabId, formData);
    
    // Ejecutar mutación
    updateSettingsMutation.mutate(dataToSave);
  }, [formData, validateForm, updateSettingsMutation, addNotification]);
  
  // Helper para obtener datos del tab
  const getTabData = (tabId: string, data: any): Partial<CompanySettingsResponse> => {
    switch (tabId) {
      case 'general':
        return { company: data.company };
      case 'security':
        return { security: data.security };
      case 'notifications':
        return { notifications: data.notifications };
      case 'branding':
        return { branding: data.branding };
      default:
        return {};
    }
  };
  
  // Filtrar tabs disponibles según permisos y features
  const availableTabs = TABS.filter(tab => {
    if (tab.requiredPermission && !user?.permissions?.includes(tab.requiredPermission)) {
      return false;
    }
    if (tab.featureFlag && !useFeatureFlag(tab.featureFlag)) {
      return false;
    }
    return true;
  });
  
  // Prevenir navegación con cambios no guardados
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
  
  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={40} sx={{ mb: 3 }} />
        <Paper sx={{ p: 3 }}>
          <Skeleton variant="rectangular" height={400} />
        </Paper>
      </Box>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert 
          severity="error"
          action={
            <Typography 
              color="inherit" 
              sx={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => refetch()}
            >
              Reintentar
            </Typography>
          }
        >
          Error al cargar la configuración de la empresa
        </Alert>
      </Box>
    );
  }
  
  const ActiveTabComponent = availableTabs[activeTab]?.component;
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Configuración de la Empresa
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Administra la configuración, seguridad y personalización de tu empresa
        </Typography>
      </Box>
      
      {/* Tabs */}
      <Paper sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons={isMobile ? 'auto' : false}
            sx={{ px: 2 }}
          >
            {availableTabs.map((tab, index) => {
              const Icon = tab.icon;
              return (
                <Tab
                  key={tab.id}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Icon size={20} />
                      {!isMobile && tab.label}
                    </Box>
                  }
                  sx={{ minHeight: 64 }}
                />
              );
            })}
          </Tabs>
        </Box>
        
        {/* Tab Content */}
        <Box sx={{ flexGrow: 1, position: 'relative', overflow: 'auto' }}>
          {updateSettingsMutation.isLoading && <LoadingOverlay />}
          
          {ActiveTabComponent && settings && (
            <ActiveTabComponent
              data={formData}
              onChange={setFormData}
              onSave={() => handleSave(availableTabs[activeTab].id)}
              isLoading={updateSettingsMutation.isLoading}
              hasChanges={hasUnsavedChanges}
            />
          )}
        </Box>
      </Paper>
      
      {/* Unsaved Changes Dialog */}
      <ConfirmDialog
        open={showUnsavedDialog}
        title="Cambios sin guardar"
        message="Tienes cambios sin guardar. ¿Deseas descartarlos y continuar?"
        confirmText="Descartar cambios"
        cancelText="Cancelar"
        confirmColor="warning"
        onConfirm={handleConfirmTabChange}
        onCancel={handleCancelTabChange}
      />
      
      {/* Success Notification */}
      <Snackbar
        open={updateSettingsMutation.isSuccess}
        autoHideDuration={3000}
        message="Configuración guardada exitosamente"
      />
    </Box>
  );
};