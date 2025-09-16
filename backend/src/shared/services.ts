// Servicios compartidos simples - Sin DI Container (Nivel 1)
// TODO: Migrar a Inversify o similar en Nivel 2 si se requiere

import { Pool } from 'pg';
import { config } from '@config/environment';

// Logger simple - sin librerías externas por ahora
export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },
  
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  },
  
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  },
  
  debug: (message: string, ...args: any[]) => {
    if (config.nodeEnv === 'development') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
    }
  }
};

// Cache en memoria simple - sin Redis por ahora
class SimpleCache {
  private cache: Map<string, { value: any; expiry: number }> = new Map();
  
  set(key: string, value: any, ttlSeconds: number = 300): void {
    const expiry = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiry });
  }
  
  get(key: string): any {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
}

export const cache = new SimpleCache();

// Event emitter simple - para comunicación entre módulos
class SimpleEventBus {
  private listeners: Map<string, Function[]> = new Map();
  
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Error en evento ${event}:`, error);
        }
      });
    }
  }
  
  off(event: string, callback?: Function): void {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    }
  }
}

export const eventBus = new SimpleEventBus();

// Validador simple - sin Joi por ahora
export const validator = {
  isEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },
  
  isPhone: (phone: string): boolean => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  },
  
  required: (value: any, fieldName: string): void => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      throw new Error(`${fieldName} es requerido`);
    }
  },
  
  minLength: (value: string, min: number, fieldName: string): void => {
    if (value.length < min) {
      throw new Error(`${fieldName} debe tener al menos ${min} caracteres`);
    }
  }
};

// Utilidades compartidas
export const utils = {
  // Generar ID único simple
  generateId: (prefix: string = ''): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  },
  
  // Sleep para testing o delays
  sleep: (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  // Hash simple para passwords (TODO: usar bcrypt en Nivel 2)
  hashPassword: (password: string): string => {
    // ADVERTENCIA: Esto es solo para desarrollo, usar bcrypt en producción
    return Buffer.from(password).toString('base64');
  },
  
  // Verificar password
  verifyPassword: (password: string, hash: string): boolean => {
    // ADVERTENCIA: Esto es solo para desarrollo, usar bcrypt en producción
    return Buffer.from(password).toString('base64') === hash;
  },
  
  // Formatear respuesta API
  apiResponse: (success: boolean, data?: any, message?: string) => {
    return {
      success,
      ...(message && { message }),
      ...(data !== undefined && { data }),
      timestamp: new Date().toISOString()
    };
  }
};

// Exportar todo como un objeto para fácil acceso
export const services = {
  logger,
  cache,
  eventBus,
  validator,
  utils
};