/**
 * Jest Configuration - Sprint 4
 * Testing Framework con TypeScript support
 */

module.exports = {
  // TypeScript preset
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Root directory for tests
  roots: ['<rootDir>/src'],
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.spec.ts',
    '**/integration/**/*.test.ts',
    '**/e2e/**/*.test.ts'
  ],
  
  // Module path aliases (matching tsconfig.json)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@interfaces/(.*)$': '<rootDir>/src/shared/interfaces/$1',
    '^@services/(.*)$': '<rootDir>/src/shared/services/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
    '^@entities/(.*)$': '<rootDir>/src/entities/$1'
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup/jest.setup.ts'],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.entity.ts',
    '!src/**/*.dto.ts',
    '!src/**/*.types.ts',
    '!src/**/__tests__/**',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/test/**',
    '!src/main.ts',
    '!src/server.ts',
    '!src/container/**',
    '!src/shared/database/migrations/**',
    '!src/core/migrations/**'
  ],
  
  // Coverage thresholds (80% minimum)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for critical paths
    './src/modules/auth/services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/shared/services/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Coverage directory
  coverageDirectory: '<rootDir>/coverage',
  
  // Coverage reporters
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Projects configuration for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.test.ts',
        '<rootDir>/src/**/__tests__/**/*.spec.ts'
      ],
      testEnvironment: 'node'
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/**/integration/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: [
        '<rootDir>/src/test/setup/jest.setup.ts',
        '<rootDir>/src/test/setup/database.setup.ts'
      ]
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/src/**/e2e/**/*.test.ts'],
      testEnvironment: 'node',
      setupFilesAfterEnv: [
        '<rootDir>/src/test/setup/jest.setup.ts',
        '<rootDir>/src/test/setup/database.setup.ts',
        '<rootDir>/src/test/setup/e2e.setup.ts'
      ],
      // Longer timeout for E2E tests
      testTimeout: 30000
    }
  ],
  
  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        allowJs: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        isolatedModules: true,
        moduleResolution: 'node',
        skipLibCheck: true,
        strict: false
      }
    }]
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  
  // Performance optimizations
  maxWorkers: '50%',
  
  // Verbose output for debugging
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Test timeout (10 seconds default)
  testTimeout: 10000,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true
};