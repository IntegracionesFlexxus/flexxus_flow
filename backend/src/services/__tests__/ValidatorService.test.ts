import 'reflect-metadata';
import { ValidatorService, ValidationError } from '../ValidatorService';

describe('ValidatorService', () => {
  let validatorService: ValidatorService;

  beforeEach(() => {
    validatorService = new ValidatorService();
  });

  describe('isEmail', () => {
    it('should return true for valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'first+last@test.org',
        'email123@subdomain.example.com'
      ];

      validEmails.forEach(email => {
        expect(validatorService.isEmail(email)).toBe(true);
      });
    });

    it('should return false for invalid email addresses', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user name@example.com',
        'user@example',
        '',
        null as any,
        undefined as any
      ];

      invalidEmails.forEach(email => {
        expect(validatorService.isEmail(email)).toBe(false);
      });
    });
  });

  describe('isPhone', () => {
    it('should return true for valid phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '123-456-7890',
        '(123) 456-7890',
        '+56 9 1234 5678',
        '912345678'
      ];

      validPhones.forEach(phone => {
        expect(validatorService.isPhone(phone)).toBe(true);
      });
    });

    it('should return false for invalid phone numbers', () => {
      const invalidPhones = [
        'abc123',
        '123',
        '',
        null as any,
        undefined as any
      ];

      invalidPhones.forEach(phone => {
        expect(validatorService.isPhone(phone)).toBe(false);
      });
    });
  });

  describe('isUUID', () => {
    it('should return true for valid UUID v4', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479'
      ];

      validUUIDs.forEach(uuid => {
        expect(validatorService.isUUID(uuid)).toBe(true);
      });
    });

    it('should return false for invalid UUIDs', () => {
      const invalidUUIDs = [
        '550e8400-e29b-11d4-a716-446655440000', // v1 UUID
        'not-a-uuid',
        '123456789',
        '',
        null as any
      ];

      invalidUUIDs.forEach(uuid => {
        expect(validatorService.isUUID(uuid)).toBe(false);
      });
    });
  });

  describe('required', () => {
    it('should return value if not empty', () => {
      expect(validatorService.required('value', 'field')).toBe('value');
      expect(validatorService.required(123, 'field')).toBe(123);
      expect(validatorService.required(['item'], 'field')).toEqual(['item']);
      expect(validatorService.required({ key: 'value' }, 'field')).toEqual({ key: 'value' });
    });

    it('should throw ValidationError for null/undefined', () => {
      expect(() => validatorService.required(null, 'field')).toThrow(ValidationError);
      expect(() => validatorService.required(undefined, 'field')).toThrow(ValidationError);
      expect(() => validatorService.required('', 'field')).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty arrays', () => {
      expect(() => validatorService.required([], 'field')).toThrow(ValidationError);
    });

    it('should throw ValidationError for empty objects', () => {
      expect(() => validatorService.required({}, 'field')).toThrow(ValidationError);
    });
  });

  describe('validateSchema', () => {
    it('should validate with Joi schema', () => {
      const Joi = require('joi');
      const schema = Joi.object({
        email: Joi.string().email().required(),
        age: Joi.number().min(18).required()
      });

      const validData = { email: 'test@example.com', age: 25 };
      const result = validatorService.validateSchema(validData, schema);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should return errors for invalid data with Joi schema', () => {
      const Joi = require('joi');
      const schema = Joi.object({
        email: Joi.string().email().required(),
        age: Joi.number().min(18).required()
      });

      const invalidData = { email: 'not-an-email', age: 15 };
      const result = validatorService.validateSchema(invalidData, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should validate with function validators', () => {
      const schema = {
        email: (value: string) => {
          if (!validatorService.isEmail(value)) {
            throw new Error('Invalid email');
          }
        }
      };

      const validData = { email: 'test@example.com' };
      const result = validatorService.validateSchema(validData, schema);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Additional validation methods', () => {
    describe('isUrl', () => {
      it('should validate URLs correctly', () => {
        expect(validatorService.isUrl('https://example.com')).toBe(true);
        expect(validatorService.isUrl('http://localhost:3000')).toBe(true);
        expect(validatorService.isUrl('not-a-url')).toBe(false);
      });
    });

    describe('isDate', () => {
      it('should validate dates correctly', () => {
        expect(validatorService.isDate('2024-01-01')).toBe(true);
        expect(validatorService.isDate(new Date())).toBe(true);
        expect(validatorService.isDate('not-a-date')).toBe(false);
      });
    });

    describe('isNumber', () => {
      it('should validate numbers correctly', () => {
        expect(validatorService.isNumber(123)).toBe(true);
        expect(validatorService.isNumber('123')).toBe(true);
        expect(validatorService.isNumber('abc')).toBe(false);
      });
    });

    describe('isStrongPassword', () => {
      it('should validate strong passwords', () => {
        expect(validatorService.isStrongPassword('StrongP@ss123')).toBe(true);
        expect(validatorService.isStrongPassword('weakpass')).toBe(false);
        expect(validatorService.isStrongPassword('NoSpecial123')).toBe(false);
      });
    });
  });

  describe('Sanitization methods', () => {
    it('should sanitize email', () => {
      expect(validatorService.sanitizeEmail('  TEST@EXAMPLE.COM  ')).toBe('test@example.com');
    });

    it('should sanitize phone', () => {
      expect(validatorService.sanitizePhone('+1 (234) 567-890')).toBe('+1234567890');
    });

    it('should sanitize string', () => {
      expect(validatorService.sanitizeString('  multiple   spaces  ')).toBe('multiple spaces');
    });
  });

  describe('ValidatorBuilder', () => {
    it('should chain validations', () => {
      const builder = validatorService.createValidator()
        .field('email')
        .required()
        .email()
        .min(5)
        .max(100);

      const validResult = builder.validate('test@example.com');
      expect(validResult.isValid).toBe(true);

      const invalidResult = builder.validate('bad');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors!.length).toBeGreaterThan(0);
    });
  });
});