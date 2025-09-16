// Script para validar la configuración actual
const config = require('./index');
const fs = require('fs');
const path = require('path');

function validateConfiguration() {
  console.log('=== Validador de Configuración ===\n');

  // Verificar si existe archivo .env
  const envPath = path.resolve(process.cwd(), '.env');
  const envExists = fs.existsSync(envPath);

  if (!envExists) {
    console.warn('⚠ No se encontró archivo .env');
    console.log('  Copia .env.example a .env y configura los valores necesarios\n');
  }

  try {
    // Inicializar y validar
    console.log('Validando configuración...\n');
    config.initialize();
    
    const validation = config.validate();
    const summary = config.getSummary();

    // Mostrar resultado de validación
    if (validation.valid) {
      console.log('✅ CONFIGURACIÓN VÁLIDA\n');
    } else {
      console.log('❌ CONFIGURACIÓN INVÁLIDA\n');
      console.log('Errores encontrados:');
      validation.errors.forEach(error => {
        console.log(`\n  ${error.section}:`);
        error.details.forEach(detail => {
          console.log(`    ✗ ${detail.field}: ${detail.message}`);
        });
      });
      console.log();
    }

    // Mostrar advertencias
    if (validation.warnings.length > 0) {
      console.log('⚠️  ADVERTENCIAS:\n');
      validation.warnings.forEach(warning => {
        console.log(`  - ${warning.section}: ${warning.message}`);
      });
      console.log();
    }

    // Mostrar resumen de configuración
    console.log('📊 RESUMEN DE CONFIGURACIÓN:\n');
    console.log(`Ambiente: ${summary.environment}`);
    console.log(`Servidor: ${summary.server.server.host}:${summary.server.server.port}`);
    console.log(`Aplicación: ${summary.server.app.name} v${summary.server.app.version}`);
    console.log();

    // Verificar bases de datos
    console.log('🗄️  BASES DE DATOS:');
    Object.entries(summary.databases).forEach(([name, db]) => {
      console.log(`  ${name}: ${db.database} @ ${db.host}:${db.port} (SSL: ${db.ssl})`);
    });
    console.log();

    // Verificar seguridad
    console.log('🔒 SEGURIDAD:');
    console.log(`  JWT: ${summary.security.jwt.expiresIn} (${summary.security.jwt.algorithm})`);
    console.log(`  Bcrypt rounds: ${summary.security.bcrypt.rounds}`);
    console.log(`  2FA: ${summary.security.twoFactor.enabled ? 'Habilitado' : 'Deshabilitado'}`);
    console.log(`  OAuth: ${summary.security.oauth.enabled ? `Habilitado (${summary.security.oauth.providers.join(', ')})` : 'Deshabilitado'}`);
    console.log();

    // Verificar features
    console.log('🚀 FEATURES:');
    const features = config.serverConfig.getFeatures();
    if (Object.keys(features).length > 0) {
      Object.entries(features).forEach(([feature, enabled]) => {
        console.log(`  ${feature}: ${enabled ? '✓' : '✗'}`);
      });
    } else {
      console.log('  No hay features configuradas');
    }
    console.log();

    // Recomendaciones
    if (!validation.valid || validation.warnings.length > 0) {
      console.log('💡 RECOMENDACIONES:\n');
      
      if (!envExists) {
        console.log('  1. Crea un archivo .env basado en .env.example');
      }
      
      if (validation.errors.some(e => e.section.includes('security'))) {
        console.log('  2. Configura las variables de seguridad (JWT_SECRET, etc.)');
      }
      
      if (validation.errors.some(e => e.section.includes('database'))) {
        console.log('  3. Verifica las credenciales de base de datos');
      }
      
      if (validation.warnings.some(w => w.section === 'email')) {
        console.log('  4. Configura SMTP para notificaciones por email');
      }
      
      if (validation.warnings.some(w => w.section === 'monitoring')) {
        console.log('  5. Considera configurar Sentry para monitoreo de errores');
      }
      
      console.log();
    }

    // Estado final
    const exitCode = validation.valid ? 0 : 1;
    
    if (validation.valid && validation.warnings.length === 0) {
      console.log('✨ La configuración está perfecta y lista para usar!\n');
    } else if (validation.valid) {
      console.log('✓ La configuración es funcional pero tiene advertencias.\n');
    } else {
      console.log('✗ La configuración necesita correcciones antes de poder usarse.\n');
    }

    process.exit(exitCode);

  } catch (error) {
    console.error('❌ ERROR CRÍTICO:\n');
    console.error(`  ${error.message}\n`);
    
    if (error.message.includes('Variables de entorno requeridas faltantes')) {
      console.log('Variables faltantes:');
      const missing = error.message.match(/: (.+)$/);
      if (missing) {
        missing[1].split(', ').forEach(variable => {
          console.log(`  ✗ ${variable}`);
        });
      }
      console.log('\nAsegúrate de tener un archivo .env con todas las variables requeridas.\n');
    }
    
    process.exit(1);
  }
}

// Ejecutar validación
if (require.main === module) {
  validateConfiguration();
}

module.exports = validateConfiguration;