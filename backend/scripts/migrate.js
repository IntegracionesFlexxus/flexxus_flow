#!/usr/bin/env node

/**
 * Sistema Unificado de Migraciones
 * Script simple y claro para manejar migraciones SQL
 * 
 * Comandos disponibles:
 *   - up: Ejecutar migraciones pendientes
 *   - down: Revertir última migración
 *   - status: Ver estado de migraciones
 *   - create: Crear nueva migración
 *   - reset: Resetear y re-ejecutar todas
 */

const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  host: process.env.SHARED_DB_HOST || 'localhost',
  port: process.env.SHARED_DB_PORT || 5432,
  database: process.env.SHARED_DB_NAME || 'shared_db',
  user: process.env.SHARED_DB_USER || 'postgres',
  password: process.env.SHARED_DB_PASSWORD || 'postgres123'
};

// Directorio de migraciones
const MIGRATIONS_DIR = path.join(__dirname, '../src/shared/database/migrations');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

// Helper para logging con color
function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

// Crear tabla de migraciones si no existe
async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      batch INTEGER DEFAULT 1,
      checksum VARCHAR(64)
    )
  `);
}

// Calcular checksum de un archivo
async function calculateChecksum(content) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Ejecutar migraciones pendientes
async function runMigrations() {
  const pool = new Pool(dbConfig);
  
  try {
    log('🚀 Ejecutando migraciones...', 'blue');
    log(`📦 Base de datos: ${dbConfig.database}`, 'gray');
    
    await ensureMigrationsTable(pool);
    
    // Leer archivos de migración
    const files = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    log(`📁 Encontradas ${sqlFiles.length} migraciones en total`, 'gray');
    
    // Obtener batch actual
    const batchResult = await pool.query('SELECT MAX(batch) as max_batch FROM migrations');
    const currentBatch = (batchResult.rows[0].max_batch || 0) + 1;
    
    let executedCount = 0;
    
    for (const file of sqlFiles) {
      // Verificar si ya se ejecutó
      const { rows } = await pool.query(
        'SELECT * FROM migrations WHERE filename = $1',
        [file]
      );
      
      if (rows.length > 0) {
        log(`⏭️  ${file} (ya ejecutada)`, 'gray');
        continue;
      }
      
      // Leer y ejecutar migración
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = await fs.readFile(filePath, 'utf8');
      const checksum = await calculateChecksum(sql);
      
      log(`⚙️  Ejecutando: ${file}`, 'yellow');
      
      try {
        await pool.query('BEGIN');
        await pool.query(sql);
        await pool.query(
          'INSERT INTO migrations (filename, batch, checksum) VALUES ($1, $2, $3)',
          [file, currentBatch, checksum]
        );
        await pool.query('COMMIT');
        
        log(`✅ ${file} ejecutada correctamente`, 'green');
        executedCount++;
      } catch (error) {
        await pool.query('ROLLBACK');
        log(`❌ Error en ${file}: ${error.message}`, 'red');
        throw error;
      }
    }
    
    if (executedCount === 0) {
      log('✨ No hay migraciones pendientes', 'green');
    } else {
      log(`✅ ${executedCount} migración(es) ejecutada(s) correctamente`, 'green');
    }
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Revertir última migración
async function rollbackMigration() {
  const pool = new Pool(dbConfig);
  
  try {
    log('🔄 Revirtiendo última migración...', 'blue');
    
    await ensureMigrationsTable(pool);
    
    // Obtener última migración ejecutada
    const result = await pool.query(
      'SELECT * FROM migrations ORDER BY executed_at DESC LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      log('ℹ️  No hay migraciones para revertir', 'yellow');
      return;
    }
    
    const migration = result.rows[0];
    const rollbackFile = migration.filename.replace('.sql', '.down.sql');
    const rollbackPath = path.join(MIGRATIONS_DIR, rollbackFile);
    
    // Verificar si existe archivo de rollback
    try {
      await fs.access(rollbackPath);
    } catch {
      log(`⚠️  No existe archivo de rollback: ${rollbackFile}`, 'yellow');
      log('   Creando rollback vacío (manual requerido)...', 'gray');
      
      // Eliminar registro de la migración
      await pool.query('DELETE FROM migrations WHERE id = $1', [migration.id]);
      log(`✅ Registro de ${migration.filename} eliminado`, 'green');
      return;
    }
    
    // Ejecutar rollback
    const sql = await fs.readFile(rollbackPath, 'utf8');
    
    await pool.query('BEGIN');
    await pool.query(sql);
    await pool.query('DELETE FROM migrations WHERE id = $1', [migration.id]);
    await pool.query('COMMIT');
    
    log(`✅ Revertida: ${migration.filename}`, 'green');
    
  } catch (error) {
    await pool.query('ROLLBACK');
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Mostrar estado de migraciones
async function showStatus() {
  const pool = new Pool(dbConfig);
  
  try {
    log('📊 Estado de Migraciones', 'blue');
    log('─'.repeat(60), 'gray');
    
    await ensureMigrationsTable(pool);
    
    // Obtener migraciones ejecutadas
    const result = await pool.query(
      'SELECT * FROM migrations ORDER BY executed_at ASC'
    );
    
    // Obtener archivos disponibles
    const files = await fs.readdir(MIGRATIONS_DIR);
    const sqlFiles = files.filter(f => f.endsWith('.sql') && !f.endsWith('.down.sql')).sort();
    
    log(`Total de archivos: ${sqlFiles.length}`, 'gray');
    log(`Ejecutadas: ${result.rows.length}`, 'gray');
    log(`Pendientes: ${sqlFiles.length - result.rows.length}`, 'gray');
    log('─'.repeat(60), 'gray');
    
    // Mostrar estado de cada archivo
    for (const file of sqlFiles) {
      const migration = result.rows.find(m => m.filename === file);
      
      if (migration) {
        const date = new Date(migration.executed_at).toLocaleString();
        log(`✅ ${file}`, 'green');
        log(`   Ejecutada: ${date} (Batch: ${migration.batch})`, 'gray');
      } else {
        log(`⏸️  ${file} (pendiente)`, 'yellow');
      }
    }
    
    if (sqlFiles.length === 0) {
      log('ℹ️  No hay archivos de migración', 'yellow');
    }
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Crear nueva migración
async function createMigration() {
  const migrationName = process.argv[3];
  
  if (!migrationName) {
    log('❌ Error: Debes proporcionar un nombre para la migración', 'red');
    log('   Uso: npm run db:create <nombre>', 'gray');
    process.exit(1);
  }
  
  try {
    // Generar timestamp y nombre de archivo
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
    const filename = `${timestamp}_${migrationName}.sql`;
    const downFilename = `${timestamp}_${migrationName}.down.sql`;
    
    // Crear directorio si no existe
    await fs.mkdir(MIGRATIONS_DIR, { recursive: true });
    
    // Paths completos
    const upPath = path.join(MIGRATIONS_DIR, filename);
    const downPath = path.join(MIGRATIONS_DIR, downFilename);
    
    // Template para migración UP
    const upTemplate = `-- Migration: ${migrationName}
-- Created: ${new Date().toISOString()}
-- Description: [Describe what this migration does]

-- ============================================
-- UP Migration
-- ============================================

-- Add your SQL statements here
-- Example:
-- CREATE TABLE IF NOT EXISTS example (
--   id SERIAL PRIMARY KEY,
--   name VARCHAR(255) NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
`;

    // Template para migración DOWN
    const downTemplate = `-- Rollback for: ${migrationName}
-- Created: ${new Date().toISOString()}
-- Description: [Describe how to rollback this migration]

-- ============================================
-- DOWN Migration (Rollback)
-- ============================================

-- Add your rollback SQL statements here
-- Example:
-- DROP TABLE IF EXISTS example;
`;
    
    // Crear archivos
    await fs.writeFile(upPath, upTemplate);
    await fs.writeFile(downPath, downTemplate);
    
    log(`✅ Migración creada:`, 'green');
    log(`   UP:   ${filename}`, 'gray');
    log(`   DOWN: ${downFilename}`, 'gray');
    log(`   Ubicación: ${MIGRATIONS_DIR}`, 'gray');
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Resetear base de datos
async function resetDatabase() {
  const pool = new Pool(dbConfig);
  
  try {
    log('⚠️  ADVERTENCIA: Esto eliminará TODOS los datos', 'yellow');
    log('   Esperando 3 segundos... (Ctrl+C para cancelar)', 'gray');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    log('🔄 Reseteando base de datos...', 'blue');
    
    await ensureMigrationsTable(pool);
    
    // Obtener todas las migraciones en orden inverso
    const result = await pool.query(
      'SELECT * FROM migrations ORDER BY executed_at DESC'
    );
    
    // Revertir cada migración
    for (const migration of result.rows) {
      const rollbackFile = migration.filename.replace('.sql', '.down.sql');
      const rollbackPath = path.join(MIGRATIONS_DIR, rollbackFile);
      
      try {
        const sql = await fs.readFile(rollbackPath, 'utf8');
        await pool.query(sql);
        log(`   ↩️  Revertida: ${migration.filename}`, 'gray');
      } catch {
        log(`   ⏭️  Sin rollback para: ${migration.filename}`, 'gray');
      }
    }
    
    // Limpiar tabla de migraciones
    await pool.query('TRUNCATE TABLE migrations');
    log('✅ Base de datos reseteada', 'green');
    
    // Re-ejecutar todas las migraciones
    log('\n🚀 Re-ejecutando migraciones...', 'blue');
    await pool.end();
    await runMigrations();
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Mostrar ayuda
function showHelp() {
  log('📚 Sistema de Migraciones - Ayuda', 'blue');
  log('─'.repeat(60), 'gray');
  log('Comandos disponibles:', 'yellow');
  log('');
  log('  npm run db:migrate', 'green');
  log('    Ejecuta todas las migraciones pendientes', 'gray');
  log('');
  log('  npm run db:rollback', 'green');
  log('    Revierte la última migración ejecutada', 'gray');
  log('');
  log('  npm run db:status', 'green');
  log('    Muestra el estado de todas las migraciones', 'gray');
  log('');
  log('  npm run db:create <nombre>', 'green');
  log('    Crea una nueva migración con el nombre especificado', 'gray');
  log('');
  log('  npm run db:reset', 'green');
  log('    Resetea la base de datos y re-ejecuta migraciones', 'gray');
  log('');
  log('─'.repeat(60), 'gray');
  log('Ejemplos:', 'yellow');
  log('  npm run db:create create_users_table', 'gray');
  log('  npm run db:migrate', 'gray');
  log('  npm run db:status', 'gray');
}

// Router principal
async function main() {
  const command = process.argv[2];
  
  switch(command) {
    case 'up':
      await runMigrations();
      break;
    case 'down':
      await rollbackMigration();
      break;
    case 'status':
      await showStatus();
      break;
    case 'create':
      await createMigration();
      break;
    case 'reset':
      await resetDatabase();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      if (command) {
        log(`❌ Comando desconocido: ${command}`, 'red');
      }
      showHelp();
      process.exit(1);
  }
}

// Ejecutar
main().catch(error => {
  log(`❌ Error fatal: ${error.message}`, 'red');
  process.exit(1);
});