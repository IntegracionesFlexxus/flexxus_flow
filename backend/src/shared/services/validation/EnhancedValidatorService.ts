/**
 * Enhanced Validator Service
 * Sprint 4 - Validador avanzado con reglas de negocio y sanitización
 */
import { injectable, inject, optional } from 'inversify';
import * as Joi from 'joi';
import validator from 'validator';
import DOMPurify from 'isomorphic-dompurify';
import { Logger } from 'winston';
import { TYPES } from '@/container/types';
import { ValidatorService, ValidationError } from '@/shared/services/common/ValidatorService';
export interface ValidationRule {
  field: string;
  rules: string[];
  message?: string;
  sanitize?: boolean;
}
export interface ValidationSchema {
  [key: string]: ValidationRule | any;
}
export interface ValidationResult {
  isValid: boolean;
  errors?: ValidationError[];
  sanitizedData?: any;
}
export interface BusinessRule {
  name: string;
  validate: (data: any, context?: any) => Promise<boolean>;
  message: string;
}
export interface ConditionalValidation {
  when: (data: any) => boolean;
  then: ValidationRule[];
  otherwise?: ValidationRule[];
}
@injectable()
export class EnhancedValidatorService extends ValidatorService {
  private businessRules: Map<string, BusinessRule[]> = new Map();
  private customValidators: Map<string, (value: any, params?: any) => boolean> = new Map();
  private logger?: Logger;
  constructor(
    @inject(TYPES.Logger) @optional() logger?: Logger
  ) {
    super();
    this.logger = logger;
    this.registerDefaultCustomValidators();
  }
  /**
   * Register default custom validators
   */
  private registerDefaultCustomValidators(): void {
    // Credit card validation
    this.customValidators.set('creditCard', (value: string) => {
      return validator.isCreditCard(value);
    });
    // IBAN validation
    this.customValidators.set('iban', (value: string) => {
      return validator.isIBAN(value);
    });
    // Postal code validation
    this.customValidators.set('postalCode', (value: string, locale: string = 'any') => {
      return validator.isPostalCode(value, locale as any);
    });
    // VAT number validation
    this.customValidators.set('vat', (value: string, countryCode: string) => {
      return this.validateVAT(value, countryCode);
    });
    // Domain validation
    this.customValidators.set('domain', (value: string) => {
      return validator.isFQDN(value);
    });
    // Color validation (hex, rgb, etc.)
    this.customValidators.set('color', (value: string) => {
      return validator.isHexColor(value) || validator.isRgbColor(value) || validator.isHSL(value);
    });
    // JSON validation
    this.customValidators.set('json', (value: string) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    });
    // Base64 validation
    this.customValidators.set('base64', (value: string) => {
      return validator.isBase64(value);
    });
    // JWT validation
    this.customValidators.set('jwt', (value: string) => {
      return validator.isJWT(value);
    });
    // Slug validation
    this.customValidators.set('slug', (value: string) => {
      return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
    });
  }
  /**
   * Advanced validation with business rules
   */
  async validateWithRules(
    data: any,
    schema: ValidationSchema,
    businessRuleSet?: string
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const sanitizedData: any = {};
    // Schema validation
    for (const [field, rules] of Object.entries(schema)) {
      const value = this.getNestedValue(data, field);
      if (rules instanceof Object && rules.rules) {
        const fieldErrors = await this.validateField(field, value, rules);
        errors.push(...fieldErrors);
        // Sanitize if requested
        if (rules.sanitize) {
          sanitizedData[field] = this.sanitizeValue(value, rules.rules);
        } else {
          sanitizedData[field] = value;
        }
      }
    }
    // Business rules validation
    if (businessRuleSet) {
      const businessErrors = await this.validateBusinessRules(data, businessRuleSet);
      errors.push(...businessErrors);
    }
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      sanitizedData
    };
  }
  /**
   * Validate a single field
   */
  private async validateField(
    field: string,
    value: any,
    rules: ValidationRule
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    for (const rule of rules.rules) {
      const [ruleName, ...params] = rule.split(':');
      const isValid = await this.applyRule(ruleName, value, params);
      if (!isValid) {
        errors.push(new ValidationError(
          rules.message || `Validation failed for field ${field} with rule ${ruleName}`,
          field,
          value
        ));
      }
    }
    return errors;
  }
  /**
   * Apply a validation rule
   */
  private async applyRule(ruleName: string, value: any, params: string[]): Promise<boolean> {
    switch (ruleName) {
      case 'required':
        return value !== null && value !== undefined && value !== '';
      case 'email':
        return this.isEmail(value);
      case 'phone':
        return this.isPhone(value);
      case 'uuid':
        return this.isUUID(value);
      case 'url':
        return this.isUrl(value);
      case 'date':
        return this.isDate(value);
      case 'number':
        return this.isNumber(value);
      case 'integer':
        return this.isInteger(value);
      case 'positive':
        return this.isPositive(value);
      case 'min':
        return this.minLength(value, parseInt(params[0]));
      case 'max':
        return this.maxLength(value, parseInt(params[0]));
      case 'between':
        return this.isInRange(value, parseInt(params[0]), parseInt(params[1]));
      case 'regex':
        return this.matches(value, new RegExp(params[0]));
      case 'alphanumeric':
        return this.isAlphanumeric(value);
      case 'strongPassword':
        return this.isStrongPassword(value);
      case 'in':
        return params.includes(value);
      case 'notIn':
        return !params.includes(value);
      case 'unique':
        // This would require database check
        return await this.checkUniqueness(value, params[0], params[1]);
      case 'exists':
        // This would require database check
        return await this.checkExistence(value, params[0], params[1]);
      default:
        // Check custom validators
        if (this.customValidators.has(ruleName)) {
          const validator = this.customValidators.get(ruleName)!;
          return validator(value, ...params);
        }
        return true;
    }
  }
  /**
   * Conditional validation
   */
  async validateConditional(
    data: any,
    conditions: ConditionalValidation[]
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const sanitizedData = { ...data };
    for (const condition of conditions) {
      const shouldApplyThen = condition.when(data);
      const rulesToApply = shouldApplyThen ? condition.then : (condition.otherwise || []);
      for (const rule of rulesToApply) {
        const value = this.getNestedValue(data, rule.field);
        const fieldErrors = await this.validateField(rule.field, value, rule);
        errors.push(...fieldErrors);
      }
    }
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      sanitizedData
    };
  }
  /**
   * Register business rules
   */
  registerBusinessRules(ruleSet: string, rules: BusinessRule[]): void {
    this.businessRules.set(ruleSet, rules);
  }
  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    data: any,
    ruleSet: string
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const rules = this.businessRules.get(ruleSet);
    if (!rules) {
      return errors;
    }
    for (const rule of rules) {
      try {
        const isValid = await rule.validate(data);
        if (!isValid) {
          errors.push(new ValidationError(rule.message, rule.name));
        }
      } catch (error) {
        this.logger?.error(`Business rule ${rule.name} failed:`, error);
        errors.push(new ValidationError(
          `Business rule ${rule.name} failed: ${error.message}`,
          rule.name
        ));
      }
    }
    return errors;
  }
  /**
   * Register custom validator
   */
  registerCustomValidator(
    name: string,
    validator: (value: any, params?: any) => boolean
  ): void {
    this.customValidators.set(name, validator);
  }
  /**
   * Advanced sanitization
   */
  private sanitizeValue(value: any, rules: string[]): any {
    if (value === null || value === undefined) {
      return value;
    }
    let sanitized = value;
    for (const rule of rules) {
      const [ruleName] = rule.split(':');
      switch (ruleName) {
        case 'email':
          if (typeof sanitized === 'string') {
            sanitized = this.sanitizeEmail(sanitized);
          }
          break;
        case 'phone':
          if (typeof sanitized === 'string') {
            sanitized = this.sanitizePhone(sanitized);
          }
          break;
        case 'trim':
          if (typeof sanitized === 'string') {
            sanitized = sanitized.trim();
          }
          break;
        case 'lowercase':
          if (typeof sanitized === 'string') {
            sanitized = sanitized.toLowerCase();
          }
          break;
        case 'uppercase':
          if (typeof sanitized === 'string') {
            sanitized = sanitized.toUpperCase();
          }
          break;
        case 'escape':
          if (typeof sanitized === 'string') {
            sanitized = validator.escape(sanitized);
          }
          break;
        case 'unescape':
          if (typeof sanitized === 'string') {
            sanitized = validator.unescape(sanitized);
          }
          break;
        case 'normalizeEmail':
          if (typeof sanitized === 'string') {
            sanitized = validator.normalizeEmail(sanitized);
          }
          break;
        case 'toInt':
          sanitized = validator.toInt(sanitized.toString());
          break;
        case 'toFloat':
          sanitized = validator.toFloat(sanitized.toString());
          break;
        case 'toBoolean':
          sanitized = validator.toBoolean(sanitized.toString());
          break;
        case 'toDate':
          sanitized = validator.toDate(sanitized.toString());
          break;
        case 'html':
          if (typeof sanitized === 'string') {
            sanitized = DOMPurify.sanitize(sanitized);
          }
          break;
        case 'stripHtml':
          if (typeof sanitized === 'string') {
            sanitized = sanitized.replace(/<[^>]*>/g, '');
          }
          break;
        case 'slug':
          if (typeof sanitized === 'string') {
            sanitized = sanitized
              .toLowerCase()
              .replace(/[^\w\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .trim();
          }
          break;
      }
    }
    return sanitized;
  }
  /**
   * Batch validation
   */
  async validateBatch(
    items: any[],
    schema: ValidationSchema
  ): Promise<{ valid: any[]; invalid: Array<{ item: any; errors: ValidationError[] }> }> {
    const valid: any[] = [];
    const invalid: Array<{ item: any; errors: ValidationError[] }> = [];
    for (const item of items) {
      const result = await this.validateWithRules(item, schema);
      if (result.isValid) {
        valid.push(result.sanitizedData);
      } else {
        invalid.push({
          item,
          errors: result.errors || []
        });
      }
    }
    return { valid, invalid };
  }
  /**
   * Schema builder for fluent API
   */
  schema() {
    return new SchemaBuilder(this);
  }
  /**
   * Validate file upload
   */
  validateFile(file: any, options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  }): ValidationResult {
    const errors: ValidationError[] = [];
    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      errors.push(new ValidationError(
        `File size exceeds maximum allowed size of ${options.maxSize} bytes`,
        'fileSize',
        file.size
      ));
    }
    // Check MIME type
    if (options.allowedTypes && !options.allowedTypes.includes(file.mimetype)) {
      errors.push(new ValidationError(
        `File type ${file.mimetype} is not allowed`,
        'fileType',
        file.mimetype
      ));
    }
    // Check file extension
    if (options.allowedExtensions) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !options.allowedExtensions.includes(extension)) {
        errors.push(new ValidationError(
          `File extension ${extension} is not allowed`,
          'fileExtension',
          extension
        ));
      }
    }
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
  /**
   * Validate environment variables
   */
  validateEnv(schema: Record<string, string[]>): ValidationResult {
    const errors: ValidationError[] = [];
    const validated: Record<string, any> = {};
    for (const [key, rules] of Object.entries(schema)) {
      const value = process.env[key];
      for (const rule of rules) {
        const [ruleName, ...params] = rule.split(':');
        if (ruleName === 'required' && !value) {
          errors.push(new ValidationError(
            `Environment variable ${key} is required`,
            key
          ));
          continue;
        }
        if (value) {
          const isValid = this.applyRule(ruleName, value, params);
          if (!isValid) {
            errors.push(new ValidationError(
              `Environment variable ${key} failed validation rule ${ruleName}`,
              key,
              value
            ));
          } else {
            validated[key] = value;
          }
        }
      }
    }
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      sanitizedData: validated
    };
  }
  // Helper methods
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
  private validateVAT(vat: string, countryCode: string): boolean {
    // Simple VAT validation patterns for common countries
    const vatPatterns: Record<string, RegExp> = {
      'GB': /^GB\d{9}$/,
      'DE': /^DE\d{9}$/,
      'FR': /^FR[A-Z0-9]{2}\d{9}$/,
      'IT': /^IT\d{11}$/,
      'ES': /^ES[A-Z]\d{7}[A-Z0-9]$/,
      'NL': /^NL\d{9}B\d{2}$/,
      'BE': /^BE0\d{9}$/,
      'PL': /^PL\d{10}$/,
      'PT': /^PT\d{9}$/,
      'IE': /^IE\d{7}[A-Z]{1,2}$/
    };
    const pattern = vatPatterns[countryCode];
    return pattern ? pattern.test(vat) : false;
  }
  private async checkUniqueness(
    value: any,
    table: string,
    field: string
  ): Promise<boolean> {
    // This would need database access to check
    // For now, return true as placeholder
    this.logger?.debug(`Checking uniqueness for ${field} in ${table}`);
    return true;
  }
  private async checkExistence(
    value: any,
    table: string,
    field: string
  ): Promise<boolean> {
    // This would need database access to check
    // For now, return true as placeholder
    this.logger?.debug(`Checking existence for ${field} in ${table}`);
    return true;
  }
}
/**
 * Schema builder for fluent API
 */
class SchemaBuilder {
  private schema: ValidationSchema = {};
  private validator: EnhancedValidatorService;
  constructor(validator: EnhancedValidatorService) {
    this.validator = validator;
  }
  field(name: string): FieldBuilder {
    return new FieldBuilder(name, this);
  }
  addField(name: string, rule: ValidationRule): SchemaBuilder {
    this.schema[name] = rule;
    return this;
  }
  async validate(data: any): Promise<ValidationResult> {
    return this.validator.validateWithRules(data, this.schema);
  }
  getSchema(): ValidationSchema {
    return this.schema;
  }
}
/**
 * Field builder for fluent API
 */
class FieldBuilder {
  private fieldName: string;
  private rules: string[] = [];
  private message?: string;
  private sanitize: boolean = false;
  private schemaBuilder: SchemaBuilder;
  constructor(fieldName: string, schemaBuilder: SchemaBuilder) {
    this.fieldName = fieldName;
    this.schemaBuilder = schemaBuilder;
  }
  required(): FieldBuilder {
    this.rules.push('required');
    return this;
  }
  email(): FieldBuilder {
    this.rules.push('email');
    return this;
  }
  phone(): FieldBuilder {
    this.rules.push('phone');
    return this;
  }
  uuid(): FieldBuilder {
    this.rules.push('uuid');
    return this;
  }
  url(): FieldBuilder {
    this.rules.push('url');
    return this;
  }
  min(value: number): FieldBuilder {
    this.rules.push(`min:${value}`);
    return this;
  }
  max(value: number): FieldBuilder {
    this.rules.push(`max:${value}`);
    return this;
  }
  between(min: number, max: number): FieldBuilder {
    this.rules.push(`between:${min}:${max}`);
    return this;
  }
  regex(pattern: string): FieldBuilder {
    this.rules.push(`regex:${pattern}`);
    return this;
  }
  in(...values: any[]): FieldBuilder {
    this.rules.push(`in:${values.join(':')}`);
    return this;
  }
  custom(ruleName: string, ...params: any[]): FieldBuilder {
    this.rules.push(`${ruleName}:${params.join(':')}`);
    return this;
  }
  withMessage(message: string): FieldBuilder {
    this.message = message;
    return this;
  }
  withSanitization(): FieldBuilder {
    this.sanitize = true;
    return this;
  }
  field(name: string): FieldBuilder {
    this.build();
    return new FieldBuilder(name, this.schemaBuilder);
  }
  build(): SchemaBuilder {
    this.schemaBuilder.addField(this.fieldName, {
      field: this.fieldName,
      rules: this.rules,
      message: this.message,
      sanitize: this.sanitize
    });
    return this.schemaBuilder;
  }
}
export default EnhancedValidatorService;
