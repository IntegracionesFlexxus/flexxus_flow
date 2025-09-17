import { Pool } from 'pg';

async function checkTable() {
  const pool = new Pool({
    host: '10.254.252.91',
    port: 5003,
    database: 'flexxus_shared',
    user: 'flexxus',
    password: 'Flexxus2023**',
    ssl: false
  });

  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('Columns in users table:');
    console.table(result.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkTable();