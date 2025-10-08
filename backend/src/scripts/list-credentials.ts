/**
 * Script para listar todas las credenciales de acceso
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**'
});

async function listCredentials() {
  const client = await pool.connect();

  try {
    console.log('\n' + '='.repeat(100));
    console.log('🔑 CREDENCIALES DE ACCESO - USUARIOS DE PRUEBA');
    console.log('='.repeat(100) + '\n');

    console.log('🔐 CONTRASEÑA UNIVERSAL: Test123456!\n');

    const result = await client.query(`
      SELECT
        c.name as company_name,
        c.plan,
        u.email,
        u.first_name,
        u.last_name,
        uc.role,
        uc.is_default,
        uc.status as user_status
      FROM user_companies uc
      INNER JOIN users u ON uc.user_id = u.id
      INNER JOIN companies c ON uc.company_id = c.id
      WHERE u.email LIKE '%@test%'
      ORDER BY
        c.name,
        CASE uc.role
          WHEN 'Administrador' THEN 1
          WHEN 'Líder de Equipo' THEN 2
          WHEN 'Empleado' THEN 3
          ELSE 4
        END,
        u.first_name
    `);

    let currentCompany = '';
    let userCount = 0;

    for (const row of result.rows) {
      if (currentCompany !== row.company_name) {
        if (currentCompany !== '') {
          console.log('');
        }
        currentCompany = row.company_name;
        console.log('━'.repeat(100));
        console.log(`🏢 ${row.company_name.toUpperCase()} (Plan: ${row.plan})`);
        console.log('━'.repeat(100));
      }

      const defaultBadge = row.is_default ? '⭐' : '  ';
      const roleBadge = row.role === 'Administrador' ? '👑' : row.role === 'Líder de Equipo' ? '⭐' : '👤';
      const statusBadge = row.user_status === 'active' ? '🟢' : '🔴';

      console.log(`${defaultBadge} ${statusBadge} ${roleBadge} ${row.role.padEnd(18)} | ${row.email}`);
      userCount++;
    }

    console.log('\n' + '='.repeat(100));
    console.log(`📊 TOTAL: ${userCount} usuarios en ${result.rows.length > 0 ? [...new Set(result.rows.map(r => r.company_name))].length : 0} empresas`);
    console.log('='.repeat(100));

    console.log('\n💡 NOTAS:');
    console.log('   ⭐ = Usuario por defecto para la empresa');
    console.log('   🟢 = Usuario activo');
    console.log('   👑 = Administrador | ⭐ = Líder de Equipo | 👤 = Empleado\n');

    console.log('📝 EJEMPLO DE LOGIN:');
    const firstAdmin = result.rows.find(r => r.role === 'Administrador');
    if (firstAdmin) {
      console.log(`   Email: ${firstAdmin.email}`);
      console.log(`   Password: Test123456!`);
      console.log(`   Empresa: ${firstAdmin.company_name}\n`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

listCredentials().catch(console.error);
