/**
 * Script para listar usuarios por empresa con sus roles
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**'
});

async function listUsers() {
  const client = await pool.connect();

  try {
    console.log('\n' + '='.repeat(100));
    console.log('👥 LISTADO DE USUARIOS POR EMPRESA');
    console.log('='.repeat(100) + '\n');

    // Obtener empresas de prueba
    const companiesResult = await client.query(`
      SELECT id, name, plan, tax_id
      FROM companies
      WHERE tax_id IN ('TN-2024-001', 'DF-2024-002', 'AS-2024-003', 'MH-2024-004', 'LP-2024-005')
      ORDER BY name
    `);

    for (const company of companiesResult.rows) {
      console.log(`\n${'━'.repeat(100)}`);
      console.log(`🏢 ${company.name.toUpperCase()}`);
      console.log(`   Plan: ${company.plan} | Tax ID: ${company.tax_id}`);
      console.log('─'.repeat(100));

      // Obtener usuarios de esta empresa con sus roles
      const usersResult = await client.query(`
        SELECT
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.status,
          u.email_verified_at,
          u.created_at,
          r.name as role_name,
          r.description as role_description
        FROM users u
        INNER JOIN user_roles ur ON u.id = ur.user_id
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.company_id = $1
          AND u.email LIKE '%@test%'
        ORDER BY
          CASE r.name
            WHEN 'Administrador' THEN 1
            WHEN 'Líder de Equipo' THEN 2
            WHEN 'Empleado' THEN 3
            ELSE 4
          END,
          u.first_name, u.last_name
      `, [company.id]);

      if (usersResult.rows.length === 0) {
        console.log('   ℹ️  No hay usuarios registrados para esta empresa\n');
        continue;
      }

      // Agrupar por rol
      const usersByRole: Record<string, any[]> = {};
      for (const user of usersResult.rows) {
        if (!usersByRole[user.role_name]) {
          usersByRole[user.role_name] = [];
        }
        usersByRole[user.role_name].push(user);
      }

      // Mostrar usuarios agrupados por rol
      for (const [roleName, users] of Object.entries(usersByRole)) {
        const roleEmoji = roleName === 'Administrador' ? '👑' : roleName === 'Líder de Equipo' ? '⭐' : '👤';
        console.log(`\n   ${roleEmoji} ${roleName.toUpperCase()} (${users.length} usuario${users.length > 1 ? 's' : ''})`);
        console.log(`   ${'·'.repeat(96)}`);

        for (const user of users) {
          const verifiedBadge = user.email_verified_at ? '✅' : '⏳';
          const statusBadge = user.status === 'active' ? '🟢' : '🔴';

          console.log(`\n   ${statusBadge} ${user.first_name} ${user.last_name}`);
          console.log(`      📧 Email: ${user.email} ${verifiedBadge}`);
          console.log(`      🆔 ID: ${user.id}`);
          console.log(`      📅 Creado: ${new Date(user.created_at).toLocaleString('es-ES')}`);
        }
        console.log('');
      }

      // Resumen
      console.log(`   📊 TOTAL: ${usersResult.rows.length} usuarios en ${company.name}`);
    }

    console.log('\n' + '='.repeat(100));
    console.log('📈 RESUMEN GENERAL');
    console.log('='.repeat(100));

    // Estadísticas globales
    const statsResult = await client.query(`
      SELECT
        COUNT(DISTINCT u.id) as total_users,
        COUNT(DISTINCT ur.company_id) as total_companies,
        COUNT(DISTINCT ur.role_id) as total_roles
      FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.email LIKE '%@test%'
    `);

    const stats = statsResult.rows[0];
    console.log(`\n   👥 Total de usuarios de prueba: ${stats.total_users}`);
    console.log(`   🏢 Total de empresas: ${stats.total_companies}`);
    console.log(`   🔐 Total de roles asignados: ${stats.total_roles}`);

    // Distribución por rol
    const roleDistResult = await client.query(`
      SELECT
        r.name as role_name,
        COUNT(ur.user_id) as user_count
      FROM user_roles ur
      INNER JOIN roles r ON ur.role_id = r.id
      INNER JOIN users u ON ur.user_id = u.id
      WHERE u.email LIKE '%@test%'
      GROUP BY r.name
      ORDER BY user_count DESC
    `);

    console.log('\n   📊 Distribución por rol:');
    for (const row of roleDistResult.rows) {
      const percentage = ((row.user_count / stats.total_users) * 100).toFixed(1);
      const bar = '█'.repeat(Math.floor(row.user_count / 2));
      console.log(`      ${row.role_name.padEnd(20)} ${bar} ${row.user_count} (${percentage}%)`);
    }

    console.log('\n' + '='.repeat(100));
    console.log('🔑 CREDENCIALES: Contraseña para todos los usuarios: Test123456!');
    console.log('='.repeat(100) + '\n');

  } finally {
    client.release();
    await pool.end();
  }
}

listUsers().catch(console.error);
