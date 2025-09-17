import { Pool } from 'pg';

async function checkCompanies() {
  const pool = new Pool({
    host: '10.254.252.91',
    port: 5003,
    database: 'flexxus_shared',
    user: 'flexxus',
    password: 'Flexxus2023**',
    ssl: false
  });

  try {
    console.log('=== Available Companies ===');
    const companies = await pool.query(`
      SELECT id, name, status, created_at
      FROM companies
      WHERE deleted_at IS NULL
      ORDER BY created_at;
    `);
    console.table(companies.rows);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkCompanies();