/* eslint-disable import/no-cycle, import/namespace, import/no-duplicates, import/order, import/default */
/* eslint-disable import/no-named-as-default, import/no-named-as-default-member */
/**
 * Jest Global Setup
 * Sprint 4 - Configuración global para todos los tests
 */
import 'reflect-metadata';
import { config } from 'dotenv';
import path from 'path';
import { environment } from '@/config/environment';
// Load test environment variables
config({ path: path.resolve(__dirname, '../../../.env.test') });
// Set test environment
environment.nodeEnv = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.DB_TYPE = 'sqlite';
process.env.DB_DATABASE = ':memory:';
// Global test timeout
jest.setTimeout(10000);
// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};
// Mock Date.now for consistent timestamps
const mockNow = new Date('2024-01-01T00:00:00.000Z').getTime();
Date.now = jest.fn(() => mockNow);
// Global test utilities
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
(global as any).testUtils = {
  // Generate random ID
  generateId: () => Math.random().toString(36).substring(7),
  // Generate test email
  generateEmail: (prefix = 'test') => `${prefix}_${Date.now()}@test.com`,
  // Generate test token
  generateToken: () => 'test_token_' + Math.random().toString(36),
  // Wait utility
  wait: async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
  // Create mock request
  createMockRequest: (overrides = {}) => ({
    body: {},
    query: {},
    params: {},
    headers: {},
    user: null,
    ...overrides,
  }),
  // Create mock response
  createMockResponse: () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    const res: any = {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    res.status = jest.fn().mockReturnValue(res);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    res.json = jest.fn().mockReturnValue(res);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    res.send = jest.fn().mockReturnValue(res);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    res.cookie = jest.fn().mockReturnValue(res);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    res.clearCookie = jest.fn().mockReturnValue(res);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    res.header = jest.fn().mockReturnValue(res);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    res.redirect = jest.fn().mockReturnValue(res);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return res;
  },
  // Create mock next function
  createMockNext: () => jest.fn(),
};
// Extend Jest matchers
expect.extend({
  // Check if value is UUID
  toBeUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
    };
  },
  // Check if value is JWT
  toBeJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    const pass = jwtRegex.test(received);
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid JWT`
          : `expected ${received} to be a valid JWT`,
    };
  },
  // Check if value is ISO date string
  toBeISODateString(received: string) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime()) && date.toISOString() === received;
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid ISO date string`
          : `expected ${received} to be a valid ISO date string`,
    };
  },
  // Check if error matches expected
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toMatchError(received: any, expectedMessage: string | RegExp, expectedCode?: string) {
    const messageMatches =
      typeof expectedMessage === 'string'
        ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          received.message === expectedMessage
        : // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
          expectedMessage.test(received.message);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const codeMatches = expectedCode ? received.code === expectedCode : true;
    const pass = messageMatches && codeMatches;
    return {
      pass,
      message: () =>
        pass
          ? `expected error not to match`
          : `expected error to match message "${expectedMessage}" ${expectedCode ? `and code "${expectedCode}"` : ''}`,
    };
  },
});
// Clean up after all tests
// eslint-disable-next-line @typescript-eslint/require-await
afterAll(async () => {
  // Clear all timers
  jest.clearAllTimers();
  // Clear all mocks
  jest.clearAllMocks();
  // Restore console
  global.console = console;
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
});
// TypeScript declarations for global test utilities
/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/naming-convention, @typescript-eslint/no-explicit-any */
declare global {
  namespace NodeJS {
    interface Global {
      testUtils: {
        generateId: () => string;
        generateEmail: (prefix?: string) => string;
        generateToken: () => string;
        wait: (ms: number) => Promise<void>;
        createMockRequest: (overrides?: any) => any;
        createMockResponse: () => any;
        createMockNext: () => jest.Mock;
      };
    }
  }
  namespace jest {
    interface Matchers<R> {
      toBeUUID(): R;
      toBeJWT(): R;
      toBeISODateString(): R;
      toMatchError(expectedMessage: string | RegExp, expectedCode?: string): R;
    }
  }
}
export {};
