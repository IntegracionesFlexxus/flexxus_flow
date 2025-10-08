import { Pool } from 'pg';

const pool = new Pool({
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**'
});

async function check() {
  const client = await pool.connect();
  try {
    // Check if user_companies table exists
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'user_companies'
      )
    `);

    console.log('¿Existe user_companies?', tableExists.rows[0].exists);

    if (tableExists.rows[0].exists) {
      const schema = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'user_companies'
        ORDER BY ordinal_position
      `);

      console.log('\nEsquema de user_companies:');
      schema.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type} ${c.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`));

      // Count entries
      const count = await client.query('SELECT COUNT(*) FROM user_companies');
      console.log(`\nTotal registros: ${count.rows[0].count}`);
    }

    // Check test users and their companies via user_roles
    console.log('\n--- Usuarios de prueba y sus empresas (via user_roles) ---\n');
    const users = await client.query(`
      SELECT
        u.email,
        u.first_name,
        u.last_name,
        c.name as company_name,
        r.name as role_name
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN companies c ON ur.company_id = c.id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.email LIKE '%@test%'
      LIMIT 5
    `);

    users.rows.forEach(u => {
      console.log(`${u.email} -> ${u.company_name || 'SIN EMPRESA'} (${u.role_name || 'SIN ROL'})`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
