import { Pool } from 'pg';

async function checkSuperAdminPermissions() {
  const pool = new Pool({
    host: '10.254.252.91',
    port: 5003,
    database: 'flexxus_shared',
    user: 'flexxus',
    password: 'Flexxus2023**',
    ssl: false
  });

  try {
    console.log('=== Permissions Table Structure ===');
    const permissionsColumns = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'permissions'
      ORDER BY ordinal_position;
    `);
    console.table(permissionsColumns.rows);

    console.log('\n=== Super Admin Role Permissions ===');
    const superAdminPermissions = await pool.query(`
      SELECT p.name, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN roles r ON rp.role_id = r.id
      WHERE r.name = 'Super Admin'
      ORDER BY p.name;
    `);
    console.table(superAdminPermissions.rows);

    console.log('\n=== All Available Permissions (system/admin related) ===');
    const allPermissions = await pool.query(`
      SELECT name, description
      FROM permissions
      WHERE name LIKE '%superadmin%' OR name LIKE '%system%' OR name LIKE '%admin%'
      ORDER BY name;
    `);
    console.table(allPermissions.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkSuperAdminPermissions();