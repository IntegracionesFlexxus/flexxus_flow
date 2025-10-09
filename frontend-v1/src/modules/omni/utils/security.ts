/**
 * Security Utilities
 * Utilidades para manejo seguro de credenciales y datos sensibles
 */

import CryptoJS from 'crypto-js';

/**
 * Configuración de seguridad
 */
const SECURITY_CONFIG = {
  // Prefijo para identificar datos encriptados
  ENCRYPTION_PREFIX: '__encrypted__',

  // Tiempo de vida de tokens temporales (en minutos)
  TEMP_TOKEN_TTL: 15,

  // Longitud mínima para tokens seguros
  MIN_TOKEN_LENGTH: 32,

  // Campos que deben ser encriptados
  SENSITIVE_FIELDS: [
    'accessToken',
    'apiKey',
    'apiSecret',
    'authToken',
    'smtpPassword',
    'pageAccessToken',
    'appSecret',
    'webhookVerifyToken'
  ],

  // Patrones para detectar datos sensibles
  SENSITIVE_PATTERNS: [
    /token/i,
    /secret/i,
    /password/i,
    /key/i,
    /credential/i,
    /auth/i
  ]
};

/**
 * Clase para manejo de seguridad
 */
export class SecurityService {
  private encryptionKey: string;
  private sessionKey: string | null = null;

  constructor() {
    // Usar una clave derivada del entorno o generar una temporal
    this.encryptionKey = this.deriveEncryptionKey();

    // Generar clave de sesión
    this.initializeSessionKey();
  }

  /**
   * Deriva una clave de encriptación basada en el entorno
   * IMPORTANTE: Esta clave debe ser FIJA y NO cambiar con el tiempo o dispositivo
   * para que las credenciales encriptadas puedan ser desencriptadas posteriormente
   */
  private deriveEncryptionKey(): string {
    // En producción, esto debería venir del backend o estar configurado en el entorno
    const baseKey = process.env.REACT_APP_ENCRYPTION_KEY || 'flexxus_flow_omni_2024';

    // FIXED: Removido timestamp y userAgent para que la clave sea consistente
    // La clave ahora es la misma independientemente de la fecha o dispositivo
    // Esto permite al backend desencriptar las credenciales guardadas
    return CryptoJS.SHA256(baseKey).toString();
  }

  /**
   * Inicializa la clave de sesión
   */
  private initializeSessionKey(): void {
    // Intentar recuperar de sessionStorage
    const stored = sessionStorage.getItem('omni_session_key');

    if (stored) {
      this.sessionKey = stored;
    } else {
      // Generar nueva clave de sesión
      this.sessionKey = this.generateSecureToken(64);
      sessionStorage.setItem('omni_session_key', this.sessionKey);
    }
  }

  /**
   * Encripta un valor sensible
   */
  encrypt(value: string): string {
    if (!value) return value;

    try {
      const encrypted = CryptoJS.AES.encrypt(value, this.encryptionKey).toString();
      return `${SECURITY_CONFIG.ENCRYPTION_PREFIX}${encrypted}`;
    } catch (error) {
      console.error('Error al encriptar:', error);
      return value; // Retornar sin encriptar en caso de error
    }
  }

  /**
   * Desencripta un valor
   */
  decrypt(encryptedValue: string): string {
    if (!encryptedValue) return encryptedValue;

    // Verificar si el valor está encriptado
    if (!this.isEncrypted(encryptedValue)) {
      return encryptedValue;
    }

    try {
      // Remover el prefijo
      const encrypted = encryptedValue.substring(SECURITY_CONFIG.ENCRYPTION_PREFIX.length);
      const decrypted = CryptoJS.AES.decrypt(encrypted, this.encryptionKey);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Error al desencriptar:', error);
      return '';
    }
  }

  /**
   * Verifica si un valor está encriptado
   */
  isEncrypted(value: string): boolean {
    return value?.startsWith(SECURITY_CONFIG.ENCRYPTION_PREFIX) || false;
  }

  /**
   * Encripta todos los campos sensibles en un objeto
   */
  encryptSensitiveFields(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const encrypted = { ...data };

    // Función recursiva para encriptar campos anidados
    const processObject = (obj: any, path: string = '') => {
      Object.keys(obj).forEach(key => {
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof obj[key] === 'object' && obj[key] !== null) {
          // Procesar objetos anidados
          processObject(obj[key], currentPath);
        } else if (typeof obj[key] === 'string' && this.isSensitiveField(key)) {
          // Encriptar campo sensible
          obj[key] = this.encrypt(obj[key]);
        }
      });
    };

    processObject(encrypted);
    return encrypted;
  }

  /**
   * Desencripta todos los campos sensibles en un objeto
   */
  decryptSensitiveFields(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const decrypted = { ...data };

    // Función recursiva para desencriptar campos anidados
    const processObject = (obj: any) => {
      Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          // Procesar objetos anidados
          processObject(obj[key]);
        } else if (typeof obj[key] === 'string' && this.isEncrypted(obj[key])) {
          // Desencriptar campo
          obj[key] = this.decrypt(obj[key]);
        }
      });
    };

    processObject(decrypted);
    return decrypted;
  }

  /**
   * Determina si un campo es sensible
   */
  private isSensitiveField(fieldName: string): boolean {
    // Verificar lista exacta de campos
    if (SECURITY_CONFIG.SENSITIVE_FIELDS.includes(fieldName)) {
      return true;
    }

    // Verificar patrones
    return SECURITY_CONFIG.SENSITIVE_PATTERNS.some(pattern =>
      pattern.test(fieldName)
    );
  }

  /**
   * Genera un token seguro
   */
  generateSecureToken(length: number = SECURITY_CONFIG.MIN_TOKEN_LENGTH): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let token = '';

    // Usar crypto.getRandomValues para mejor aleatoriedad
    const randomValues = new Uint32Array(length);
    window.crypto.getRandomValues(randomValues);

    for (let i = 0; i < length; i++) {
      token += chars[randomValues[i] % chars.length];
    }

    return token;
  }

  /**
   * Hashea un valor (para comparaciones sin exponer el original)
   */
  hash(value: string): string {
    return CryptoJS.SHA256(value).toString();
  }

  /**
   * Valida la fortaleza de una contraseña
   */
  validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // Longitud mínima
    if (password.length >= 8) {
      score += 25;
    } else {
      feedback.push('La contraseña debe tener al menos 8 caracteres');
    }

    // Mayúsculas
    if (/[A-Z]/.test(password)) {
      score += 25;
    } else {
      feedback.push('Incluye al menos una letra mayúscula');
    }

    // Minúsculas
    if (/[a-z]/.test(password)) {
      score += 25;
    } else {
      feedback.push('Incluye al menos una letra minúscula');
    }

    // Números
    if (/\d/.test(password)) {
      score += 15;
    } else {
      feedback.push('Incluye al menos un número');
    }

    // Caracteres especiales
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password)) {
      score += 10;
    } else {
      feedback.push('Incluye al menos un carácter especial');
    }

    return {
      isValid: score >= 75,
      score,
      feedback
    };
  }

  /**
   * Sanitiza entrada de usuario para prevenir XSS
   */
  sanitizeInput(input: string): string {
    if (!input) return input;

    // Remover tags HTML y scripts
    let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Escapar caracteres especiales HTML
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };

    sanitized = sanitized.replace(/[&<>"'/]/g, (char) => map[char]);

    // Limitar longitud
    return sanitized.substring(0, 10000);
  }

  /**
   * Crea un token temporal con expiración
   */
  createTemporaryToken(data: any, ttlMinutes: number = SECURITY_CONFIG.TEMP_TOKEN_TTL): string {
    const payload = {
      data,
      expires: Date.now() + (ttlMinutes * 60 * 1000),
      nonce: this.generateSecureToken(16)
    };

    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(payload),
      this.sessionKey || this.encryptionKey
    ).toString();

    return btoa(encrypted);
  }

  /**
   * Valida y extrae datos de un token temporal
   */
  validateTemporaryToken(token: string): any | null {
    try {
      const encrypted = atob(token);
      const decrypted = CryptoJS.AES.decrypt(
        encrypted,
        this.sessionKey || this.encryptionKey
      ).toString(CryptoJS.enc.Utf8);

      const payload = JSON.parse(decrypted);

      // Verificar expiración
      if (payload.expires < Date.now()) {
        console.warn('Token temporal expirado');
        return null;
      }

      return payload.data;
    } catch (error) {
      console.error('Error al validar token temporal:', error);
      return null;
    }
  }

  /**
   * Ofusca datos sensibles para logging
   */
  obfuscate(value: string, visibleChars: number = 4): string {
    if (!value || value.length <= visibleChars * 2) {
      return '***';
    }

    const start = value.substring(0, visibleChars);
    const end = value.substring(value.length - visibleChars);
    const middle = '*'.repeat(Math.min(10, value.length - visibleChars * 2));

    return `${start}${middle}${end}`;
  }

  /**
   * Limpia datos sensibles de la memoria
   */
  clearSensitiveData(): void {
    // Limpiar sessionStorage
    sessionStorage.removeItem('omni_session_key');

    // Resetear clave de sesión
    this.sessionKey = null;

    // Forzar garbage collection (si está disponible)
    if (window.gc) {
      window.gc();
    }
  }
}

// Instancia singleton
export const securityService = new SecurityService();

/**
 * Hook para usar el servicio de seguridad
 */
export const useSecurity = () => {
  return securityService;
};

/**
 * Utilidades de seguridad exportadas
 */
export const SecurityUtils = {
  /**
   * Valida si un token es seguro
   */
  isSecureToken: (token: string): boolean => {
    if (!token) return false;

    // Verificar longitud mínima
    if (token.length < SECURITY_CONFIG.MIN_TOKEN_LENGTH) return false;

    // Verificar complejidad (debe tener letras, números y al menos un carácter especial)
    const hasLetters = /[a-zA-Z]/.test(token);
    const hasNumbers = /\d/.test(token);
    const hasSpecial = /[^a-zA-Z0-9]/.test(token);

    return hasLetters && hasNumbers && hasSpecial;
  },

  /**
   * Genera un ID único seguro
   */
  generateSecureId: (): string => {
    const timestamp = Date.now().toString(36);
    const randomPart = securityService.generateSecureToken(8);
    return `${timestamp}_${randomPart}`;
  },

  /**
   * Valida formato de email
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Valida formato de número de teléfono internacional
   */
  isValidPhoneNumber: (phone: string): boolean => {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  },

  /**
   * Extrae y valida dominio de una URL
   */
  extractDomain: (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return null;
    }
  },

  /**
   * Verifica si una URL es segura (HTTPS)
   */
  isSecureUrl: (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }
};

export default securityService;