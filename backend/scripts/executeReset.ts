/**
 * Script para ejecutar el reset de roles usando SQL directo
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

async function executeReset() {
  console.log('🔧 Iniciando reset del sistema de roles...\n');

  const pool = new Pool({
    host: '10.254.252.91',
    port: 5003,
    database: 'flexxus_shared',
    user: 'flexxus',
    password: 'Flexxus2023**',
    ssl: false
  });

  try {
    // Leer el archivo SQL
    const sqlPath = join(__dirname, 'testExactQuery.sql');
    const sqlContent = readFileSync(sqlPath, 'utf8');

    console.log('📄 Ejecutando script SQL...');
    const result = await pool.query(sqlContent);

    console.log('✅ Script ejecutado exitosamente');
    console.log('\n📊 Resultados:');

    // Si hay múltiples resultados, mostrarlos
    if (Array.isArray(result)) {
      result.forEach((res, index) => {
        if (res.rows && res.rows.length > 0) {
          console.log(`\nResultado ${index + 1}:`);
          console.table(res.rows);
        }
      });
    } else if (result.rows && result.rows.length > 0) {
      console.table(result.rows);
    }

  } catch (error) {
    console.error('❌ Error ejecutando el reset:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

executeReset()
  .then(() => {
    console.log('\n🎉 Reset completado exitosamente!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });