/**
 * Database Test Setup
 * Sprint 4 - Configuración de base de datos para testing
 */
import { DatabaseConnection } from '@/shared/database/connections/DatabaseConnection';
import { IDatabaseConnection } from '@/shared/database/interfaces/IDatabaseConnection';
// Test database configuration
export const testDatabaseConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'flexxus_test',
  user: process.env.TEST_DB_USER || 'test',
  password: process.env.TEST_DB_PASSWORD || 'test',
  ssl: false
};
// Global test database instance
let testConnection: DatabaseConnection | null = null;
/**
 * Create mock database connection for unit tests
 */
export function createMockDatabaseConnection(): IDatabaseConnection {
  return {
    query: jest.fn().mockResolvedValue([]),
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue([]),
      release: jest.fn()
    })
  };
}
/**
 * Initialize test database for integration tests
 */
export async function initializeTestDatabase(): Promise<DatabaseConnection> {
  if (testConnection && testConnection.isConnected()) {
    return testConnection;
  }
  testConnection = new DatabaseConnection(testDatabaseConfig);
  await testConnection.connect();
  return testConnection;
}
/**
 * Clear all tables in test database
 */
export async function clearDatabase(): Promise<void> {
  if (!testConnection || !testConnection.isConnected()) {
    return;
  }
  const tables = [
    'user_sessions',
    'user_companies', 
    'user_roles',
    'role_permissions',
    'permissions',
    'roles',
    'invitations',
    'audit_logs',
    'feature_flags',
    'companies',
    'users'
  ];
  try {
    // Disable foreign key checks
    await testConnection.query('SET session_replication_role = replica');
    // Truncate all tables
    for (const table of tables) {
      await testConnection.query(`TRUNCATE TABLE ${table} CASCADE`);
    }
    // Re-enable foreign key checks
    await testConnection.query('SET session_replication_role = DEFAULT');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
}
/**
 * Close test database connection
 */
export async function closeTestDatabase(): Promise<void> {
  if (testConnection && testConnection.isConnected()) {
    await testConnection.disconnect();
    testConnection = null;
  }
}
/**
 * Seed test database with initial data
 */
export async function seedTestDatabase(): Promise<void> {
  if (!testConnection || !testConnection.isConnected()) {
    throw new Error('Test database not initialized');
  }
  // Add test data
  const testCompanyId = 'test-company-123';
  const testUserId = 'test-user-123';
  const testRoleId = 'test-role-123';
  // Insert test company
  await testConnection.query(
    `INSERT INTO companies (id, name, tax_id, plan, status, created_at, updated_at) 
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [testCompanyId, 'Test Company', '12345678', 'starter', 'active']
  );
  // Insert test role
  await testConnection.query(
    `INSERT INTO roles (id, name, description, is_system_role, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [testRoleId, 'Test Role', 'Test role for testing', false, 'active']
  );
  // Insert test user
  await testConnection.query(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
     ON CONFLICT (id) DO NOTHING`,
    [testUserId, 'test@example.com', '$2b$10$test', 'Test', 'User', 'active']
  );
  // Link user to company with role
  await testConnection.query(
    `INSERT INTO user_companies (user_id, company_id, role, is_default, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (user_id, company_id) DO NOTHING`,
    [testUserId, testCompanyId, 'admin', true, 'active']
  );
  // Link user to role
  await testConnection.query(
    `INSERT INTO user_roles (user_id, role_id, company_id, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (user_id, company_id) DO NOTHING`,
    [testUserId, testRoleId, testCompanyId]
  );
}
// Cleanup hook for Jest
if (typeof afterAll !== 'undefined') {
  afterAll(async () => {
    await closeTestDatabase();
  });
}
