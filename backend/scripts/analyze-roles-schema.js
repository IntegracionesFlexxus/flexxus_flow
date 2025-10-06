const { Pool } = require('pg');

const pool = new Pool({
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**'
});

async function analyzeSchema() {
  console.log('🔍 ANÁLISIS ESQUEMA DE ROLES EN flexxus_shared\n');
  console.log('='.repeat(80));

  try {
    // 1. Tablas relacionadas
    console.log('\n📋 TABLAS RELACIONADAS:\n');
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name LIKE '%role%' OR table_name LIKE '%permission%')
      ORDER BY table_name
    `);
    tables.rows.forEach(t => console.log('  ✓', t.table_name));

    // 2. Estructura tabla roles
    console.log('\n\n📐 ESTRUCTURA TABLA roles:\n');
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'roles'
      ORDER BY ordinal_position
    `);
    cols.rows.forEach(c => {
      console.log(`  ${c.column_name.padEnd(25)} ${c.data_type.padEnd(20)} NULL: ${c.is_nullable}`);
    });

    // 3. Datos en roles
    console.log('\n\n📊 DATOS EN roles:\n');
    const roles = await pool.query('SELECT * FROM roles ORDER BY created_at');
    console.log(`  Total: ${roles.rowCount} roles\n`);
    roles.rows.forEach((r, i) => {
      console.log(`  [${i+1}] ${r.name}`);
      console.log(`      ID: ${r.id}`);
      console.log(`      Descripción: ${r.description}`);
      console.log(`      Company: ${r.company_id || 'NULL (sistema)'}`);
      console.log(`      Sistema: ${r.is_system_role}`);
      console.log(`      Estado: ${r.status}`);
      console.log(`      Creado: ${r.created_at}\n`);
    });

    // 4. Estructura user_roles
    console.log('\n📐 ESTRUCTURA TABLA user_roles:\n');
    const urCols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_roles'
      ORDER BY ordinal_position
    `);
    urCols.rows.forEach(c => {
      console.log(`  ${c.column_name.padEnd(25)} ${c.data_type.padEnd(20)}`);
    });

    // 5. Datos user_roles
    console.log('\n\n📊 DATOS EN user_roles:\n');
    const urData = await pool.query('SELECT COUNT(*) as total FROM user_roles');
    console.log(`  Total asignaciones: ${urData.rows[0].total}`);

    const urSample = await pool.query(`
      SELECT ur.*, u.email, r.name as role_name
      FROM user_roles ur
      LEFT JOIN users u ON ur.user_id = u.id
      LEFT JOIN roles r ON ur.role_id = r.id
      LIMIT 5
    `);
    if (urSample.rowCount > 0) {
      console.log('\n  Ejemplos:');
      urSample.rows.forEach((ur, i) => {
        console.log(`\n  [${i+1}] ${ur.email || 'N/A'} → ${ur.role_name}`);
        console.log(`      Company: ${ur.company_id}`);
      });
    }

    // 6. Estructura role_permissions
    console.log('\n\n📐 ESTRUCTURA TABLA role_permissions:\n');
    const rpCols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'role_permissions'
      ORDER BY ordinal_position
    `);
    rpCols.rows.forEach(c => {
      console.log(`  ${c.column_name.padEnd(25)} ${c.data_type.padEnd(20)}`);
    });

    // 7. Permisos por rol
    console.log('\n\n📊 PERMISOS POR ROL:\n');
    const perms = await pool.query(`
      SELECT r.name, COUNT(rp.permission_id) as count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      GROUP BY r.id, r.name
      ORDER BY r.name
    `);
    perms.rows.forEach(p => {
      console.log(`  ${p.name.padEnd(30)} → ${p.count} permisos`);
    });

    // 8. Estructura permissions
    console.log('\n\n📐 ESTRUCTURA TABLA permissions:\n');
    const pCols = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'permissions'
      ORDER BY ordinal_position
    `);
    pCols.rows.forEach(c => {
      console.log(`  ${c.column_name.padEnd(25)} ${c.data_type}`);
    });

    // 9. Total permisos
    console.log('\n\n📊 TOTAL PERMISOS:\n');
    const totP = await pool.query('SELECT COUNT(*) as total FROM permissions');
    console.log(`  Total: ${totP.rows[0].total} permisos`);

    // 10. Ejemplo de permisos
    const sampleP = await pool.query('SELECT * FROM permissions LIMIT 5');
    console.log('\n  Ejemplos:');
    sampleP.rows.forEach((p, i) => {
      console.log(`\n  [${i+1}] ${p.name}`);
      console.log(`      Resource: ${p.resource}, Action: ${p.action}`);
      console.log(`      Descripción: ${p.description || 'N/A'}`);
    });

    // 11. Índices
    console.log('\n\n🔑 ÍNDICES EN roles:\n');
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'roles'
    `);
    indexes.rows.forEach(idx => {
      console.log(`  ${idx.indexname}`);
    });

    // 12. Foreign keys
    console.log('\n\n🔗 FOREIGN KEYS EN roles:\n');
    const fkeys = await pool.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table,
        ccu.column_name AS foreign_column
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'roles'
    `);
    if (fkeys.rowCount > 0) {
      fkeys.rows.forEach(fk => {
        console.log(`  ${fk.column_name} → ${fk.foreign_table}.${fk.foreign_column}`);
      });
    } else {
      console.log('  (Sin foreign keys)');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
    console.log('\n' + '='.repeat(80));
  }
}

analyzeSchema();
