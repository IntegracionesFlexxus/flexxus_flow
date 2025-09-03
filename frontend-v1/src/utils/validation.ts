// Utilidades de validación para formularios - MVP Nivel 1
// TODO: En Nivel 2 agregar validaciones asíncronas, validación de servidor

import { RegisterOptions } from 'react-hook-form';

// Reglas de validación comunes
export const validationRules = {
  // Email
  email: {
    required: 'El email es requerido',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Email inválido'
    }
  } as RegisterOptions,

  // Contraseña básica
  password: {
    required: 'La contraseña es requerida',
    minLength: {
      value: 8,
      message: 'La contraseña debe tener al menos 8 caracteres'
    }
  } as RegisterOptions,

  // Contraseña fuerte
  strongPassword: {
    required: 'La contraseña es requerida',
    minLength: {
      value: 8,
      message: 'La contraseña debe tener al menos 8 caracteres'
    },
    pattern: {
      value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      message: 'Debe contener mayúsculas, minúsculas, números y caracteres especiales'
    }
  } as RegisterOptions,

  // Nombre
  firstName: {
    required: 'El nombre es requerido',
    minLength: {
      value: 2,
      message: 'El nombre debe tener al menos 2 caracteres'
    },
    maxLength: {
      value: 50,
      message: 'El nombre no puede exceder 50 caracteres'
    },
    pattern: {
      value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      message: 'Solo se permiten letras'
    }
  } as RegisterOptions,

  // Apellido
  lastName: {
    required: 'El apellido es requerido',
    minLength: {
      value: 2,
      message: 'El apellido debe tener al menos 2 caracteres'
    },
    maxLength: {
      value: 50,
      message: 'El apellido no puede exceder 50 caracteres'
    },
    pattern: {
      value: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
      message: 'Solo se permiten letras'
    }
  } as RegisterOptions,

  // Teléfono
  phone: {
    pattern: {
      value: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
      message: 'Número de teléfono inválido'
    }
  } as RegisterOptions,

  // Teléfono requerido
  phoneRequired: {
    required: 'El teléfono es requerido',
    pattern: {
      value: /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/,
      message: 'Número de teléfono inválido'
    }
  } as RegisterOptions,

  // URL
  url: {
    pattern: {
      value: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
      message: 'URL inválida'
    }
  } as RegisterOptions,

  // Número
  number: {
    required: 'Este campo es requerido',
    pattern: {
      value: /^\d+$/,
      message: 'Solo se permiten números'
    }
  } as RegisterOptions,

  // Número decimal
  decimal: {
    pattern: {
      value: /^\d+(\.\d{1,2})?$/,
      message: 'Formato decimal inválido (máximo 2 decimales)'
    }
  } as RegisterOptions,

  // Código postal
  postalCode: {
    pattern: {
      value: /^\d{5}(-\d{4})?$/,
      message: 'Código postal inválido'
    }
  } as RegisterOptions,

  // Fecha
  date: {
    required: 'La fecha es requerida'
  } as RegisterOptions,

  // Campo requerido genérico
  required: (fieldName: string = 'Este campo'): RegisterOptions => ({
    required: `${fieldName} es requerido`
  }),

  // Longitud mínima
  minLength: (min: number, fieldName: string = 'Este campo'): RegisterOptions => ({
    minLength: {
      value: min,
      message: `${fieldName} debe tener al menos ${min} caracteres`
    }
  }),

  // Longitud máxima
  maxLength: (max: number, fieldName: string = 'Este campo'): RegisterOptions => ({
    maxLength: {
      value: max,
      message: `${fieldName} no puede exceder ${max} caracteres`
    }
  }),

  // Rango de números
  numberRange: (min: number, max: number): RegisterOptions => ({
    min: {
      value: min,
      message: `El valor debe ser mayor o igual a ${min}`
    },
    max: {
      value: max,
      message: `El valor debe ser menor o igual a ${max}`
    }
  })
};

// Validadores personalizados
export const validators = {
  // Confirmar contraseña
  confirmPassword: (password: string) => (value: string) => {
    return value === password || 'Las contraseñas no coinciden';
  },

  // Email único (simulado - en producción sería async)
  uniqueEmail: (existingEmails: string[]) => (value: string) => {
    return !existingEmails.includes(value.toLowerCase()) || 'Este email ya está registrado';
  },

  // Validar RUT/RFC/CURP
  taxId: (type: 'RUT' | 'RFC' | 'CURP') => (value: string) => {
    const patterns = {
      RUT: /^\d{1,2}\.\d{3}\.\d{3}[-][0-9kK]{1}$/,
      RFC: /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/,
      CURP: /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]{2}$/
    };
    
    const pattern = patterns[type];
    return pattern.test(value) || `${type} inválido`;
  },

  // Validar tarjeta de crédito (Luhn algorithm)
  creditCard: (value: string) => {
    const cleanValue = value.replace(/\s/g, '');
    
    if (!/^\d{13,19}$/.test(cleanValue)) {
      return 'Número de tarjeta inválido';
    }

    let sum = 0;
    let isEven = false;
    
    for (let i = cleanValue.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanValue[i], 10);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return (sum % 10 === 0) || 'Número de tarjeta inválido';
  },

  // Validar fecha futura
  futureDate: (value: Date) => {
    return value > new Date() || 'La fecha debe ser futura';
  },

  // Validar fecha pasada
  pastDate: (value: Date) => {
    return value < new Date() || 'La fecha debe ser pasada';
  },

  // Validar edad mínima
  minAge: (minAge: number) => (value: Date) => {
    const today = new Date();
    const birthDate = new Date(value);
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= minAge || `Debes tener al menos ${minAge} años`;
    }
    
    return age >= minAge || `Debes tener al menos ${minAge} años`;
  },

  // Validar archivo
  fileValidation: (options: {
    maxSize?: number; // en MB
    allowedTypes?: string[];
  }) => (files: FileList) => {
    if (!files || files.length === 0) {
      return 'Por favor selecciona un archivo';
    }

    const file = files[0];
    
    // Validar tamaño
    if (options.maxSize && file.size > options.maxSize * 1024 * 1024) {
      return `El archivo no debe exceder ${options.maxSize}MB`;
    }
    
    // Validar tipo
    if (options.allowedTypes) {
      const fileType = file.type;
      const isAllowed = options.allowedTypes.some(type => {
        if (type.includes('*')) {
          const baseType = type.split('/')[0];
          return fileType.startsWith(baseType);
        }
        return fileType === type;
      });
      
      if (!isAllowed) {
        return `Tipo de archivo no permitido. Tipos aceptados: ${options.allowedTypes.join(', ')}`;
      }
    }
    
    return true;
  }
};

// Funciones de formateo
export const formatters = {
  // Formatear teléfono
  phone: (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    
    return value;
  },

  // Formatear tarjeta de crédito
  creditCard: (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g);
    
    return chunks ? chunks.join(' ') : value;
  },

  // Formatear moneda
  currency: (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(value);
  },

  // Formatear fecha
  date: (value: Date, format: 'short' | 'long' = 'short') => {
    const options: Intl.DateTimeFormatOptions = format === 'short'
      ? { year: 'numeric', month: '2-digit', day: '2-digit' }
      : { year: 'numeric', month: 'long', day: 'numeric' };
    
    return new Intl.DateTimeFormat('es-ES', options).format(value);
  },

  // Capitalizar
  capitalize: (value: string) => {
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
  },

  // Título
  titleCase: (value: string) => {
    return value.replace(/\w\S*/g, (txt) => {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }
};

// Mensajes de error personalizados
export const errorMessages = {
  required: (field: string) => `${field} es obligatorio`,
  email: 'Por favor ingresa un email válido',
  minLength: (field: string, min: number) => `${field} debe tener al menos ${min} caracteres`,
  maxLength: (field: string, max: number) => `${field} no puede exceder ${max} caracteres`,
  pattern: (field: string) => `${field} tiene un formato inválido`,
  min: (field: string, min: number) => `${field} debe ser mayor o igual a ${min}`,
  max: (field: string, max: number) => `${field} debe ser menor o igual a ${max}`,
  passwordMatch: 'Las contraseñas no coinciden',
  invalidCredentials: 'Email o contraseña incorrectos',
  serverError: 'Ocurrió un error. Por favor intenta nuevamente',
  networkError: 'Error de conexión. Verifica tu internet',
  duplicateEmail: 'Este email ya está registrado',
  invalidToken: 'Token inválido o expirado',
  sessionExpired: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente'
};

// Helper para obtener mensaje de error
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return errorMessages.serverError;
};

export default {
  validationRules,
  validators,
  formatters,
  errorMessages,
  getErrorMessage
};