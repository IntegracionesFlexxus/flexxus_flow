#!/usr/bin/env node

const { Client } = require('pg');

const dbConfig = {
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**',
};

async function fixAdminRoleName() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('🔧 CORRIGIENDO ROL ADMIN CON NOMBRE VACÍO\n');

    // Verificar roles con nombres vacíos
    const emptyNameRoles = await client.query(`
      SELECT id, name, description, is_system_role, company_id, status
      FROM roles
      WHERE name IS NULL OR name = '' OR TRIM(name) = ''
    `);

    console.log('🔍 ROLES CON NOMBRES VACÍOS:');
    if (emptyNameRoles.rows.length === 0) {
      console.log('   ✅ No hay roles con nombres vacíos');
    } else {
      console.log(`   ❌ Encontrados ${emptyNameRoles.rows.length} roles con nombres vacíos:`);

      for (const role of emptyNameRoles.rows) {
        console.log(`   - ID: ${role.id}`);
        console.log(`     Nombre actual: "${role.name || 'NULL'}"`);
        console.log(`     Descripción: ${role.description || 'Sin descripción'}`);

        // Determinar el nombre correcto basado en la descripción
        let correctName = 'Admin'; // Por defecto

        if (role.description && role.description.includes('Company Administrator')) {
          correctName = 'Admin';
        } else if (role.description && role.description.includes('Super Administrator')) {
          correctName = 'Super Admin';
        } else if (role.description && role.description.includes('Standard User')) {
          correctName = 'User';
        }

        console.log(`   🔧 Corrigiendo nombre a: "${correctName}"`);

        await client.query(`
          UPDATE roles
          SET name = $1
          WHERE id = $2
        `, [correctName, role.id]);

        console.log(`   ✅ Corregido a "${correctName}"`);
      }
    }

    // Verificar estado final
    console.log('\n📋 ESTADO FINAL DE TODOS LOS ROLES:');
    const allRoles = await client.query(`
      SELECT id, name, description, is_system_role, company_id, status
      FROM roles
      ORDER BY is_system_role DESC, name
    `);

    allRoles.rows.forEach(role => {
      const typeLabel = role.is_system_role ? 'SISTEMA' : 'EMPRESA';
      console.log(`   ✅ [${typeLabel}] "${role.name}" (${role.id})`);
      console.log(`      Descripción: ${role.description || 'Sin descripción'}`);
      console.log(`      Status: ${role.status}`);
    });

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

fixAdminRoleName();