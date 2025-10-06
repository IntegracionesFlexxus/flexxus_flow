const { Pool } = require('pg');

const pool = new Pool({
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**'
});

async function checkFeatureFlags() {
  console.log('🔍 ANÁLISIS DE FEATURE FLAGS EN BD\n');
  console.log('='.repeat(80));

  try {
    // Buscar tablas de feature flags
    console.log('\n📋 TABLAS DE FEATURE FLAGS:\n');
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name LIKE '%feature%'
      ORDER BY table_name
    `);

    if (tables.rowCount === 0) {
      console.log('  ⚠️  No hay tablas de feature flags en la base de datos');
    } else {
      tables.rows.forEach(t => console.log('  ✓', t.table_name));

      // Contar registros en cada tabla
      for (const table of tables.rows) {
        const count = await pool.query(`SELECT COUNT(*) as total FROM ${table.table_name}`);
        console.log(`     → ${count.rows[0].total} registros`);

        // Mostrar algunos datos
        const sample = await pool.query(`SELECT * FROM ${table.table_name} LIMIT 3`);
        if (sample.rowCount > 0) {
          console.log('     Ejemplos:');
          sample.rows.forEach((row, i) => {
            console.log(`       [${i+1}]`, JSON.stringify(row, null, 2).substring(0, 100) + '...');
          });
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await pool.end();
    console.log('\n' + '='.repeat(80));
  }
}

checkFeatureFlags();
