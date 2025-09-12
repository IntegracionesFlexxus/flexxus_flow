/**
 * Password Management Service
 * Sprint 3 - Backend Team  
 * Implementación siguiendo lineamientos Nivel 2: SOLID, Clean Code, Inversión de Dependencias
 */

import { injectable, inject } from 'inversify';
import { Logger } from 'winston';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { TYPES } from '@/container/types';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordResetTokenRequest {
  email: string;
  expirationMinutes?: number;
}

export interface PasswordResetTokenResponse {
  token: string;
  expiresAt: Date;
}

/**
 * PasswordService implementa gestión segura de contraseñas
 * Principios SOLID aplicados:
 * - S: Responsabilidad única para gestión de contraseñas
 * - O: Abierto para extensión (nuevas validaciones) cerrado para modificación
 * - L: Sustituible por cualquier implementación que respete la interfaz
 * - I: Segregación de interfaces (específica para passwords)
 * - D: Inversión de dependencias (inyección de dependencias)
 */
@injectable()
export class PasswordService {
  private readonly saltRounds = 12;
  private readonly minLength = 8;
  private readonly maxLength = 128;

  constructor(
    @inject(TYPES.Logger) private logger: Logger
  ) {}

  /**
   * Hash de contraseña usando bcrypt
   * Clean Code: función con responsabilidad única y nombre descriptivo
   */
  async hashPassword(password: string): Promise<string> {
    try {
      // Validar contraseña antes de hacer hash
      const validation = this.validatePassword(password);
      if (!validation.isValid) {
        throw new Error(`Contraseña inválida: ${validation.errors.join(', ')}`);
      }

      // Generar hash usando bcrypt con salt rounds configurables
      const hash = await bcrypt.hash(password, this.saltRounds);

      this.logger.debug('Contraseña hasheada exitosamente');

      return hash;
    } catch (error) {
      this.logger.error('Error al hashear contraseña', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Verificar contraseña contra hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      if (!password || !hash) {
        return false;
      }

      const isValid = await bcrypt.compare(password, hash);

      this.logger.debug('Verificación de contraseña completada', { 
        isValid 
      });

      return isValid;
    } catch (error) {
      this.logger.error('Error al verificar contraseña', { 
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Validar fortaleza de contraseña
   * Implementa reglas de seguridad configurables
   */
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password) {
      errors.push('La contraseña es requerida');
      return { isValid: false, errors };
    }

    // Validar longitud
    if (password.length < this.minLength) {
      errors.push(`La contraseña debe tener al menos ${this.minLength} caracteres`);
    }

    if (password.length > this.maxLength) {
      errors.push(`La contraseña no puede exceder ${this.maxLength} caracteres`);
    }

    // Validar complejidad
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUpperCase) {
      errors.push('La contraseña debe contener al menos una letra mayúscula');
    }

    if (!hasLowerCase) {
      errors.push('La contraseña debe contener al menos una letra minúscula');
    }

    if (!hasNumbers) {
      errors.push('La contraseña debe contener al menos un número');
    }

    if (!hasSpecialChars) {
      errors.push('La contraseña debe contener al menos un carácter especial');
    }

    // Validar patrones comunes débiles
    const weakPatterns = [
      /(.)\1{3,}/, // Caracteres repetidos
      /12345/, // Secuencias numéricas
      /abcde/i, // Secuencias alfabéticas
      /qwerty/i, // Patrones de teclado
      /password/i, // Palabra "password"
      /admin/i // Palabra "admin"
    ];

    for (const pattern of weakPatterns) {
      if (pattern.test(password)) {
        errors.push('La contraseña contiene patrones débiles');
        break;
      }
    }

    const isValid = errors.length === 0;

    this.logger.debug('Validación de contraseña completada', { 
      isValid, 
      errorsCount: errors.length 
    });

    return { isValid, errors };
  }

  /**
   * Generar contraseña temporal segura
   */
  generateTemporaryPassword(length: number = 12): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    // Asegurar al menos un carácter de cada tipo
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Llenar el resto con caracteres aleatorios
    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Mezclar la contraseña para evitar patrones predecibles
    const passwordArray = password.split('');
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }

    const finalPassword = passwordArray.join('');

    this.logger.debug('Contraseña temporal generada', { 
      length: finalPassword.length 
    });

    return finalPassword;
  }

  /**
   * Generar token para reset de contraseña
   */
  generatePasswordResetToken(
    request: PasswordResetTokenRequest
  ): PasswordResetTokenResponse {
    try {
      // Generar token criptográficamente seguro
      const token = crypto.randomBytes(32).toString('hex');

      // Calcular fecha de expiración
      const expirationMinutes = request.expirationMinutes || 60; // 1 hora por defecto
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

      this.logger.info('Token de reset de contraseña generado', {
        email: request.email,
        expiresAt: expiresAt.toISOString(),
        tokenLength: token.length
      });

      return {
        token,
        expiresAt
      };
    } catch (error) {
      this.logger.error('Error al generar token de reset', {
        error: error.message,
        email: request.email
      });
      throw error;
    }
  }

  /**
   * Verificar token de reset de contraseña
   */
  verifyPasswordResetToken(token: string, storedToken: string, expiresAt: Date): boolean {
    try {
      // Verificar que el token no haya expirado
      if (new Date() > expiresAt) {
        this.logger.warn('Token de reset expirado');
        return false;
      }

      // Comparación segura de tokens
      const isValid = crypto.timingSafeEqual(
        Buffer.from(token, 'hex'),
        Buffer.from(storedToken, 'hex')
      );

      this.logger.debug('Verificación de token de reset completada', { 
        isValid 
      });

      return isValid;
    } catch (error) {
      this.logger.error('Error al verificar token de reset', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Verificar si la contraseña necesita ser actualizada
   * Basado en la fecha del último hash
   */
  needsRehashing(hash: string): boolean {
    try {
      // bcrypt incluye información sobre el costo en el hash
      const rounds = bcrypt.getRounds(hash);

      // Si los rounds actuales son menores a los configurados, necesita rehash
      const needsUpdate = rounds < this.saltRounds;

      this.logger.debug('Verificación de rehash completada', {
        currentRounds: rounds,
        configuredRounds: this.saltRounds,
        needsUpdate
      });

      return needsUpdate;
    } catch (error) {
      this.logger.error('Error al verificar necesidad de rehash', {
        error: error.message
      });
      // En caso de error, asumir que necesita rehash por seguridad
      return true;
    }
  }

  /**
   * Limpiar datos sensibles de memoria
   * Medida de seguridad adicional
   */
  private clearSensitiveData(data: string): void {
    // En JavaScript no podemos realmente "limpiar" la memoria,
    // pero podemos sobrescribir la referencia
    if (data) {
      data = '';
    }
  }
}
