import { Pool } from 'pg';

const pool = new Pool({
  host: '10.254.252.91',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**',
  ssl: false
});

async function checkRole() {
  try {
    const result = await pool.query(
      'SELECT id, name, is_system_role, description FROM roles WHERE id = $1',
      ['f98a71a9-31bb-47e7-9cca-9b740f3383c7']
    );

    console.log('Role info:', result.rows[0]);

    // Also check all system roles
    const systemRoles = await pool.query(
      'SELECT id, name, is_system_role FROM roles WHERE is_system_role = true'
    );

    console.log('\nAll system roles:');
    systemRoles.rows.forEach(role => {
      console.log(`- ${role.name} (${role.id}): system=${role.is_system_role}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkRole();