/**
 * Test Row-Level Security Implementation
 * Sprint 1 - Database Team
 * 
 * Este script prueba que las políticas RLS estén funcionando correctamente
 * verificando el aislamiento entre empresas y usuarios.
 */

const { Pool } = require('pg');
const { RLSContext, RLSQueries, RLSTestHelper } = require('./config/rls-context');
const BaseRepositoryRLS = require('./repositories/BaseRepositoryRLS');

// Configuración de conexión
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: 'flexxus_shared',
  user: process.env.DB_USER || 'flexxus_app',
  password: process.env.DB_PASSWORD || 'app_password_123',
  max: 5
};

const pool = new Pool(config);

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Test data
const testData = {
  // Empresa 1
  company1: {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Test Company 1',
    tax_id: 'TAX-001'
  },
  user1: {
    id: '11111111-2222-2222-2222-222222222222',
    email: 'user1@company1.com',
    password_hash: '$2b$10$test',
    first_name: 'User',
    last_name: 'One'
  },
  
  // Empresa 2
  company2: {
    id: '22222222-1111-1111-1111-111111111111',
    name: 'Test Company 2',
    tax_id: 'TAX-002'
  },
  user2: {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'user2@company2.com',
    password_hash: '$2b$10$test',
    first_name: 'User',
    last_name: 'Two'
  }
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(testName) {
  console.log('');
  log(`→ Testing: ${testName}`, 'yellow');
}

function logSuccess(message) {
  log(`  ✓ ${message}`, 'green');
}

function logError(message) {
  log(`  ✗ ${message}`, 'red');
}

// Test functions
async function setupTestData() {
  logTest('Setting up test data');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Limpiar datos anteriores de prueba
    await client.query(`DELETE FROM user_companies WHERE user_id IN ($1, $2)`, 
      [testData.user1.id, testData.user2.id]);
    await client.query(`DELETE FROM users WHERE id IN ($1, $2)`, 
      [testData.user1.id, testData.user2.id]);
    await client.query(`DELETE FROM companies WHERE id IN ($1, $2)`, 
      [testData.company1.id, testData.company2.id]);
    
    // Insertar empresas
    await client.query(`
      INSERT INTO companies (id, name, tax_id, plan, status)
      VALUES ($1, $2, $3, $4, $5)
    `, [testData.company1.id, testData.company1.name, testData.company1.tax_id, 'basic', 'active']);
    
    await client.query(`
      INSERT INTO companies (id, name, tax_id, plan, status)
      VALUES ($1, $2, $3, $4, $5)
    `, [testData.company2.id, testData.company2.name, testData.company2.tax_id, 'basic', 'active']);
    
    // Insertar usuarios
    await client.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [testData.user1.id, testData.user1.email, testData.user1.password_hash, 
        testData.user1.first_name, testData.user1.last_name, 'active']);
    
    await client.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [testData.user2.id, testData.user2.email, testData.user2.password_hash,
        testData.user2.first_name, testData.user2.last_name, 'active']);
    
    // Crear relaciones usuario-empresa
    await client.query(`
      INSERT INTO user_companies (user_id, company_id, role, is_default, status)
      VALUES ($1, $2, $3, $4, $5)
    `, [testData.user1.id, testData.company1.id, 'admin', true, 'active']);
    
    await client.query(`
      INSERT INTO user_companies (user_id, company_id, role, is_default, status)
      VALUES ($1, $2, $3, $4, $5)
    `, [testData.user2.id, testData.company2.id, 'admin', true, 'active']);
    
    await client.query('COMMIT');
    logSuccess('Test data created successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    logError(`Failed to setup test data: ${error.message}`);
    throw error;
  } finally {
    client.release();
  }
}

async function testRLSEnabled() {
  logTest('Checking if RLS is enabled');
  
  const client = await pool.connect();
  try {
    const isEnabled = await RLSTestHelper.verifyRLSEnabled(client);
    
    if (isEnabled) {
      logSuccess('RLS is enabled on all required tables');
    } else {
      logError('RLS is not enabled on some tables');
    }
    
    return isEnabled;
  } finally {
    client.release();
  }
}

async function testCompanyIsolation() {
  logTest('Testing company isolation');
  
  try {
    // User1 intenta ver datos de Company1 (debería funcionar)
    const context1 = {
      userId: testData.user1.id,
      companyId: testData.company1.id
    };
    
    const company1Data = await RLSQueries.executeWithContext(
      pool,
      context1.userId,
      context1.companyId,
      'SELECT * FROM companies WHERE id = $1',
      [testData.company1.id]
    );
    
    if (company1Data.length > 0) {
      logSuccess('User1 can see Company1 data');
    } else {
      logError('User1 cannot see Company1 data (should be able to)');
      return false;
    }
    
    // User1 intenta ver datos de Company2 (no debería funcionar)
    const company2Data = await RLSQueries.executeWithContext(
      pool,
      context1.userId,
      context1.companyId,
      'SELECT * FROM companies WHERE id = $1',
      [testData.company2.id]
    );
    
    if (company2Data.length === 0) {
      logSuccess('User1 cannot see Company2 data (correct)');
    } else {
      logError('User1 can see Company2 data (SECURITY BREACH!)');
      return false;
    }
    
    return true;
    
  } catch (error) {
    logError(`Company isolation test failed: ${error.message}`);
    return false;
  }
}

async function testUserIsolation() {
  logTest('Testing user isolation');
  
  try {
    // User1 intenta ver usuarios de Company2
    const context1 = {
      userId: testData.user1.id,
      companyId: testData.company1.id
    };
    
    // Debería ver su propio usuario
    const ownUser = await RLSQueries.executeWithContext(
      pool,
      context1.userId,
      context1.companyId,
      'SELECT * FROM users WHERE id = $1',
      [testData.user1.id]
    );
    
    if (ownUser.length > 0) {
      logSuccess('User1 can see their own profile');
    } else {
      logError('User1 cannot see their own profile');
      return false;
    }
    
    // No debería ver usuario de otra empresa
    const otherUser = await RLSQueries.executeWithContext(
      pool,
      context1.userId,
      context1.companyId,
      'SELECT * FROM users WHERE id = $1',
      [testData.user2.id]
    );
    
    if (otherUser.length === 0) {
      logSuccess('User1 cannot see User2 from different company (correct)');
    } else {
      logError('User1 can see User2 from different company (SECURITY BREACH!)');
      return false;
    }
    
    return true;
    
  } catch (error) {
    logError(`User isolation test failed: ${error.message}`);
    return false;
  }
}

async function testRepositoryWithRLS() {
  logTest('Testing BaseRepositoryRLS');
  
  try {
    const userRepo = new BaseRepositoryRLS(pool, 'users');
    const context = {
      userId: testData.user1.id,
      companyId: testData.company1.id
    };
    
    // Test findById
    const user = await userRepo.findById(testData.user1.id, context);
    if (user) {
      logSuccess('Repository findById works with RLS');
    } else {
      logError('Repository findById failed');
      return false;
    }
    
    // Test count
    const count = await userRepo.count({}, context);
    if (count >= 1) {
      logSuccess(`Repository count works with RLS (found ${count} users)`);
    } else {
      logError('Repository count failed');
      return false;
    }
    
    // Test pagination
    const paginated = await userRepo.paginate({ page: 1, limit: 10 }, context);
    if (paginated.data && paginated.pagination) {
      logSuccess('Repository pagination works with RLS');
    } else {
      logError('Repository pagination failed');
      return false;
    }
    
    return true;
    
  } catch (error) {
    logError(`Repository test failed: ${error.message}`);
    return false;
  }
}

async function testCrossCompanyAccess() {
  logTest('Testing cross-company access prevention');
  
  try {
    // User2 intenta modificar datos de Company1
    const result = await RLSContext.withContext(
      pool,
      testData.user2.id,
      testData.company2.id,
      async (client) => {
        // Intentar actualizar Company1 (debería fallar silenciosamente)
        const updateResult = await client.query(`
          UPDATE companies 
          SET name = 'HACKED!' 
          WHERE id = $1
          RETURNING *
        `, [testData.company1.id]);
        
        return updateResult.rows;
      }
    );
    
    if (result.length === 0) {
      logSuccess('User2 cannot modify Company1 data (correct)');
    } else {
      logError('User2 was able to modify Company1 data (SECURITY BREACH!)');
      return false;
    }
    
    // Verificar que Company1 no fue modificada
    const client = await pool.connect();
    try {
      const company = await client.query(
        'SELECT name FROM companies WHERE id = $1',
        [testData.company1.id]
      );
      
      if (company.rows[0].name === testData.company1.name) {
        logSuccess('Company1 data remains unchanged');
      } else {
        logError('Company1 data was modified!');
        return false;
      }
    } finally {
      client.release();
    }
    
    return true;
    
  } catch (error) {
    logError(`Cross-company access test failed: ${error.message}`);
    return false;
  }
}

async function cleanupTestData() {
  logTest('Cleaning up test data');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query(`DELETE FROM user_companies WHERE user_id IN ($1, $2)`, 
      [testData.user1.id, testData.user2.id]);
    await client.query(`DELETE FROM users WHERE id IN ($1, $2)`, 
      [testData.user1.id, testData.user2.id]);
    await client.query(`DELETE FROM companies WHERE id IN ($1, $2)`, 
      [testData.company1.id, testData.company2.id]);
    
    await client.query('COMMIT');
    logSuccess('Test data cleaned up');
    
  } catch (error) {
    await client.query('ROLLBACK');
    logError(`Failed to cleanup: ${error.message}`);
  } finally {
    client.release();
  }
}

// Main test runner
async function runTests() {
  console.log('');
  log('================================================', 'blue');
  log('     Row-Level Security Test Suite', 'blue');
  log('================================================', 'blue');
  
  let allTestsPassed = true;
  
  try {
    // Setup
    await setupTestData();
    
    // Run tests
    const tests = [
      { name: 'RLS Enabled Check', fn: testRLSEnabled },
      { name: 'Company Isolation', fn: testCompanyIsolation },
      { name: 'User Isolation', fn: testUserIsolation },
      { name: 'Repository with RLS', fn: testRepositoryWithRLS },
      { name: 'Cross-Company Access', fn: testCrossCompanyAccess }
    ];
    
    for (const test of tests) {
      const passed = await test.fn();
      if (!passed) {
        allTestsPassed = false;
      }
    }
    
    // Cleanup
    await cleanupTestData();
    
  } catch (error) {
    log(`\nTest suite error: ${error.message}`, 'red');
    allTestsPassed = false;
  } finally {
    await pool.end();
  }
  
  // Summary
  console.log('');
  log('================================================', 'blue');
  if (allTestsPassed) {
    log('  ✅ All RLS tests passed successfully!', 'green');
    log('  Row-Level Security is working correctly', 'green');
  } else {
    log('  ❌ Some RLS tests failed!', 'red');
    log('  Review and fix the security policies', 'red');
  }
  log('================================================', 'blue');
  console.log('');
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});