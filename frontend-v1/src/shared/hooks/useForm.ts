import { useState, useCallback, useRef, useEffect } from 'react';

// Hook para manejo de formularios - MVP simple sin librerías externas
// TODO: En Nivel 2 integrar con react-hook-form o formik

interface FormErrors {
  [key: string]: string | undefined;
}

interface FormTouched {
  [key: string]: boolean;
}

interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => FormErrors;
  onSubmit: (values: T) => void | Promise<void>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
  validateOnChange = false,
  validateOnBlur = true
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<FormTouched>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  // Ref para valores anteriores (útil para comparaciones)
  const previousValues = useRef<T>(initialValues);

  // Validar formulario
  const validateForm = useCallback(async (formValues: T = values) => {
    if (!validate) return {};

    setIsValidating(true);
    
    try {
      const validationErrors = await validate(formValues);
      setErrors(validationErrors);
      return validationErrors;
    } catch (error) {
      console.error('Validation error:', error);
      return {};
    } finally {
      setIsValidating(false);
    }
  }, [validate, values]);

  // Validar campo individual
  const validateField = useCallback(async (name: string, value: any) => {
    if (!validate) return;

    const newValues = { ...values, [name]: value };
    const validationErrors = await validate(newValues);
    
    setErrors(prev => ({
      ...prev,
      [name]: validationErrors[name]
    }));
  }, [validate, values]);

  // Handle cambio de valores
  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> | 
       { name: string; value: any }
  ) => {
    const name = 'target' in e ? e.target.name : e.name;
    const value = 'target' in e 
      ? e.target.type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked
        : e.target.value
      : e.value;

    setValues(prev => ({ ...prev, [name]: value }));

    // Validar en cambio si está habilitado
    if (validateOnChange) {
      validateField(name, value);
    }

    // Limpiar error si el campo fue tocado y ahora tiene valor
    if (touched[name] && errors[name] && value) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [touched, errors, validateOnChange, validateField]);

  // Handle blur
  const handleBlur = useCallback((
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> |
       { name: string }
  ) => {
    const name = 'target' in e ? e.target.name : e.name;

    setTouched(prev => ({ ...prev, [name]: true }));

    // Validar en blur si está habilitado
    if (validateOnBlur) {
      validateField(name, values[name]);
    }
  }, [validateOnBlur, validateField, values]);

  // Handle submit
  const handleSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();

    return (async () => {
      setSubmitCount(prev => prev + 1);

      // Marcar todos los campos como tocados
      const allTouched = Object.keys(values).reduce((acc, key) => ({
        ...acc,
        [key]: true
      }), {});
      setTouched(allTouched);

      // Validar formulario
      const validationErrors = await validateForm();
      
      // Si hay errores, no enviar
      if (Object.keys(validationErrors).length > 0) {
        return;
      }

      // Enviar formulario
      setIsSubmitting(true);
      
      try {
        await onSubmit(values);
        
        // Reset después de envío exitoso
        reset();
      } catch (error) {
        console.error('Submit error:', error);
        // Manejar error de envío
        setErrors({
          submit: error instanceof Error ? error.message : 'Error al enviar el formulario'
        });
      } finally {
        setIsSubmitting(false);
      }
    })();
  }, [values, validateForm, onSubmit]);

  // Reset formulario
  const reset = useCallback((newValues?: Partial<T>) => {
    setValues(newValues ? { ...initialValues, ...newValues } : initialValues);
    setErrors({});
    setTouched({});
    setSubmitCount(0);
    previousValues.current = initialValues;
  }, [initialValues]);

  // Set valor individual
  const setValue = useCallback((name: string, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  // Set múltiples valores
  const setFieldValues = useCallback((newValues: Partial<T>) => {
    setValues(prev => ({ ...prev, ...newValues }));
  }, []);

  // Set error individual
  const setFieldError = useCallback((name: string, error: string) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  // Helper para obtener props de campo
  const getFieldProps = useCallback((name: string) => {
    return {
      name,
      value: values[name] || '',
      onChange: handleChange,
      onBlur: handleBlur,
      error: touched[name] ? errors[name] : undefined,
      required: false // Se puede personalizar según necesidad
    };
  }, [values, handleChange, handleBlur, touched, errors]);

  // Detectar si el formulario ha sido modificado
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValues);
  
  // Detectar si el formulario es válido
  const isValid = Object.keys(errors).length === 0;

  return {
    // Estados
    values,
    errors,
    touched,
    isSubmitting,
    isValidating,
    submitCount,
    isDirty,
    isValid,

    // Handlers
    handleChange,
    handleBlur,
    handleSubmit,

    // Métodos útiles
    reset,
    setValue,
    setFieldValues,
    setFieldError,
    getFieldProps,
    validateForm,
    validateField,

    // Helpers para inputs
    register: (name: string) => ({
      name,
      value: values[name] || '',
      onChange: handleChange,
      onBlur: handleBlur
    })
  };
}

// Validadores comunes reutilizables
export const validators = {
  required: (message = 'Campo requerido') => (value: any) => {
    return !value ? message : undefined;
  },

  email: (message = 'Email inválido') => (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return value && !emailRegex.test(value) ? message : undefined;
  },

  minLength: (min: number, message?: string) => (value: string) => {
    const msg = message || `Mínimo ${min} caracteres`;
    return value && value.length < min ? msg : undefined;
  },

  maxLength: (max: number, message?: string) => (value: string) => {
    const msg = message || `Máximo ${max} caracteres`;
    return value && value.length > max ? msg : undefined;
  },

  pattern: (regex: RegExp, message = 'Formato inválido') => (value: string) => {
    return value && !regex.test(value) ? message : undefined;
  },

  number: (message = 'Debe ser un número') => (value: any) => {
    return value && isNaN(Number(value)) ? message : undefined;
  },

  min: (min: number, message?: string) => (value: number) => {
    const msg = message || `Mínimo ${min}`;
    return value && value < min ? msg : undefined;
  },

  max: (max: number, message?: string) => (value: number) => {
    const msg = message || `Máximo ${max}`;
    return value && value > max ? msg : undefined;
  },

  // Combinar múltiples validadores
  compose: (...validators: Array<(value: any) => string | undefined>) => (value: any) => {
    for (const validator of validators) {
      const error = validator(value);
      if (error) return error;
    }
    return undefined;
  }
};

// Hook para campos de formulario individuales
export function useField(name: string, initialValue: any = '', validation?: (value: any) => string | undefined) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string>();
  const [touched, setTouched] = useState(false);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setValue(newValue);

    // Limpiar error al escribir
    if (error && newValue) {
      setError(undefined);
    }
  }, [error]);

  const handleBlur = useCallback(() => {
    setTouched(true);
    
    if (validation) {
      const validationError = validation(value);
      setError(validationError);
    }
  }, [validation, value]);

  const reset = useCallback(() => {
    setValue(initialValue);
    setError(undefined);
    setTouched(false);
  }, [initialValue]);

  return {
    value,
    error: touched ? error : undefined,
    touched,
    setValue,
    setError,
    handleChange,
    handleBlur,
    reset,
    props: {
      name,
      value,
      onChange: handleChange,
      onBlur: handleBlur
    }
  };
}

export default useForm;