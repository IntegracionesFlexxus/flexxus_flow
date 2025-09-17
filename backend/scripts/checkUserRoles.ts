import { Pool } from 'pg';

async function checkUserRoles() {
  const pool = new Pool({
    host: '10.254.252.91',
    port: 5003,
    database: 'flexxus_shared',
    user: 'flexxus',
    password: 'Flexxus2023**',
    ssl: false
  });

  try {
    console.log('=== Current Users ===');
    const users = await pool.query(`
      SELECT id, email, first_name, last_name, status
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at;
    `);
    console.table(users.rows);

    console.log('\n=== User Roles ===');
    const userRoles = await pool.query(`
      SELECT ur.user_id, u.email, ur.role_id, r.name as role_name
      FROM user_roles ur
      JOIN users u ON u.id = ur.user_id
      JOIN roles r ON r.id = ur.role_id
      WHERE u.deleted_at IS NULL
      ORDER BY u.email;
    `);
    console.table(userRoles.rows);

    console.log('\n=== Available Roles ===');
    const roles = await pool.query(`
      SELECT id, name, description, is_system_role
      FROM roles
      WHERE deleted_at IS NULL
      ORDER BY name;
    `);
    console.table(roles.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkUserRoles();