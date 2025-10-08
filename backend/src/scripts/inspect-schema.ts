/**
 * Script para inspeccionar el esquema de la base de datos
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**'
});

async function inspectSchema() {
  const client = await pool.connect();

  try {
    console.log('\n🔍 Inspeccionando esquema de la base de datos\n');
    console.log('='.repeat(80) + '\n');

    const tables = ['companies', 'plans', 'users', 'roles', 'permissions', 'user_roles', 'role_permissions'];

    for (const table of tables) {
      console.log(`\n📋 Tabla: ${table}`);
      console.log('-'.repeat(80));

      const result = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      if (result.rows.length > 0) {
        for (const col of result.rows) {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
        }
      } else {
        console.log('  ❌ Tabla no encontrada');
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } finally {
    client.release();
    await pool.end();
  }
}

inspectSchema().catch(console.error);
