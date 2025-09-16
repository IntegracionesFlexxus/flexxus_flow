/**
 * useCompanySettings Hook - Sprint 3
 * Hook personalizado para gestión de configuración de empresa
 * Principio SRP: Separación de lógica de estado
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { isEqual } from 'lodash';
import type { CompanySettingsResponse } from '@modules/company/types';

interface UseCompanySettingsReturn {
  formData: CompanySettingsResponse | null;
  setFormData: (data: CompanySettingsResponse | null) => void;
  hasUnsavedChanges: boolean;
  resetChanges: () => void;
  validateForm: (tabId: string) => Record<string, string>;
  isDirty: (field: string) => boolean;
  getFieldError: (field: string) => string | null;
  trackChange: (field: string, value: any) => void;
}

/**
 * Hook para gestión de estado de configuración
 * Clean Code: Lógica de estado extraída y reutilizable
 */
export const useCompanySettings = (): UseCompanySettingsReturn => {
  const [formData, setFormData] = useState<CompanySettingsResponse | null>(null);
  const [originalData, setOriginalData] = useState<CompanySettingsResponse | null>(null);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  // Track initial data
  useEffect(() => {
    if (formData && !originalData) {
      setOriginalData(JSON.parse(JSON.stringify(formData)));
    }
  }, [formData, originalData]);
  
  /**
   * Check if there are unsaved changes
   */
  const hasUnsavedChanges = useCallback(() => {
    if (!formData || !originalData) return false;
    return !isEqual(formData, originalData);
  }, [formData, originalData]);
  
  /**
   * Reset changes to original data
   */
  const resetChanges = useCallback(() => {
    if (originalData) {
      setFormData(JSON.parse(JSON.stringify(originalData)));
      setChangedFields(new Set());
      setFieldErrors({});
    }
  }, [originalData]);
  
  /**
   * Validate form based on tab
   */
  const validateForm = useCallback((tabId: string): Record<string, string> => {
    const errors: Record<string, string> = {};
    
    if (!formData) return errors;
    
    switch (tabId) {
      case 'general':
        // Validate company information
        if (!formData.company?.name) {
          errors['company.name'] = 'El nombre de la empresa es requerido';
        }
        if (!formData.company?.email) {
          errors['company.email'] = 'El email es requerido';
        } else if (!isValidEmail(formData.company.email)) {
          errors['company.email'] = 'Email inválido';
        }
        if (formData.company?.website && !isValidUrl(formData.company.website)) {
          errors['company.website'] = 'URL inválida';
        }
        break;
        
      case 'security':
        // Validate security settings
        const passwordPolicy = formData.security?.passwordPolicy;
        if (passwordPolicy) {
          if (passwordPolicy.minLength < 6) {
            errors['security.passwordPolicy.minLength'] = 'La longitud mínima debe ser al menos 6';
          }
          if (passwordPolicy.maxLength && passwordPolicy.maxLength < passwordPolicy.minLength) {
            errors['security.passwordPolicy.maxLength'] = 'La longitud máxima debe ser mayor que la mínima';
          }
        }
        
        const sessionSettings = formData.security?.sessionSettings;
        if (sessionSettings) {
          if (sessionSettings.maxConcurrentSessions < 1) {
            errors['security.sessionSettings.maxConcurrentSessions'] = 'Debe permitir al menos 1 sesión';
          }
          if (sessionSettings.idleTimeout > sessionSettings.sessionTimeout) {
            errors['security.sessionSettings.idleTimeout'] = 'El tiempo de inactividad no puede ser mayor que el tiempo de sesión';
          }
        }
        break;
        
      case 'notifications':
        // Validate notification settings
        const emailNotifications = formData.notifications?.emailNotifications;
        if (emailNotifications?.enabled && !emailNotifications.defaultSender) {
          errors['notifications.emailNotifications.defaultSender'] = 'El remitente por defecto es requerido';
        }
        
        // Validate webhooks
        formData.notifications?.webhooks?.forEach((webhook, index) => {
          if (!webhook.name) {
            errors[`notifications.webhooks.${index}.name`] = 'El nombre del webhook es requerido';
          }
          if (!webhook.url || !isValidUrl(webhook.url)) {
            errors[`notifications.webhooks.${index}.url`] = 'URL del webhook inválida';
          }
        });
        break;
        
      case 'branding':
        // Validate branding settings
        const colors = formData.branding?.colors;
        if (colors) {
          Object.entries(colors).forEach(([key, value]) => {
            if (typeof value === 'string' && !isValidColor(value)) {
              errors[`branding.colors.${key}`] = 'Color inválido';
            }
          });
        }
        break;
    }
    
    setFieldErrors(errors);
    return errors;
  }, [formData]);
  
  /**
   * Check if a specific field is dirty
   */
  const isDirty = useCallback((field: string): boolean => {
    return changedFields.has(field);
  }, [changedFields]);
  
  /**
   * Get error for a specific field
   */
  const getFieldError = useCallback((field: string): string | null => {
    return fieldErrors[field] || null;
  }, [fieldErrors]);
  
  /**
   * Track field changes
   */
  const trackChange = useCallback((field: string, value: any) => {
    setChangedFields(prev => {
      const next = new Set(prev);
      next.add(field);
      return next;
    });
    
    // Clear error for this field when it changes
    setFieldErrors(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);
  
  return {
    formData,
    setFormData,
    hasUnsavedChanges: hasUnsavedChanges(),
    resetChanges,
    validateForm,
    isDirty,
    getFieldError,
    trackChange
  };
};

// Utility functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const isValidColor = (color: string): boolean => {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  const rgbRegex = /^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$/;
  const rgbaRegex = /^rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*(0|1|0?\.\d+)\)$/;
  
  return hexRegex.test(color) || rgbRegex.test(color) || rgbaRegex.test(color);
};