/**
 * E2E Test Setup
 * Sprint 4 - Configuración para tests end-to-end
 */
import { Application } from 'express';
import { Server } from 'http';
import { container } from '@/container/container';
import { initializeTestDatabase, seedDatabase } from './database.setup';
import { UserBuilder } from '@/test/builders/UserBuilder';
import { CompanyBuilder } from '@/test/builders/CompanyBuilder';
import { AuthBuilder } from '@/test/builders/AuthBuilder';
import { environment } from '@/config/environment';
// Global E2E test context
export interface E2ETestContext {
  app: Application;
  server: Server;
  testUsers: any[];
  testCompanies: any[];
  adminToken: string;
  userToken: string;
}
let testContext: E2ETestContext;
/**
 * Initialize E2E test environment
 */
export async function initializeE2EEnvironment(): Promise<E2ETestContext> {
  // Set E2E environment
  environment.nodeEnv = 'test';
  process.env.TEST_TYPE = 'e2e';
  // Initialize test database
  await initializeTestDatabase();
  await seedDatabase();
  // Create Express app
  const app = await createTestApp();
  // Start server on random port
  const port = 0; // Let system assign random port
  const server = await new Promise<Server>((resolve) => {
    const srv = app.listen(port, () => {
      console.log(`E2E test server started on port ${(srv.address() as any).port}`);
      resolve(srv);
    });
  });
  // Create test data
  const testCompanies = CompanyBuilder.createMany(2);
  const testUsers = await UserBuilder.createMany(5, (builder, index) => {
    return builder
      .withCompanyId(testCompanies[index % 2].id)
      .withRole(index === 0 ? 'admin' : 'user');
  });
  // Generate auth tokens
  const adminToken = AuthBuilder.createAccessToken({
    userId: testUsers[0].id,
    companyId: testUsers[0].company_id,
    role: 'admin',
    permissions: ['*']
  });
  const userToken = AuthBuilder.createAccessToken({
    userId: testUsers[1].id,
    companyId: testUsers[1].company_id,
    role: 'user',
    permissions: ['profile:read', 'profile:write']
  });
  testContext = {
    app,
    server,
    testUsers,
    testCompanies,
    adminToken,
    userToken
  };
  return testContext;
}
/**
 * Create test Express application
 */
async function createTestApp(): Promise<Application> {
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const app = express();
  // Basic middleware
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', environment: 'test' });
  });
  // Mount API routes
  try {
    const authRoutes = container.get<any>('AuthRoutes');
    app.use('/api/auth', authRoutes);
  } catch (error) {
    console.warn('Auth routes not available:', error.message);
  }
  try {
    const userRoutes = container.get<any>('UserRoutes');
    app.use('/api/users', userRoutes);
  } catch (error) {
    console.warn('User routes not available:', error.message);
  }
  // Error handling
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('E2E Test Error:', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal Server Error',
      stack: environment.nodeEnv === 'test' ? err.stack : undefined
    });
  });
  return app;
}
/**
 * Clean up E2E test environment
 */
export async function cleanupE2EEnvironment(): Promise<void> {
  if (testContext?.server) {
    await new Promise<void>((resolve, reject) => {
      testContext.server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
/**
 * Get current test context
 */
export function getTestContext(): E2ETestContext {
  if (!testContext) {
    throw new Error('E2E test environment not initialized');
  }
  return testContext;
}
/**
 * Reset test data
 */
export async function resetTestData(): Promise<void> {
  // Clear and reseed database
  const { clearDatabase, seedDatabase } = await import('./database.setup');
  await clearDatabase();
  await seedDatabase();
  // Recreate test users and companies
  const testCompanies = CompanyBuilder.createMany(2);
  const testUsers = await UserBuilder.createMany(5, (builder, index) => {
    return builder
      .withCompanyId(testCompanies[index % 2].id)
      .withRole(index === 0 ? 'admin' : 'user');
  });
  testContext.testCompanies = testCompanies;
  testContext.testUsers = testUsers;
}
// Global E2E hooks
beforeAll(async () => {
  await initializeE2EEnvironment();
}, 30000); // 30 second timeout for setup
afterAll(async () => {
  await cleanupE2EEnvironment();
}, 10000);
beforeEach(async () => {
  // Reset data between tests if needed
  if (process.env.RESET_BETWEEN_TESTS === 'true') {
    await resetTestData();
  }
});
