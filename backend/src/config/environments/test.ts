/**
 * Test Environment Configuration - Sprint 2
 * Siguiendo lineamientos nivel 2: configuración para pruebas
 */
import { Environment } from '@/config/environment';
/**
 * Test-specific configuration overrides
 */
export const testConfig: Partial<Environment> = {
  app: {
    name: 'flexxus-flow-test',
    version: '2.0.0-test',
    port: 3001,
    host: 'localhost',
    baseUrl: 'http://localhost:3001',
    apiPrefix: '/api/v1',
  },
  // Test logging - minimal output
  logging: {
    level: 'error', // Only log errors in tests
    format: 'simple',
    directory: './logs/test',
    maxSize: '10m',
    maxFiles: '1d',
    auditEnabled: false, // Disable audit in tests
  },
  // Test security - simplified
  security: {
    bcryptRounds: 4, // Fastest for tests
    rateLimiting: {
      windowMs: 15 * 60 * 1000,
      maxRequests: 10000, // No real limit in tests
      skipSuccessful: true,
      skipFailed: true,
    },
    masterKey: 'test-master-key',
    secretsMasterKey: 'test-secrets-master-key',
    secretsSalt: 'test-secrets-salt',
  },
  // CORS - Allow all in tests
  cors: {
    origin: '*',
    credentials: false,
    maxAge: 0,
  },
  // Cache - Disabled for tests
  cache: {
    enabled: false,
    ttl: 0,
    maxKeys: 0,
    checkPeriod: 0,
  },
  // Feature flags - All enabled for testing
  featureFlags: {
    enabled: true,
    cacheTTL: 0, // No caching in tests
  },
  // Email - Mock email service
  email: {
    enabled: false,
    provider: 'smtp',
    from: 'test@flexxus-flow.test',
    fromEmail: 'test@flexxus-flow.test',
    fromName: 'FlexxusFlow Test',
    replyTo: undefined,
    supportEmail: 'test-support@flexxus-flow.test',
    logContent: false,
    smtp: {
      host: 'localhost',
      port: 1025,
      secure: false,
      user: '',
      password: '',
      pass: '',
    },
  },
  // Monitoring - Disabled for tests
  monitoring: {
    enabled: false,
    metricsPort: 9091,
    healthCheckPath: '/health',
  },
};
/**
 * Test-specific database configuration
 */
export const testDatabase = {
  type: 'sqlite' as const,
  database: ':memory:', // In-memory database for tests
  synchronize: true,
  dropSchema: true,
  logging: false,
  entities: ['src/**/*.entity.ts'],
  migrations: [],
  subscribers: [],
};
/**
 * Alternative test database with PostgreSQL
 */
export const testDatabasePostgres = {
  host: 'localhost',
  port: 5432,
  database: 'flexxus_test',
  user: 'postgres',
  password: 'postgres',
  synchronize: true,
  dropSchema: true,
  logging: false,
  entities: ['src/**/*.entity.ts'],
  migrations: [],
  subscribers: [],
};
/**
 * Test-specific Redis configuration (using Redis Mock)
 */
export const testRedis = {
  host: 'localhost',
  port: 6380, // Different port for test Redis
  db: 15, // Use last database for tests
  keyPrefix: 'test:',
  lazyConnect: true, // Don't connect immediately
  enableOfflineQueue: false,
  retryStrategy: () => null, // No retries in tests
};
/**
 * Test fixtures and utilities
 */
export const testFixtures = {
  // Test users
  users: {
    admin: {
      id: 'test-admin-001',
      email: 'admin@test.com',
      password: 'Test123!@#',
      firstName: 'Admin',
      lastName: 'Test',
      role: 'admin',
    },
    user: {
      id: 'test-user-001',
      email: 'user@test.com',
      password: 'Test123!@#',
      firstName: 'User',
      lastName: 'Test',
      role: 'user',
    },
  },
  // Test companies
  companies: {
    default: {
      id: 'test-company-001',
      name: 'Test Company',
      plan: 'professional',
    },
    secondary: {
      id: 'test-company-002',
      name: 'Secondary Company',
      plan: 'basic',
    },
  },
  // Test tokens
  tokens: {
    valid: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.valid',
    expired: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.expired',
    invalid: 'invalid.token.format',
  },
  // Test API keys
  apiKeys: {
    valid: 'test-api-key-valid',
    invalid: 'test-api-key-invalid',
    expired: 'test-api-key-expired',
  },
};
/**
 * Test helpers
 */
export const testHelpers = {
  /**
   * Generate test JWT token
   */
  generateTestToken: (payload: any, expiresIn = '1h') => {
    // Mock implementation for testing
    return `test-token-${JSON.stringify(payload)}-${expiresIn}`;
  },
  /**
   * Create test database connection
   */
  createTestDatabase: async () => {
    // Returns a test database connection
    return {
      connect: jest.fn(),
      close: jest.fn(),
      clear: jest.fn(),
      drop: jest.fn(),
    };
  },
  /**
   * Reset test environment
   */
  resetTestEnvironment: async () => {
    // Clear all test data
    // Reset mocks
    // Clear cache
  },
  /**
   * Wait for condition
   */
  waitFor: (condition: () => boolean, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const interval = 100;
      let elapsed = 0;
      const check = setInterval(() => {
        if (condition()) {
          clearInterval(check);
          resolve(true);
        } else if (elapsed >= timeout) {
          clearInterval(check);
          reject(new Error('Timeout waiting for condition'));
        }
        elapsed += interval;
      }, interval);
    });
  },
};
/**
 * Test timeouts
 */
export const testTimeouts = {
  unit: 5000, // 5 seconds for unit tests
  integration: 10000, // 10 seconds for integration tests
  e2e: 30000, // 30 seconds for E2E tests
};
