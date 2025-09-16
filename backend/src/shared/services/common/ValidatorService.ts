import { injectable } from 'inversify';
import * as Joi from 'joi';
import { IValidatorService } from '@interfaces/IServices';
// Custom validation error
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any,
    public errors?: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
@injectable()
export class ValidatorService implements IValidatorService {
  // Email validation regex
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Phone validation regex (supports international format)
  private readonly phoneRegex = /^[+]?[(]?[0-9]{1,3}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/;
  // UUID v4 validation regex
  private readonly uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  isEmail(email: string): boolean {
    if (!email || typeof email !== 'string') {
      return false;
    }
    return this.emailRegex.test(email.trim());
  }
  isPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') {
      return false;
    }
    // Remove all spaces and dashes for validation
    const cleanPhone = phone.replace(/[\s-]/g, '');
    return this.phoneRegex.test(cleanPhone);
  }
  isUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') {
      return false;
    }
    return this.uuidRegex.test(uuid);
  }
  required<T>(value: T, fieldName: string): T {
    if (value === null || value === undefined || value === '') {
      throw new ValidationError(
        `${fieldName} is required`,
        fieldName,
        value
      );
    }
    // Check for empty arrays
    if (Array.isArray(value) && value.length === 0) {
      throw new ValidationError(
        `${fieldName} cannot be empty`,
        fieldName,
        value
      );
    }
    // Check for empty objects
    if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) {
      throw new ValidationError(
        `${fieldName} cannot be empty`,
        fieldName,
        value
      );
    }
    return value;
  }
  validateSchema(data: any, schema: any): { isValid: boolean; errors?: string[] } {
    try {
      // If schema is a Joi schema, use it directly
      if (schema.validate) {
        const result = schema.validate(data, { abortEarly: false });
        if (result.error) {
          return {
            isValid: false,
            errors: result.error.details.map((detail: any) => detail.message)
          };
        }
        return { isValid: true };
      }
      // Otherwise, treat it as a simple object schema
      const errors: string[] = [];
      for (const [key, validator] of Object.entries(schema)) {
        if (typeof validator === 'function') {
          try {
            validator(data[key]);
          } catch (error: any) {
            errors.push(error.message);
          }
        }
      }
      return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error: any) {
      return {
        isValid: false,
        errors: [error.message]
      };
    }
  }
  // Additional validation methods
  isUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  isDate(date: any): boolean {
    if (!date) return false;
    const parsed = Date.parse(date);
    return !isNaN(parsed);
  }
  isNumber(value: any): boolean {
    return !isNaN(value) && isFinite(value);
  }
  isInteger(value: any): boolean {
    return this.isNumber(value) && Number.isInteger(Number(value));
  }
  isPositive(value: number): boolean {
    return this.isNumber(value) && value > 0;
  }
  isInRange(value: number, min: number, max: number): boolean {
    return this.isNumber(value) && value >= min && value <= max;
  }
  minLength(value: string, min: number): boolean {
    return typeof value === 'string' && value.length >= min;
  }
  maxLength(value: string, max: number): boolean {
    return typeof value === 'string' && value.length <= max;
  }
  matches(value: string, pattern: RegExp): boolean {
    return typeof value === 'string' && pattern.test(value);
  }
  isAlphanumeric(value: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(value);
  }
  isStrongPassword(password: string): boolean {
    // At least 8 characters, one uppercase, one lowercase, one number, one special character
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongPasswordRegex.test(password);
  }
  // Sanitization methods
  sanitizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }
  sanitizePhone(phone: string): string {
    // Remove all non-numeric characters except +
    return phone.replace(/[^\d+]/g, '');
  }
  sanitizeString(value: string): string {
    // Remove leading/trailing whitespace and collapse multiple spaces
    return value.trim().replace(/\s+/g, ' ');
  }
  // Create custom validators using builder pattern
  createValidator() {
    return new ValidatorBuilder();
  }
}
// Validator builder for chaining validations
class ValidatorBuilder {
  private validators: Array<(value: any) => void> = [];
  private fieldName: string = 'field';
  field(name: string): this {
    this.fieldName = name;
    return this;
  }
  required(): this {
    this.validators.push((value) => {
      if (value === null || value === undefined || value === '') {
        throw new ValidationError(`${this.fieldName} is required`, this.fieldName, value);
      }
    });
    return this;
  }
  email(): this {
    this.validators.push((value) => {
      const validator = new ValidatorService();
      if (!validator.isEmail(value)) {
        throw new ValidationError(`${this.fieldName} must be a valid email`, this.fieldName, value);
      }
    });
    return this;
  }
  min(min: number): this {
    this.validators.push((value) => {
      if (typeof value === 'string' && value.length < min) {
        throw new ValidationError(`${this.fieldName} must be at least ${min} characters`, this.fieldName, value);
      }
      if (typeof value === 'number' && value < min) {
        throw new ValidationError(`${this.fieldName} must be at least ${min}`, this.fieldName, value);
      }
    });
    return this;
  }
  max(max: number): this {
    this.validators.push((value) => {
      if (typeof value === 'string' && value.length > max) {
        throw new ValidationError(`${this.fieldName} must be at most ${max} characters`, this.fieldName, value);
      }
      if (typeof value === 'number' && value > max) {
        throw new ValidationError(`${this.fieldName} must be at most ${max}`, this.fieldName, value);
      }
    });
    return this;
  }
  validate(value: any): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];
    for (const validator of this.validators) {
      try {
        validator(value);
      } catch (error: any) {
        errors.push(error.message);
      }
    }
    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }
}
