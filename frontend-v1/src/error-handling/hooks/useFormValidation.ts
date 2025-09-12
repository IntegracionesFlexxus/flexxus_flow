/**
 * useFormValidation Hook - Sprint 3
 * Hook avanzado para validación de formularios con integración de errores
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { debounce } from '@/utils/debounce';
import { ErrorMessages } from '@/shared/utils/errorHandler';

export interface ValidationRule {
  validate: (value: any, formData?: any) => boolean | Promise<boolean>;
  message: string | ((value: any) => string);
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  email?: boolean;
  phone?: boolean;
  custom?: ValidationRule[];
}

export interface UseFormValidationConfig {
  fields: Record<string, FieldValidation>;
  mode?: 'onChange' | 'onBlur' | 'onSubmit';
  debounceMs?: number;
  validateOnMount?: boolean;
}

interface FieldState {
  value: any;
  error: string | null;
  touched: boolean;
  validating: boolean;
}

export function useFormValidation(config: UseFormValidationConfig) {
  const {
    fields,
    mode = 'onBlur',
    debounceMs = 300,
    validateOnMount = false
  } = config;

  // Estado de los campos
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>(() => {
    const initialState: Record<string, FieldState> = {};
    
    Object.keys(fields).forEach(fieldName => {
      initialState[fieldName] = {
        value: '',
        error: null,
        touched: false,
        validating: false
      };
    });
    
    return initialState;
  });

  // Estado global del formulario
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(true);

  // Referencias para debounce
  const validateFieldDebounced = useRef<Record<string, any>>({});

  // Crear funciones debounced para cada campo
  useEffect(() => {
    Object.keys(fields).forEach(fieldName => {
      validateFieldDebounced.current[fieldName] = debounce(
        async (value: any) => {
          await validateFieldInternal(fieldName, value);
        },
        debounceMs
      );
    });
  }, [fields, debounceMs]);

  /**
   * Validación interna de un campo
   */
  const validateFieldInternal = async (
    fieldName: string,
    value: any
  ): Promise<string | null> => {
    const validation = fields[fieldName];
    if (!validation) return null;

    setFieldStates(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], validating: true }
    }));

    try {
      // Validación requerido
      if (validation.required && !value) {
        const error = ErrorMessages.validation.required(fieldName);
        setFieldStates(prev => ({
          ...prev,
          [fieldName]: { ...prev[fieldName], error, validating: false }
        }));
        return error;
      }

      // Validación minLength
      if (validation.minLength && value.length < validation.minLength) {
        const error = ErrorMessages.validation.minLength(fieldName, validation.minLength);
        setFieldStates(prev => ({
          ...prev,
          [fieldName]: { ...prev[fieldName], error, validating: false }
        }));
        return error;
      }

      // Validación maxLength
      if (validation.maxLength && value.length > validation.maxLength) {
        const error = ErrorMessages.validation.maxLength(fieldName, validation.maxLength);
        setFieldStates(prev => ({
          ...prev,
          [fieldName]: { ...prev[fieldName], error, validating: false }
        }));
        return error;
      }

      // Validación pattern
      if (validation.pattern && !validation.pattern.test(value)) {
        const error = ErrorMessages.validation.invalid(fieldName);
        setFieldStates(prev => ({
          ...prev,
          [fieldName]: { ...prev[fieldName], error, validating: false }
        }));
        return error;
      }

      // Validación email
      if (validation.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          const error = ErrorMessages.validation.email;
          setFieldStates(prev => ({
            ...prev,
            [fieldName]: { ...prev[fieldName], error, validating: false }
          }));
          return error;
        }
      }

      // Validación phone
      if (validation.phone) {
        const phoneRegex = /^[\d\s+()-]+$/;
        if (!phoneRegex.test(value) || value.replace(/\D/g, '').length < 10) {
          const error = ErrorMessages.validation.phone;
          setFieldStates(prev => ({
            ...prev,
            [fieldName]: { ...prev[fieldName], error, validating: false }
          }));
          return error;
        }
      }

      // Validaciones custom
      if (validation.custom) {
        for (const rule of validation.custom) {
          const formData = getFormData();
          const isValid = await rule.validate(value, formData);
          
          if (!isValid) {
            const error = typeof rule.message === 'function' 
              ? rule.message(value) 
              : rule.message;
            
            setFieldStates(prev => ({
              ...prev,
              [fieldName]: { ...prev[fieldName], error, validating: false }
            }));
            return error;
          }
        }
      }

      // Sin errores
      setFieldStates(prev => ({
        ...prev,
        [fieldName]: { ...prev[fieldName], error: null, validating: false }
      }));
      return null;

    } catch (error) {
      const errorMessage = 'Error al validar el campo';
      setFieldStates(prev => ({
        ...prev,
        [fieldName]: { ...prev[fieldName], error: errorMessage, validating: false }
      }));
      return errorMessage;
    }
  };

  /**
   * Valida un campo específico
   */
  const validateField = useCallback(async (
    fieldName: string,
    value?: any
  ): Promise<boolean> => {
    const fieldValue = value !== undefined ? value : fieldStates[fieldName]?.value;
    
    if (mode === 'onChange' && debounceMs > 0) {
      validateFieldDebounced.current[fieldName]?.(fieldValue);
      return true; // Retornar true mientras valida
    } else {
      const error = await validateFieldInternal(fieldName, fieldValue);
      return !error;
    }
  }, [fieldStates, mode, debounceMs]);

  /**
   * Valida todos los campos
   */
  const validateAll = useCallback(async (): Promise<boolean> => {
    setIsValidating(true);
    
    const validationPromises = Object.keys(fields).map(fieldName =>
      validateFieldInternal(fieldName, fieldStates[fieldName].value)
    );
    
    const errors = await Promise.all(validationPromises);
    const hasErrors = errors.some(error => error !== null);
    
    setIsValid(!hasErrors);
    setIsValidating(false);
    
    return !hasErrors;
  }, [fields, fieldStates]);

  /**
   * Actualiza el valor de un campo
   */
  const setValue = useCallback((fieldName: string, value: any) => {
    setFieldStates(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], value }
    }));

    if (mode === 'onChange') {
      validateField(fieldName, value);
    }
  }, [mode, validateField]);

  /**
   * Marca un campo como tocado
   */
  const setTouched = useCallback((fieldName: string, touched = true) => {
    setFieldStates(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], touched }
    }));

    if (mode === 'onBlur' && touched) {
      validateField(fieldName);
    }
  }, [mode, validateField]);

  /**
   * Establece un error manual en un campo
   */
  const setError = useCallback((fieldName: string, error: string | null) => {
    setFieldStates(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], error }
    }));
  }, []);

  /**
   * Limpia errores de un campo o todos
   */
  const clearErrors = useCallback((fieldName?: string) => {
    if (fieldName) {
      setFieldStates(prev => ({
        ...prev,
        [fieldName]: { ...prev[fieldName], error: null }
      }));
    } else {
      setFieldStates(prev => {
        const newState = { ...prev };
        Object.keys(newState).forEach(key => {
          newState[key] = { ...newState[key], error: null };
        });
        return newState;
      });
    }
  }, []);

  /**
   * Resetea el formulario
   */
  const reset = useCallback(() => {
    const initialState: Record<string, FieldState> = {};
    
    Object.keys(fields).forEach(fieldName => {
      initialState[fieldName] = {
        value: '',
        error: null,
        touched: false,
        validating: false
      };
    });
    
    setFieldStates(initialState);
    setIsValid(true);
  }, [fields]);

  /**
   * Obtiene los datos del formulario
   */
  const getFormData = useCallback((): Record<string, any> => {
    const data: Record<string, any> = {};
    
    Object.keys(fieldStates).forEach(fieldName => {
      data[fieldName] = fieldStates[fieldName].value;
    });
    
    return data;
  }, [fieldStates]);

  /**
   * Helper para crear props de campo
   */
  const getFieldProps = useCallback((fieldName: string) => ({
    value: fieldStates[fieldName]?.value || '',
    error: fieldStates[fieldName]?.touched ? fieldStates[fieldName]?.error : null,
    helperText: fieldStates[fieldName]?.touched ? fieldStates[fieldName]?.error : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValue(fieldName, e.target.value),
    onBlur: () => setTouched(fieldName, true),
    disabled: isValidating
  }), [fieldStates, setValue, setTouched, isValidating]);

  // Validar en mount si está configurado
  useEffect(() => {
    if (validateOnMount) {
      validateAll();
    }
  }, []);

  // Actualizar isValid cuando cambian los errores
  useEffect(() => {
    const hasErrors = Object.values(fieldStates).some(state => state.error !== null);
    setIsValid(!hasErrors);
  }, [fieldStates]);

  return {
    // Estado
    fieldStates,
    isValidating,
    isValid,
    
    // Acciones
    setValue,
    setTouched,
    setError,
    validateField,
    validateAll,
    clearErrors,
    reset,
    
    // Helpers
    getFormData,
    getFieldProps,
    
    // Utilidades
    hasErrors: !isValid,
    errors: Object.entries(fieldStates).reduce((acc, [key, state]) => {
      if (state.error) acc[key] = state.error;
      return acc;
    }, {} as Record<string, string>)
  };
}