// ============================================
// Test de Conexión y Funcionalidad Básica
// Nivel 1 - Verificación del Sprint 1
// ============================================

const db = require('./config/database');
const userRepository = require('./repositories/userRepository');
const companyRepository = require('./repositories/companyRepository');

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

async function testConnections() {
  console.log(colors.cyan + '\n========================================');
  console.log('  🧪 Test de Conexiones a Base de Datos');
  console.log('========================================' + colors.reset);
  
  const databases = ['shared', 'personas'];
  
  for (const dbName of databases) {
    const connected = await db.checkConnection(dbName);
    if (connected) {
      console.log(colors.green + `✓ ${dbName}: Conectado exitosamente` + colors.reset);
    } else {
      console.log(colors.red + `✗ ${dbName}: Error de conexión` + colors.reset);
    }
  }
}

async function testUserOperations() {
  console.log(colors.cyan + '\n========================================');
  console.log('  👤 Test de Operaciones de Usuario');
  console.log('========================================' + colors.reset);
  
  try {
    // Test 1: Verificar login con credenciales de prueba
    console.log(colors.yellow + '\n→ Probando login...' + colors.reset);
    const loginResult = await userRepository.verifyPassword('admin@demo.com', 'admin123');
    
    if (loginResult.valid) {
      console.log(colors.green + '  ✓ Login exitoso' + colors.reset);
      console.log(`    Usuario: ${loginResult.user.first_name} ${loginResult.user.last_name}`);
      console.log(`    Email: ${loginResult.user.email}`);
      
      // Test 2: Obtener empresas del usuario
      console.log(colors.yellow + '\n→ Obteniendo empresas del usuario...' + colors.reset);
      const companies = await userRepository.getCompanies(loginResult.user.id);
      console.log(colors.green + `  ✓ Empresas encontradas: ${companies.length}` + colors.reset);
      
      companies.forEach(company => {
        console.log(`    - ${company.name} (${company.role})${company.is_default ? ' [DEFAULT]' : ''}`);
      });
      
      // Test 3: Actualizar último login
      console.log(colors.yellow + '\n→ Actualizando último login...' + colors.reset);
      await userRepository.updateLastLogin(loginResult.user.id);
      console.log(colors.green + '  ✓ Último login actualizado' + colors.reset);
      
    } else {
      console.log(colors.red + '  ✗ Login fallido' + colors.reset);
    }
    
    // Test 4: Intentar login con credenciales incorrectas
    console.log(colors.yellow + '\n→ Probando login con password incorrecto...' + colors.reset);
    const failedLogin = await userRepository.verifyPassword('admin@demo.com', 'wrongpassword');
    
    if (!failedLogin.valid) {
      console.log(colors.green + '  ✓ Login rechazado correctamente' + colors.reset);
    } else {
      console.log(colors.red + '  ✗ Error: Login no debería ser válido' + colors.reset);
    }
    
  } catch (error) {
    console.log(colors.red + `  ✗ Error: ${error.message}` + colors.reset);
  }
}

async function testCompanyOperations() {
  console.log(colors.cyan + '\n========================================');
  console.log('  🏢 Test de Operaciones de Empresa');
  console.log('========================================' + colors.reset);
  
  try {
    // Test 1: Buscar empresa por ID
    console.log(colors.yellow + '\n→ Buscando empresa por ID...' + colors.reset);
    const company = await companyRepository.findById('11111111-1111-1111-1111-111111111111');
    
    if (company) {
      console.log(colors.green + '  ✓ Empresa encontrada' + colors.reset);
      console.log(`    Nombre: ${company.name}`);
      console.log(`    Plan: ${company.plan}`);
      console.log(`    Estado: ${company.status}`);
      
      // Test 2: Obtener usuarios de la empresa
      console.log(colors.yellow + '\n→ Obteniendo usuarios de la empresa...' + colors.reset);
      const users = await companyRepository.getUsers(company.id);
      console.log(colors.green + `  ✓ Usuarios encontrados: ${users.length}` + colors.reset);
      
      users.forEach(user => {
        console.log(`    - ${user.first_name} ${user.last_name} (${user.role})`);
      });
      
      // Test 3: Contar usuarios por rol
      console.log(colors.yellow + '\n→ Contando usuarios por rol...' + colors.reset);
      const roleCounts = await companyRepository.countUsersByRole(company.id);
      console.log(colors.green + '  ✓ Conteo completado' + colors.reset);
      
      Object.entries(roleCounts).forEach(([role, count]) => {
        console.log(`    ${role}: ${count}`);
      });
      
      // Test 4: Obtener estadísticas
      console.log(colors.yellow + '\n→ Obteniendo estadísticas...' + colors.reset);
      const stats = await companyRepository.getStats(company.id);
      console.log(colors.green + '  ✓ Estadísticas obtenidas' + colors.reset);
      console.log(`    Total usuarios: ${stats.totalUsers}`);
      console.log(`    Total contactos: ${stats.totalContacts}`);
      
    } else {
      console.log(colors.red + '  ✗ Empresa no encontrada' + colors.reset);
    }
    
  } catch (error) {
    console.log(colors.red + `  ✗ Error: ${error.message}` + colors.reset);
  }
}

async function testContactsTable() {
  console.log(colors.cyan + '\n========================================');
  console.log('  📋 Test de Tabla de Contactos');
  console.log('========================================' + colors.reset);
  
  try {
    console.log(colors.yellow + '\n→ Verificando tabla de contactos...' + colors.reset);
    
    const result = await db.query(
      'SELECT COUNT(*) as total FROM contacts WHERE company_id = $1',
      ['11111111-1111-1111-1111-111111111111'],
      'personas'
    );
    
    const total = result.rows[0].total;
    console.log(colors.green + `  ✓ Tabla accesible - ${total} contactos encontrados` + colors.reset);
    
    // Obtener algunos contactos de ejemplo
    const contacts = await db.query(
      'SELECT first_name, last_name, email, contact_type FROM contacts WHERE company_id = $1 LIMIT 3',
      ['11111111-1111-1111-1111-111111111111'],
      'personas'
    );
    
    if (contacts.rows.length > 0) {
      console.log('    Ejemplos:');
      contacts.rows.forEach(contact => {
        console.log(`    - ${contact.first_name} ${contact.last_name} (${contact.contact_type})`);
      });
    }
    
  } catch (error) {
    console.log(colors.red + `  ✗ Error: ${error.message}` + colors.reset);
  }
}

async function runAllTests() {
  console.log(colors.green + '\n╔══════════════════════════════════════╗');
  console.log('║   FLEXXUS FLOW - DATABASE TEST SUITE  ║');
  console.log('║         Sprint 1 - Nivel 1 MVP        ║');
  console.log('╚══════════════════════════════════════╝' + colors.reset);
  
  try {
    await testConnections();
    await testUserOperations();
    await testCompanyOperations();
    await testContactsTable();
    
    console.log(colors.green + '\n========================================');
    console.log('  ✅ TODOS LOS TESTS COMPLETADOS');
    console.log('========================================' + colors.reset);
    
  } catch (error) {
    console.log(colors.red + '\n❌ ERROR FATAL:' + colors.reset, error);
  } finally {
    // Cerrar conexiones
    console.log(colors.yellow + '\n→ Cerrando conexiones...' + colors.reset);
    await db.closeAll();
    console.log(colors.green + '✓ Conexiones cerradas\n' + colors.reset);
  }
}

// Ejecutar tests si se llama directamente
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };