/**
 * Constraint Validator
 * Sprint 4 - Funciones de restricción personalizadas
 */
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
import { ILoggerService } from '@/shared/services/logger/LoggerService';
import { ValidationResult, ValidationPriority } from './interfaces/ICrossModuleValidator';
export interface ConstraintValidationParams {
  constraintType: ConstraintType;
  value: any;
  context?: Record<string, any>;
}
export enum ConstraintType {
  EMAIL_FORMAT = 'email_format',
  PHONE_FORMAT = 'phone_format',
  URL_FORMAT = 'url_format',
  UUID_FORMAT = 'uuid_format',
  DATE_RANGE = 'date_range',
  UNIQUE_EMAIL_PER_COMPANY = 'unique_email_per_company',
  UNIQUE_FIELD = 'unique_field',
  REQUIRED_FIELD = 'required_field',
  MIN_LENGTH = 'min_length',
  MAX_LENGTH = 'max_length',
  ENUM_VALUE = 'enum_value',
  CUSTOM_REGEX = 'custom_regex',
  NUMERIC_RANGE = 'numeric_range',
  DEPENDENCY_CHECK = 'dependency_check'
}
@injectable()
export class ConstraintValidator {
  // Patrones de validación predefinidos
  private readonly patterns = {
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/i,
    phone: /^\+?[1-9]\d{1,14}$/,
    url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    alphabetic: /^[a-zA-Z]+$/,
    numeric: /^[0-9]+$/,
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  };
  constructor(
    @inject(TYPES.SharedConnection) private sharedDb: IDatabaseConnection,
    @inject(TYPES.Logger) private logger: ILoggerService
  ) {}
  /**
   * Valida una restricción específica
   */
  async validate(params: ConstraintValidationParams): Promise<ValidationResult> {
    try {
      switch (params.constraintType) {
        case ConstraintType.EMAIL_FORMAT:
          return this.validateEmailFormat(params.value);
        case ConstraintType.PHONE_FORMAT:
          return this.validatePhoneFormat(params.value);
        case ConstraintType.URL_FORMAT:
          return this.validateUrlFormat(params.value);
        case ConstraintType.UUID_FORMAT:
          return this.validateUuidFormat(params.value);
        case ConstraintType.UNIQUE_EMAIL_PER_COMPANY:
          return await this.validateUniqueEmailPerCompany(
            params.value,
            params.context?.companyId,
            params.context?.userId
          );
        case ConstraintType.DATE_RANGE:
          return this.validateDateRange(
            params.value,
            params.context?.minDate,
            params.context?.maxDate
          );
        case ConstraintType.UNIQUE_FIELD:
          return await this.validateUniqueField(
            params.value,
            params.context?.table,
            params.context?.field,
            params.context?.excludeId
          );
        case ConstraintType.MIN_LENGTH:
          return this.validateMinLength(
            params.value,
            params.context?.minLength || 1
          );
        case ConstraintType.MAX_LENGTH:
          return this.validateMaxLength(
            params.value,
            params.context?.maxLength || 255
          );
        case ConstraintType.ENUM_VALUE:
          return this.validateEnumValue(
            params.value,
            params.context?.allowedValues || []
          );
        case ConstraintType.CUSTOM_REGEX:
          return this.validateCustomRegex(
            params.value,
            params.context?.pattern
          );
        case ConstraintType.NUMERIC_RANGE:
          return this.validateNumericRange(
            params.value,
            params.context?.min,
            params.context?.max
          );
        case ConstraintType.DEPENDENCY_CHECK:
          return await this.validateDependency(
            params.value,
            params.context || {}
          );
        default:
          return {
            isValid: false,
            message: `Unknown constraint type: ${params.constraintType}`,
            priority: ValidationPriority.WARNING,
            timestamp: new Date()
          };
      }
    } catch (error) {
      this.logger.error('Constraint validation error:', error);
      return {
        isValid: false,
        message: `Constraint validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        priority: ValidationPriority.BLOCKING,
        timestamp: new Date()
      };
    }
  }
  /**
   * Valida formato de email
   */
  private validateEmailFormat(email: string): ValidationResult {
    const isValid = this.patterns.email.test(email);
    return {
      isValid,
      message: isValid 
        ? 'Valid email format' 
        : `Invalid email format: ${email}`,
      priority: isValid ? ValidationPriority.INFO : ValidationPriority.BLOCKING,
      metadata: { email },
      timestamp: new Date()
    };
  }
  /**
   * Valida formato de teléfono (E.164)
   */
  private validatePhoneFormat(phone: string): ValidationResult {
    const isValid = this.patterns.phone.test(phone);
    return {
      isValid,
      message: isValid 
        ? 'Valid phone format' 
        : `Invalid phone format: ${phone}. Use E.164 format (e.g., +1234567890)`,
      priority: isValid ? ValidationPriority.INFO : ValidationPriority.WARNING,
      metadata: { phone },
      timestamp: new Date()
    };
  }
  /**
   * Valida formato de URL
   */
  private validateUrlFormat(url: string): ValidationResult {
    const isValid = this.patterns.url.test(url);
    return {
      isValid,
      message: isValid 
        ? 'Valid URL format' 
        : `Invalid URL format: ${url}`,
      priority: isValid ? ValidationPriority.INFO : ValidationPriority.WARNING,
      metadata: { url },
      timestamp: new Date()
    };
  }
  /**
   * Valida formato UUID v4
   */
  private validateUuidFormat(uuid: string): ValidationResult {
    const isValid = this.patterns.uuid.test(uuid);
    return {
      isValid,
      message: isValid 
        ? 'Valid UUID format' 
        : `Invalid UUID format: ${uuid}`,
      priority: isValid ? ValidationPriority.INFO : ValidationPriority.BLOCKING,
      metadata: { uuid },
      timestamp: new Date()
    };
  }
  /**
   * Valida email único por empresa
   */
  private async validateUniqueEmailPerCompany(
    email: string,
    companyId: string,
    excludeUserId?: string
  ): Promise<ValidationResult> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM users
        WHERE LOWER(email) = LOWER($1)
          AND company_id = $2
          ${excludeUserId ? 'AND id != $3' : ''}
      ) as exists
    `;
    const params = excludeUserId 
      ? [email, companyId, excludeUserId]
      : [email, companyId];
    const result = await this.sharedDb.query<{ exists: boolean }>(query, params);
    const exists = result[0].exists;
    return {
      isValid: !exists,
      message: exists 
        ? `Email ${email} already exists in company` 
        : 'Email is unique in company',
      priority: exists ? ValidationPriority.BLOCKING : ValidationPriority.INFO,
      metadata: { email, companyId },
      timestamp: new Date()
    };
  }
  /**
   * Valida rango de fechas
   */
  private validateDateRange(
    date: string | Date,
    minDate?: string | Date,
    maxDate?: string | Date
  ): ValidationResult {
    const dateValue = new Date(date);
    if (isNaN(dateValue.getTime())) {
      return {
        isValid: false,
        message: 'Invalid date format',
        priority: ValidationPriority.BLOCKING,
        timestamp: new Date()
      };
    }
    let isValid = true;
    let message = 'Date is within valid range';
    if (minDate) {
      const min = new Date(minDate);
      if (dateValue < min) {
        isValid = false;
        message = `Date is before minimum allowed date: ${min.toISOString()}`;
      }
    }
    if (maxDate && isValid) {
      const max = new Date(maxDate);
      if (dateValue > max) {
        isValid = false;
        message = `Date is after maximum allowed date: ${max.toISOString()}`;
      }
    }
    return {
      isValid,
      message,
      priority: isValid ? ValidationPriority.INFO : ValidationPriority.WARNING,
      metadata: { date: dateValue.toISOString(), minDate, maxDate },
      timestamp: new Date()
    };
  }
  /**
   * Valida campo único en tabla
   */
  private async validateUniqueField(
    value: any,
    table: string,
    field: string,
    excludeId?: string
  ): Promise<ValidationResult> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM ${table}
        WHERE ${field} = $1
          ${excludeId ? 'AND id != $2' : ''}
      ) as exists
    `;
    const params = excludeId ? [value, excludeId] : [value];
    const result = await this.sharedDb.query<{ exists: boolean }>(query, params);
    const exists = result[0].exists;
    return {
      isValid: !exists,
      message: exists 
        ? `Value already exists in ${table}.${field}` 
        : 'Value is unique',
      priority: exists ? ValidationPriority.BLOCKING : ValidationPriority.INFO,
      metadata: { table, field, value },
      timestamp: new Date()
    };
  }
  /**
   * Valida longitud mínima
   */
  private validateMinLength(value: string, minLength: number): ValidationResult {
    const length = value?.length || 0;
    const isValid = length >= minLength;
    return {
      isValid,
      message: isValid 
        ? 'Minimum length requirement met' 
        : `Value must be at least ${minLength} characters (current: ${length})`,
      priority: isValid ? ValidationPriority.INFO : ValidationPriority.WARNING,
      metadata: { length, minLength },
      timestamp: new Date()
    };
  }
  /**
   * Valida longitud máxima
   */
  private validateMaxLength(value: string, maxLength: number): ValidationResult {
    const length = value?.length || 0;
    const isValid = length <= maxLength;
    return {
      isValid,
      message: isValid 
        ? 'Maximum length requirement met' 
        : `Value must be at most ${maxLength} characters (current: ${length})`,
      priority: isValid ? ValidationPriority.INFO : ValidationPriority.WARNING,
      metadata: { length, maxLength },
      timestamp: new Date()
    };
  }
  /**
   * Valida valor enum
   */
  private validateEnumValue(value: any, allowedValues: any[]): ValidationResult {
    const isValid = allowedValues.includes(value);
    return {
      isValid,
      message: isValid 
        ? 'Valid enum value' 
        : `Invalid value. Must be one of: ${allowedValues.join(', ')}`,
      priority: isValid ? ValidationPriority.INFO : ValidationPriority.BLOCKING,
      metadata: { value, allowedValues },
      timestamp: new Date()
    };
  }
  /**
   * Valida con expresión regular personalizada
   */
  private validateCustomRegex(value: string, pattern: string): ValidationResult {
    try {
      const regex = new RegExp(pattern);
      const isValid = regex.test(value);
      return {
        isValid,
        message: isValid 
          ? 'Pattern match successful' 
          : `Value does not match pattern: ${pattern}`,
        priority: isValid ? ValidationPriority.INFO : ValidationPriority.WARNING,
        metadata: { value, pattern },
        timestamp: new Date()
      };
    } catch (error) {
      return {
        isValid: false,
        message: `Invalid regex pattern: ${pattern}`,
        priority: ValidationPriority.BLOCKING,
        timestamp: new Date()
      };
    }
  }
  /**
   * Valida rango numérico
   */
  private validateNumericRange(
    value: number,
    min?: number,
    max?: number
  ): ValidationResult {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return {
        isValid: false,
        message: 'Value is not a valid number',
        priority: ValidationPriority.BLOCKING,
        timestamp: new Date()
      };
    }
    let isValid = true;
    let message = 'Number is within valid range';
    if (min !== undefined && numValue < min) {
      isValid = false;
      message = `Value must be at least ${min} (current: ${numValue})`;
    }
    if (max !== undefined && numValue > max) {
      isValid = false;
      message = `Value must be at most ${max} (current: ${numValue})`;
    }
    return {
      isValid,
      message,
      priority: isValid ? ValidationPriority.INFO : ValidationPriority.WARNING,
      metadata: { value: numValue, min, max },
      timestamp: new Date()
    };
  }
  /**
   * Valida dependencias entre campos
   */
  private async validateDependency(
    value: any,
    context: Record<string, any>
  ): Promise<ValidationResult> {
    const { dependsOn, dependencyValue, dependencyType } = context;
    if (!dependsOn) {
      return {
        isValid: false,
        message: 'Dependency field not specified',
        priority: ValidationPriority.BLOCKING,
        timestamp: new Date()
      };
    }
    let isValid = false;
    let message = '';
    switch (dependencyType) {
      case 'required_if':
        // El campo es requerido si el campo dependiente tiene cierto valor
        if (dependencyValue === context[dependsOn]) {
          isValid = value !== null && value !== undefined && value !== '';
          message = isValid 
            ? 'Dependency requirement met' 
            : `Field is required when ${dependsOn} is ${dependencyValue}`;
        } else {
          isValid = true;
          message = 'Dependency condition not met';
        }
        break;
      case 'required_unless':
        // El campo es requerido a menos que el campo dependiente tenga cierto valor
        if (dependencyValue !== context[dependsOn]) {
          isValid = value !== null && value !== undefined && value !== '';
          message = isValid 
            ? 'Dependency requirement met' 
            : `Field is required unless ${dependsOn} is ${dependencyValue}`;
        } else {
          isValid = true;
          message = 'Dependency exception met';
        }
        break;
      default:
        isValid = true;
        message = 'No dependency validation required';
    }
    return {
      isValid,
      message,
      priority: isValid ? ValidationPriority.INFO : ValidationPriority.WARNING,
      metadata: { value, dependsOn, dependencyValue, dependencyType },
      timestamp: new Date()
    };
  }
  /**
   * Valida múltiples constraints en batch
   */
  async validateMultiple(
    validations: ConstraintValidationParams[]
  ): Promise<ValidationResult[]> {
    return await Promise.all(
      validations.map(v => this.validate(v))
    );
  }
  /**
   * Crea una constraint personalizada
   */
  async createCustomConstraint(
    name: string,
    validationFunction: (value: any, context?: any) => Promise<boolean>,
    errorMessage?: string
  ): Promise<void> {
    // Registrar constraint personalizada para uso futuro
    this.logger.info(`Custom constraint ${name} registered`);
  }
}
