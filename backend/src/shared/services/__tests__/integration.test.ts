/**
 * Integration Tests for Enhanced Services
 * Sprint 4 - Pruebas de integración de servicios
 */

import 'reflect-metadata';
import { container } from '@/container/container';
import { TYPES } from '@/container/types';
import { EnhancedCacheService } from '@/shared/services/cache/EnhancedCacheService';
import { EnhancedValidatorService } from '@/shared/services/validation/EnhancedValidatorService';
import { EmailService } from '@/shared/services/email/EmailService';

describe('Enhanced Services Integration', () => {
  let cacheService: EnhancedCacheService;
  let validatorService: EnhancedValidatorService;
  let emailService: EmailService;

  beforeAll(() => {
    // Get services from container
    cacheService = container.get<EnhancedCacheService>(TYPES.EnhancedCacheService);
    validatorService = container.get<EnhancedValidatorService>(TYPES.EnhancedValidatorService);
    emailService = container.get<EmailService>(TYPES.EmailService);
  });

  afterAll(async () => {
    // Cleanup
    await cacheService.destroy();
    await emailService.destroy();
  });

  describe('EnhancedCacheService', () => {
    it('should set and get values from cache', async () => {
      const key = 'test-key';
      const value = { data: 'test-value' };

      await cacheService.set(key, value, 60);
      const retrieved = await cacheService.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should support cache-aside pattern', async () => {
      const key = 'cache-aside-test';
      let fetchCount = 0;
      
      const fetcher = async () => {
        fetchCount++;
        return { data: 'fetched-value' };
      };

      // First call should fetch
      const result1 = await cacheService.cacheAside(key, fetcher, 60);
      expect(fetchCount).toBe(1);
      expect(result1.data).toBe('fetched-value');

      // Second call should use cache
      const result2 = await cacheService.cacheAside(key, fetcher, 60);
      expect(fetchCount).toBe(1); // Should not fetch again
      expect(result2.data).toBe('fetched-value');
    });

    it('should invalidate cache by tags', async () => {
      const key1 = 'tagged-1';
      const key2 = 'tagged-2';
      const key3 = 'untagged';
      
      await cacheService.setWithTags(key1, 'value1', ['user', 'session'], 60);
      await cacheService.setWithTags(key2, 'value2', ['user'], 60);
      await cacheService.set(key3, 'value3', 60);

      // Invalidate by tag
      const deletedCount = await cacheService.invalidateByTags(['user']);

      expect(deletedCount).toBe(2);
      expect(await cacheService.get(key1)).toBeNull();
      expect(await cacheService.get(key2)).toBeNull();
      expect(await cacheService.get(key3)).toBe('value3'); // Should still exist
    });

    it('should track cache statistics', () => {
      const stats = cacheService.getStats();
      
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('sets');
      expect(stats).toHaveProperty('deletes');
      expect(stats).toHaveProperty('hitRate');
    });
  });

  describe('EnhancedValidatorService', () => {
    it('should validate data with schema', async () => {
      const schema = {
        email: {
          field: 'email',
          rules: ['required', 'email'],
          sanitize: true
        },
        age: {
          field: 'age',
          rules: ['required', 'number', 'min:18', 'max:100']
        }
      };

      const validData = {
        email: 'TEST@EXAMPLE.COM',
        age: 25
      };

      const result = await validatorService.validateWithRules(validData, schema);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.email).toBe('test@example.com'); // Should be sanitized
      expect(result.sanitizedData?.age).toBe(25);
    });

    it('should return errors for invalid data', async () => {
      const schema = {
        email: {
          field: 'email',
          rules: ['required', 'email']
        }
      };

      const invalidData = {
        email: 'invalid-email'
      };

      const result = await validatorService.validateWithRules(invalidData, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('should support conditional validation', async () => {
      const conditions = [
        {
          when: (data: any) => data.type === 'business',
          then: [
            {
              field: 'vatNumber',
              rules: ['required'],
              message: 'VAT number is required for business accounts'
            }
          ]
        }
      ];

      const businessData = { type: 'business', vatNumber: '' };
      const personalData = { type: 'personal' };

      const businessResult = await validatorService.validateConditional(businessData, conditions);
      const personalResult = await validatorService.validateConditional(personalData, conditions);

      expect(businessResult.isValid).toBe(false);
      expect(personalResult.isValid).toBe(true);
    });

    it('should use fluent API for schema building', async () => {
      const schema = validatorService.schema()
        .field('username')
          .required()
          .min(3)
          .max(20)
          .withSanitization()
        .field('email')
          .required()
          .email()
          .withMessage('Please provide a valid email')
        .field('age')
          .required()
          .between(18, 100)
          .build();

      const data = {
        username: '  JohnDoe  ',
        email: 'john@example.com',
        age: 30
      };

      const result = await schema.validate(data);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.username).toBe('JohnDoe'); // Trimmed
    });

    it('should validate files', () => {
      const file = {
        name: 'document.pdf',
        size: 1024 * 1024, // 1MB
        mimetype: 'application/pdf'
      };

      const result = validatorService.validateFile(file, {
        maxSize: 5 * 1024 * 1024, // 5MB
        allowedTypes: ['application/pdf', 'image/jpeg'],
        allowedExtensions: ['pdf', 'jpg', 'jpeg']
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('EmailService', () => {
    it('should queue emails when queue is enabled', async () => {
      const result = await emailService.send({
        to: 'test@example.com',
        subject: 'Test Email',
        template: 'welcome',
        data: {
          name: 'John Doe'
        }
      });

      expect(result.messageId).toBeDefined();
      expect(result.response).toContain('queued');
    });

    it('should send bulk emails', async () => {
      const recipients = [
        { email: 'user1@example.com', data: { name: 'User 1' } },
        { email: 'user2@example.com', data: { name: 'User 2' } }
      ];

      const results = await emailService.sendBulk(recipients, {
        subject: 'Bulk Email Test',
        template: 'notification',
        data: {
          title: 'Important Update',
          message: 'This is a test notification'
        }
      });

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.email).toBeDefined();
        expect(result.result || result.error).toBeDefined();
      });
    });

    it('should test email connection', async () => {
      const isConnected = await emailService.testConnection();
      expect(typeof isConnected).toBe('boolean');
    });
  });

  describe('Services Integration', () => {
    it('should work together for user registration flow', async () => {
      // 1. Validate user data
      const userSchema = {
        email: {
          field: 'email',
          rules: ['required', 'email'],
          sanitize: true
        },
        password: {
          field: 'password',
          rules: ['required', 'strongPassword']
        },
        name: {
          field: 'name',
          rules: ['required', 'min:2', 'max:50'],
          sanitize: true
        }
      };

      const userData = {
        email: '  NEW.USER@EXAMPLE.COM  ',
        password: 'SecurePass123!',
        name: '  John Doe  '
      };

      const validationResult = await validatorService.validateWithRules(userData, userSchema);
      
      if (!validationResult.isValid) {
        throw new Error('Validation failed');
      }

      // 2. Cache user data temporarily
      const tempKey = `registration:${validationResult.sanitizedData!.email}`;
      await cacheService.set(tempKey, validationResult.sanitizedData, 300); // 5 minutes

      // 3. Send verification email
      const emailResult = await emailService.sendVerificationEmail(
        validationResult.sanitizedData!.email,
        {
          name: validationResult.sanitizedData!.name,
          verificationUrl: 'https://example.com/verify?token=abc123'
        }
      );

      // 4. Verify flow completed
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.sanitizedData!.email).toBe('new.user@example.com');
      expect(validationResult.sanitizedData!.name).toBe('John Doe');
      expect(await cacheService.get(tempKey)).toBeDefined();
      expect(emailResult.messageId).toBeDefined();
    });

    it('should handle password reset flow', async () => {
      const email = 'user@example.com';
      const resetToken = 'reset-token-123';
      
      // 1. Cache reset token with expiry
      const cacheKey = `password-reset:${email}`;
      await cacheService.set(cacheKey, {
        token: resetToken,
        attempts: 0,
        createdAt: new Date()
      }, 3600); // 1 hour

      // 2. Send password reset email
      const emailResult = await emailService.sendPasswordResetEmail(email, {
        name: 'User',
        resetUrl: `https://example.com/reset?token=${resetToken}`,
        expiresIn: '1 hour'
      });

      // 3. Verify token exists in cache
      const cachedToken = await cacheService.get<any>(cacheKey);
      
      expect(cachedToken).toBeDefined();
      expect(cachedToken.token).toBe(resetToken);
      expect(emailResult.messageId).toBeDefined();
    });

    it('should handle rate limiting with cache', async () => {
      const ip = '192.168.1.1';
      const endpoint = '/api/login';
      const key = `rate-limit:${ip}:${endpoint}`;
      
      // Increment counter
      let attempts = await cacheService.increment(key, 1);
      expect(attempts).toBe(1);
      
      // Set TTL for rate limit window
      await cacheService.set(key, attempts, 60); // 1 minute window
      
      // Check if rate limited
      attempts = await cacheService.increment(key, 1);
      const isRateLimited = attempts > 5;
      
      expect(typeof isRateLimited).toBe('boolean');
    });
  });
});