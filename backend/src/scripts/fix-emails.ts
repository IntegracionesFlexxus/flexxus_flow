/**
 * Script para eliminar acentos de los emails de usuarios de prueba
 */

import { Pool } from 'pg';

const pool = new Pool({
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**'
});

function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function fixEmails() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('\n' + '='.repeat(80));
    console.log('🔧 CORRIGIENDO EMAILS - Eliminando acentos');
    console.log('='.repeat(80) + '\n');

    // Obtener todos los usuarios de prueba
    const usersResult = await client.query(`
      SELECT id, email, first_name, last_name
      FROM users
      WHERE email LIKE '%@test%'
      ORDER BY email
    `);

    console.log(`📊 Total de usuarios a actualizar: ${usersResult.rows.length}\n`);

    let updatedCount = 0;

    for (const user of usersResult.rows) {
      const oldEmail = user.email;
      const newEmail = removeAccents(oldEmail);

      if (oldEmail !== newEmail) {
        console.log(`📧 ${user.first_name} ${user.last_name}`);
        console.log(`   Antes: ${oldEmail}`);
        console.log(`   Ahora: ${newEmail}`);

        // Actualizar email
        await client.query(
          'UPDATE users SET email = $1 WHERE id = $2',
          [newEmail, user.id]
        );

        updatedCount++;
        console.log('   ✅ Actualizado\n');
      } else {
        console.log(`⏭️  ${user.first_name} ${user.last_name} - Email ya sin acentos: ${oldEmail}\n`);
      }
    }

    await client.query('COMMIT');

    console.log('='.repeat(80));
    console.log(`✅ Proceso completado: ${updatedCount} emails actualizados`);
    console.log('='.repeat(80) + '\n');

    // Mostrar lista actualizada
    console.log('📋 LISTA ACTUALIZADA DE EMAILS:\n');

    const updatedUsers = await client.query(`
      SELECT
        c.name as company_name,
        u.email,
        u.first_name,
        u.last_name,
        uc.role
      FROM user_companies uc
      INNER JOIN users u ON uc.user_id = u.id
      INNER JOIN companies c ON uc.company_id = c.id
      WHERE u.email LIKE '%@test%'
      ORDER BY c.name, uc.role, u.first_name
    `);

    let currentCompany = '';
    for (const row of updatedUsers.rows) {
      if (currentCompany !== row.company_name) {
        if (currentCompany !== '') console.log('');
        currentCompany = row.company_name;
        console.log(`🏢 ${row.company_name}`);
      }
      console.log(`   ${row.role.padEnd(18)} | ${row.email}`);
    }

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixEmails().catch(console.error);
