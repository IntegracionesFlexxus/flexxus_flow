import React, { useEffect, useState } from 'react';
import { Alert, AlertTitle, Collapse, Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import { FieldErrors, useFormState } from 'react-hook-form';
import { getErrorMessage } from '@/utils/validation';

// Manejador de errores de formulario - MVP Nivel 1
// TODO: En Nivel 2 agregar reintentos automáticos, logging, analytics

interface FormErrorHandlerProps {
  apiError?: string | null;
  showFieldErrors?: boolean;
  onDismiss?: () => void;
  autoHideDuration?: number;
}

export function FormErrorHandler({
  apiError,
  showFieldErrors = true,
  onDismiss,
  autoHideDuration
}: FormErrorHandlerProps) {
  const { errors } = useFormState();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHideDuration && (apiError || Object.keys(errors).length > 0)) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, [apiError, errors, autoHideDuration, onDismiss]);

  const handleClose = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const fieldErrorsList = Object.entries(errors).map(([field, error]) => ({
    field,
    message: error?.message || 'Error de validación'
  }));

  const hasErrors = apiError || (showFieldErrors && fieldErrorsList.length > 0);

  if (!hasErrors) return null;

  return (
    <Collapse in={isVisible}>
      <Alert 
        severity="error" 
        onClose={onDismiss ? handleClose : undefined}
        sx={{ mb: 2 }}
      >
        {apiError && (
          <>
            <AlertTitle>Error</AlertTitle>
            <Typography variant="body2">{apiError}</Typography>
          </>
        )}
        
        {showFieldErrors && fieldErrorsList.length > 0 && (
          <>
            {!apiError && <AlertTitle>Por favor corrige los siguientes errores</AlertTitle>}
            <List dense>
              {fieldErrorsList.map(({ field, message }) => (
                <ListItem key={field} disableGutters>
                  <ListItemText 
                    primary={`• ${message}`}
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </Alert>
    </Collapse>
  );
}

// Hook para manejo de errores de formulario
export function useFormError() {
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleError = (error: any) => {
    const message = getErrorMessage(error);
    
    // Si el error tiene información de campos específicos
    if (error?.response?.data?.errors) {
      const errors = error.response.data.errors;
      if (typeof errors === 'object') {
        setFieldErrors(errors);
        return;
      }
    }
    
    // Error general de API
    setApiError(message);
  };

  const clearErrors = () => {
    setApiError(null);
    setFieldErrors({});
  };

  const clearApiError = () => {
    setApiError(null);
  };

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  return {
    apiError,
    fieldErrors,
    handleError,
    clearErrors,
    clearApiError,
    clearFieldError,
    setApiError,
    setFieldErrors
  };
}

// Componente de resumen de errores
interface ErrorSummaryProps {
  errors: FieldErrors;
  title?: string;
}

export function ErrorSummary({ errors, title = 'Errores de validación' }: ErrorSummaryProps) {
  const errorList = Object.entries(errors);
  
  if (errorList.length === 0) return null;

  return (
    <Alert severity="error" sx={{ mb: 2 }}>
      <AlertTitle>{title}</AlertTitle>
      <List dense>
        {errorList.map(([field, error]) => (
          <ListItem key={field} disableGutters>
            <ListItemText
              primary={`• ${formatFieldName(field)}: ${error?.message}`}
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
        ))}
      </List>
    </Alert>
  );
}

// Componente de error inline para campos
interface FieldErrorProps {
  name: string;
  errors?: FieldErrors;
}

export function FieldError({ name, errors }: FieldErrorProps) {
  const error = errors?.[name];
  
  if (!error) return null;

  return (
    <Typography variant="caption" color="error" display="block" mt={0.5}>
      {error.message}
    </Typography>
  );
}

// Utilidades helper
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, c => c.toUpperCase());
}

// Contexto para errores globales
interface FormErrorContextValue {
  globalError: string | null;
  setGlobalError: (error: string | null) => void;
  fieldErrors: Record<string, string>;
  setFieldError: (field: string, error: string) => void;
  clearFieldError: (field: string) => void;
  clearAllErrors: () => void;
}

const FormErrorContext = React.createContext<FormErrorContextValue | undefined>(undefined);

export function FormErrorProvider({ children }: { children: React.ReactNode }) {
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const setFieldError = (field: string, error: string) => {
    setFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const clearAllErrors = () => {
    setGlobalError(null);
    setFieldErrors({});
  };

  return (
    <FormErrorContext.Provider
      value={{
        globalError,
        setGlobalError,
        fieldErrors,
        setFieldError,
        clearFieldError,
        clearAllErrors
      }}
    >
      {children}
    </FormErrorContext.Provider>
  );
}

export function useFormErrorContext() {
  const context = React.useContext(FormErrorContext);
  if (!context) {
    throw new Error('useFormErrorContext must be used within FormErrorProvider');
  }
  return context;
}

export default FormErrorHandler;