/**
 * Script para debuggear permisos de SuperAdmin
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Pool } from 'pg';

async function debugPermissions() {
  console.log('🔧 Debuggeando permisos de SuperAdmin...\\n');

  const pool = new Pool({
    host: '10.254.252.91',
    port: 5003,
    database: 'flexxus_shared',
    user: 'flexxus',
    password: 'Flexxus2023**',
    ssl: false
  });

  try {
    // 1. Verificar usuario SuperAdmin
    console.log('1. Verificando usuario SuperAdmin...');
    const userResult = await pool.query(`
      SELECT id, email, first_name, last_name FROM users
      WHERE email = 'cv@flexxus.com'
    `);
    console.log('Usuario:', userResult.rows[0]);

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      throw new Error('Usuario no encontrado');
    }

    // 2. Verificar roles del usuario
    console.log('\\n2. Verificando roles del usuario...');
    const rolesResult = await pool.query(`
      SELECT r.*, ur.company_id
      FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
    `, [userId]);
    console.log('Roles del usuario:');
    console.table(rolesResult.rows);

    // 3. Verificar permisos del rol SuperAdmin
    console.log('\\n3. Verificando permisos del rol SuperAdmin...');
    for (const role of rolesResult.rows) {
      console.log(`\\nPermisos del rol "${role.name}" (${role.id}):`);
      const permissionsResult = await pool.query(`
        SELECT p.*
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = $1 AND p.deleted_at IS NULL
      `, [role.id]);

      console.log(`Encontrados ${permissionsResult.rows.length} permisos:`);
      permissionsResult.rows.forEach(p => {
        console.log(`  - ${p.name} (${p.description || 'sin descripción'})`);
      });
    }

    // 4. Verificar si existe permiso con wildcard
    console.log('\\n4. Verificando permiso wildcard...');
    const wildcardResult = await pool.query(`
      SELECT * FROM permissions WHERE name = '*' AND deleted_at IS NULL
    `);
    console.log('Permiso wildcard:', wildcardResult.rows[0] || 'NO ENCONTRADO');

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

debugPermissions()
  .then(() => {
    console.log('\\n🎉 Debug completado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\\n❌ Error:', error);
    process.exit(1);
  });