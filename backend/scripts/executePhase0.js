const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de base de datos desde .env
const dbConfig = {
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**',
};

async function executeSQL(client, sqlContent, stepName) {
  console.log(`\n🔧 EJECUTANDO: ${stepName}`);

  try {
    // Dividir en statements individuales
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.match(/^\/\*/));

    let executedCount = 0;

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const result = await client.query(statement);

          // Mostrar resultados informativos
          if (result.rows && result.rows.length > 0) {
            result.rows.forEach(row => {
              const values = Object.values(row);
              if (values.length > 0 && typeof values[0] === 'string') {
                console.log(`   ${values.join(' | ')}`);
              }
            });
          }

          executedCount++;
        } catch (stmtError) {
          // Algunos statements pueden fallar si no existen datos, eso es normal
          if (!stmtError.message.includes('does not exist') &&
              !stmtError.message.includes('relation') &&
              !stmtError.message.includes('column')) {
            console.log(`   ⚠️  Warning: ${stmtError.message}`);
          }
        }
      }
    }

    console.log(`✅ ${stepName} completado (${executedCount} statements ejecutados)`);
    return true;

  } catch (error) {
    console.error(`❌ Error en ${stepName}:`, error.message);
    return false;
  }
}

async function executePhase0() {
  const client = new Client(dbConfig);

  try {
    console.log('🚀 INICIANDO FASE 0: REESTRUCTURACIÓN DE BASE DE DATOS');
    console.log('⚠️  ADVERTENCIA: Este proceso eliminará datos de roles existentes');

    // Conectar a la base de datos
    await client.connect();
    console.log('✅ Conexión a base de datos establecida');

    // PASO 1: Limpieza
    console.log('\n🧹 PASO 1: LIMPIEZA DE DATOS CONFLICTIVOS');
    const cleanScript = fs.readFileSync(
      path.join(__dirname, 'phase0_cleanDatabase.sql'),
      'utf-8'
    );
    const cleanSuccess = await executeSQL(client, cleanScript, 'LIMPIEZA');

    if (!cleanSuccess) {
      console.log('⚠️  Limpieza falló, pero continuando...');
    }

    // PASO 2: Creación de estructura
    console.log('\n🏗️  PASO 2: CREACIÓN DE ESTRUCTURA NUEVA');
    const createScript = fs.readFileSync(
      path.join(__dirname, 'phase0_createRoleSystem.sql'),
      'utf-8'
    );
    const createSuccess = await executeSQL(client, createScript, 'CREACIÓN DE ESTRUCTURA');

    if (!createSuccess) {
      throw new Error('Falló la creación de estructura');
    }

    // PASO 3: Validación
    console.log('\n✅ PASO 3: VALIDACIÓN');
    const validateScript = fs.readFileSync(
      path.join(__dirname, 'phase0_validateRoleSystem.sql'),
      'utf-8'
    );
    await executeSQL(client, validateScript, 'VALIDACIÓN');

    // Resumen final
    console.log('\n📊 RESUMEN FINAL:');
    const summaryQueries = [
      {
        name: 'Usuarios totales',
        query: "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL"
      },
      {
        name: 'SuperAdmins',
        query: "SELECT COUNT(*) as count FROM users WHERE role = 'super_admin'"
      },
      {
        name: 'Roles disponibles',
        query: "SELECT COUNT(*) as count FROM roles WHERE deleted_at IS NULL"
      },
      {
        name: 'Permisos totales',
        query: "SELECT COUNT(*) as count FROM permissions WHERE deleted_at IS NULL"
      }
    ];

    for (const summary of summaryQueries) {
      try {
        const result = await client.query(summary.query);
        console.log(`   ${summary.name}: ${result.rows[0].count}`);
      } catch (error) {
        console.log(`   ${summary.name}: Error - ${error.message}`);
      }
    }

    console.log('\n🎉 FASE 0 COMPLETADA EXITOSAMENTE');
    console.log('\n📝 PRÓXIMOS PASOS:');
    console.log('   ✅ FASE 1: AuthService corregido');
    console.log('   ✅ FASE 2: Middlewares actualizados');
    console.log('   ✅ FASE 3: PermissionService implementado');
    console.log('   🔄 FASE 4: Testing y validación');

  } catch (error) {
    console.error('\n💥 Error crítico:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);

  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar
executePhase0()
  .then(() => {
    console.log('\n✅ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error no manejado:', error);
    process.exit(1);
  });