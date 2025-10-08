import { Pool } from 'pg';

const pool = new Pool({
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**'
});

async function verifyUser() {
  const client = await pool.connect();
  try {
    const email = 'juan.perez@test.agrosoft.com';

    console.log(`\n🔍 Verificando usuario: ${email}\n`);

    // User info - buscar con ILIKE para manejar tildes
    const userResult = await client.query(
      "SELECT id, email, first_name, last_name, status FROM users WHERE email LIKE '%juan%agrosoft%'",
      []
    );

    if (userResult.rows.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    const user = userResult.rows[0];
    console.log('✅ Usuario encontrado:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nombre: ${user.first_name} ${user.last_name}`);
    console.log(`   Estado: ${user.status}\n`);

    // user_companies
    const companiesResult = await client.query(`
      SELECT
        uc.id,
        uc.company_id,
        c.name as company_name,
        uc.role,
        uc.is_default,
        uc.status
      FROM user_companies uc
      INNER JOIN companies c ON uc.company_id = c.id
      WHERE uc.user_id = $1
    `, [user.id]);

    console.log(`📊 Empresas asociadas (user_companies): ${companiesResult.rows.length}`);
    companiesResult.rows.forEach((row, i) => {
      console.log(`\n   ${i + 1}. ${row.company_name}`);
      console.log(`      Company ID: ${row.company_id}`);
      console.log(`      Rol: ${row.role}`);
      console.log(`      Default: ${row.is_default ? '✅' : '❌'}`);
      console.log(`      Estado: ${row.status}`);
    });

    // user_roles
    const rolesResult = await client.query(`
      SELECT
        ur.role_id,
        r.name as role_name,
        c.name as company_name
      FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      INNER JOIN companies c ON ur.company_id = c.id
      WHERE ur.user_id = $1
    `, [user.id]);

    console.log(`\n📋 Roles asignados (user_roles): ${rolesResult.rows.length}`);
    rolesResult.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.role_name} en ${row.company_name}`);
    });

    console.log('\n✅ Usuario correctamente configurado para login\n');

  } finally {
    client.release();
    await pool.end();
  }
}

verifyUser().catch(console.error);
