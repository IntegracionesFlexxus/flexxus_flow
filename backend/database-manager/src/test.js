// Script de prueba para el Database Manager
const dbManager = require('./index');

async function testDatabaseManager() {
  console.log('=== Iniciando pruebas del Database Manager ===\n');
  
  try {
    // 1. Inicializar el manager
    console.log('1. Inicializando conexiones...');
    await dbManager.initialize();
    console.log('✓ Conexiones inicializadas\n');
    
    // 2. Probar health check
    console.log('2. Verificando health check...');
    const health = await dbManager.healthCheckService.check();
    console.log(`✓ Estado: ${health.overall}`);
    console.log(`✓ Bases de datos: ${JSON.stringify(health.summary)}\n`);
    
    // 3. Probar repositorio de usuarios
    console.log('3. Probando UserRepository...');
    const userRepo = new dbManager.UserRepository();
    
    // Crear tabla de prueba si no existe
    await dbManager.query('shared', `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50),
        company_id INTEGER,
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        failed_login_attempts INTEGER DEFAULT 0,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);
    
    // Crear usuario de prueba
    const testUser = {
      email: `test_${Date.now()}@example.com`,
      username: `testuser_${Date.now()}`,
      first_name: 'Test',
      last_name: 'User',
      role: 'user'
    };
    
    console.log('  - Creando usuario de prueba...');
    const newUser = await userRepo.createUser(testUser);
    console.log(`  ✓ Usuario creado: ${newUser.email}`);
    
    // Buscar usuario
    console.log('  - Buscando usuario por email...');
    const foundUser = await userRepo.findByEmail(newUser.email);
    console.log(`  ✓ Usuario encontrado: ${foundUser.username}`);
    
    // Actualizar último login
    console.log('  - Actualizando último login...');
    await userRepo.updateLastLogin(newUser.id);
    console.log('  ✓ Último login actualizado');
    
    // Obtener estadísticas
    console.log('  - Obteniendo estadísticas...');
    const stats = await userRepo.getUserStats();
    console.log(`  ✓ Estadísticas: ${JSON.stringify(stats)}\n`);
    
    // 4. Probar repositorio de empresas
    console.log('4. Probando CompanyRepository...');
    const companyRepo = new dbManager.CompanyRepository();
    
    // Crear tabla de prueba si no existe
    await dbManager.query('shared', `
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        company_code VARCHAR(100) UNIQUE,
        is_active BOOLEAN DEFAULT true,
        subscription_status VARCHAR(50),
        user_limit INTEGER DEFAULT 10,
        subscription_expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        deleted_at TIMESTAMP
      )
    `);
    
    // Crear empresa de prueba
    const testCompany = {
      name: `Test Company ${Date.now()}`,
      company_code: `COMP_${Date.now()}`
    };
    
    console.log('  - Creando empresa de prueba...');
    const newCompany = await companyRepo.createCompany(testCompany);
    console.log(`  ✓ Empresa creada: ${newCompany.name}`);
    
    // Buscar empresa
    console.log('  - Buscando empresa por código...');
    const foundCompany = await companyRepo.findByCode(newCompany.company_code);
    console.log(`  ✓ Empresa encontrada: ${foundCompany.name}\n`);
    
    // 5. Probar transacciones
    console.log('5. Probando transacciones...');
    await dbManager.transaction('shared', async (client) => {
      // Actualizar usuario
      await client.query(
        'UPDATE users SET role = $1 WHERE id = $2',
        ['admin', newUser.id]
      );
      
      // Actualizar empresa
      await client.query(
        'UPDATE companies SET user_limit = $1 WHERE id = $2',
        [20, newCompany.id]
      );
      
      console.log('  ✓ Transacción completada exitosamente\n');
    });
    
    // 6. Obtener estadísticas de pools
    console.log('6. Estadísticas de pools de conexiones:');
    const poolStats = dbManager.connectionManager.getStats();
    poolStats.pools.forEach(pool => {
      console.log(`  - ${pool.database}: ${pool.idleConnections}/${pool.totalConnections} conexiones`);
    });
    
    console.log('\n=== Pruebas completadas exitosamente ===\n');
    
  } catch (error) {
    console.error('✗ Error en las pruebas:', error.message);
    console.error(error.stack);
  } finally {
    // Cerrar conexiones
    console.log('\nCerrando conexiones...');
    await dbManager.shutdown();
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  testDatabaseManager();
}