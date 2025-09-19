#!/usr/bin/env ts-node
/**
 * FASE 0: Script TypeScript para ejecutar la reestructuración completa
 * Uso: npm run script phase0_runAll.ts
 */

import { Database } from '../src/shared/database/Database';
import { config } from '../src/config/environment';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ExecutionStep {
  name: string;
  description: string;
  sqlFile: string;
  required: boolean;
}

const EXECUTION_STEPS: ExecutionStep[] = [
  {
    name: 'LIMPIEZA',
    description: 'Limpiar estructura conflictiva existente',
    sqlFile: 'phase0_cleanDatabase.sql',
    required: true
  },
  {
    name: 'CREACIÓN',
    description: 'Crear estructura correcta de roles',
    sqlFile: 'phase0_createRoleSystem.sql',
    required: true
  },
  {
    name: 'VALIDACIÓN',
    description: 'Validar estructura creada',
    sqlFile: 'phase0_validateRoleSystem.sql',
    required: false
  }
];

async function executePhase0(): Promise<void> {
  let database: Database | null = null;

  try {
    console.log('🚀 INICIANDO FASE 0: REESTRUCTURACIÓN COMPLETA DEL SISTEMA DE ROLES');
    console.log('⚠️  ADVERTENCIA: Este script eliminará todos los datos de roles existentes');

    // Confirmar ejecución
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const confirm = await new Promise<string>((resolve) => {
      rl.question('¿Desea continuar? (escriba "EJECUTAR" para proceder): ', resolve);
    });

    rl.close();

    if (confirm !== 'EJECUTAR') {
      console.log('❌ Operación cancelada por el usuario');
      return;
    }

    // Conectar a base de datos
    console.log('\n📡 Conectando a base de datos...');
    database = new Database(config.database);
    await database.connect();
    console.log('✅ Conexión establecida');

    // Ejecutar cada paso
    for (const step of EXECUTION_STEPS) {
      console.log(`\n${getStepIcon(step.name)} EJECUTANDO: ${step.name}`);
      console.log(`📋 ${step.description}`);

      try {
        // Leer archivo SQL
        const sqlPath = join(__dirname, step.sqlFile);
        const sqlContent = readFileSync(sqlPath, 'utf-8');

        // Dividir en statements individuales y ejecutar
        const statements = sqlContent
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

        let executedCount = 0;
        for (const statement of statements) {
          if (statement.trim()) {
            const result = await database.query(statement);
            if (result.rows && result.rows.length > 0) {
              // Mostrar resultados de validación
              result.rows.forEach(row => {
                const values = Object.values(row);
                if (values.length > 0) {
                  console.log(`   ${values.join(' | ')}`);
                }
              });
            }
            executedCount++;
          }
        }

        console.log(`✅ ${step.name} completado (${executedCount} statements ejecutados)`);

      } catch (error) {
        console.error(`❌ Error en ${step.name}:`, error.message);
        if (step.required) {
          throw error;
        } else {
          console.log(`⚠️  Continuando porque ${step.name} no es crítico...`);
        }
      }
    }

    // Resumen final
    console.log('\n🎉 FASE 0 COMPLETADA EXITOSAMENTE');
    console.log('\n📊 RESUMEN FINAL:');

    const summary = await database.query(`
      SELECT
        'Usuarios totales' as metric, COUNT(*)::text as value
      FROM users WHERE deleted_at IS NULL
      UNION ALL
      SELECT 'SuperAdmins', COUNT(*)::text
      FROM users WHERE role = 'super_admin'
      UNION ALL
      SELECT 'Roles disponibles', COUNT(*)::text
      FROM roles WHERE deleted_at IS NULL
      UNION ALL
      SELECT 'Permisos totales', COUNT(*)::text
      FROM permissions WHERE deleted_at IS NULL
    `);

    summary.rows.forEach(row => {
      console.log(`   ${row.metric}: ${row.value}`);
    });

    console.log('\n📝 PRÓXIMOS PASOS:');
    console.log('   1. FASE 1: Corrección de AuthService');
    console.log('   2. FASE 2: Actualización de Middlewares');
    console.log('   3. FASE 3: Implementación de PermissionService');
    console.log('   4. FASE 4: Testing y validación');

  } catch (error) {
    console.error('💥 Error crítico durante la ejecución:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);

  } finally {
    if (database) {
      await database.disconnect();
      console.log('🔌 Conexión a base de datos cerrada');
    }
  }
}

function getStepIcon(stepName: string): string {
  switch (stepName) {
    case 'LIMPIEZA': return '🧹';
    case 'CREACIÓN': return '🏗️';
    case 'VALIDACIÓN': return '✅';
    default: return '🔧';
  }
}

// Ejecutar el script
executePhase0()
  .then(() => {
    console.log('✅ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error no manejado:', error);
    process.exit(1);
  });