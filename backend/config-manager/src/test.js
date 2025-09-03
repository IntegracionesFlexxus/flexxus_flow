// Script de prueba para el Configuration Manager
const config = require('./index');

async function testConfigManager() {
  console.log('=== Probando Configuration Manager ===\n');

  try {
    // 1. Inicializar configuración
    console.log('1. Inicializando configuración...');
    const allConfig = config.initialize();
    console.log('✓ Configuración inicializada\n');

    // 2. Obtener resumen
    console.log('2. Obteniendo resumen de configuración...');
    const summary = config.getSummary();
    console.log('Resumen:', JSON.stringify(summary, null, 2));
    console.log();

    // 3. Probar acceso a configuraciones específicas
    console.log('3. Accediendo a configuraciones específicas...');
    
    // Server config
    const serverPort = config.serverConfig.getValue('server.port');
    console.log(`  - Puerto del servidor: ${serverPort}`);
    
    // Database config
    const sharedDb = config.databaseConfig.get('shared');
    console.log(`  - Base de datos compartida: ${sharedDb.database} en ${sharedDb.host}:${sharedDb.port}`);
    
    // Security config
    const jwtConfig = config.securityConfig.get('jwt');
    console.log(`  - JWT expira en: ${jwtConfig.expiresIn}`);
    console.log();

    // 4. Verificar ambiente
    console.log('4. Verificando ambiente...');
    console.log(`  - ¿Desarrollo? ${config.isDevelopment()}`);
    console.log(`  - ¿Producción? ${config.isProduction()}`);
    console.log(`  - ¿Test? ${config.isTest()}`);
    console.log();

    // 5. Verificar features
    console.log('5. Verificando features habilitadas...');
    const features = config.serverConfig.getFeatures();
    console.log('  Features:', features);
    console.log();

    // 6. Validar contraseña de ejemplo
    console.log('6. Probando validación de contraseña...');
    const testPasswords = ['abc123', 'Abc123!@#', 'Password123'];
    
    for (const pwd of testPasswords) {
      const validation = config.securityConfig.validatePasswordStrength(pwd);
      console.log(`  - "${pwd}": ${validation.valid ? '✓ Válida' : '✗ Inválida'}`);
      if (!validation.valid) {
        validation.errors.forEach(err => console.log(`    • ${err}`));
      }
    }
    console.log();

    // 7. Obtener configuración de base de datos como string de conexión
    console.log('7. Generando connection strings...');
    const databases = ['shared', 'omni', 'crm', 'workflow', 'analytics'];
    
    for (const db of databases) {
      const connStr = config.databaseConfig.getConnectionString(db);
      console.log(`  - ${db}: ${connStr ? connStr.replace(/:[^@]+@/, ':****@') : 'No configurada'}`);
    }
    console.log();

    // 8. Validar configuración actual
    console.log('8. Validando configuración actual...');
    const validation = config.validate();
    
    if (validation.valid) {
      console.log('✓ Configuración válida');
    } else {
      console.log('✗ Errores de validación:');
      validation.errors.forEach(error => {
        console.log(`  - ${error.section}:`);
        error.details.forEach(detail => {
          console.log(`    • ${detail.field}: ${detail.message}`);
        });
      });
    }
    
    if (validation.warnings.length > 0) {
      console.log('\n⚠ Advertencias:');
      validation.warnings.forEach(warning => {
        console.log(`  - ${warning.section}: ${warning.message}`);
      });
    }
    console.log();

    // 9. Exportar configuración (sin datos sensibles)
    console.log('9. Exportando configuración...');
    const exported = config.configManager.export();
    console.log('Configuración exportada:', JSON.stringify(exported, null, 2));
    console.log();

    // 10. Probar recarga de configuración
    console.log('10. Recargando configuración...');
    config.reload();
    console.log('✓ Configuración recargada\n');

    console.log('=== Pruebas completadas exitosamente ===\n');

  } catch (error) {
    console.error('✗ Error en las pruebas:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  testConfigManager();
}