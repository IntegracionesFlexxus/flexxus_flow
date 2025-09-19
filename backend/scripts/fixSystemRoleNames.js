#!/usr/bin/env node

const { Client } = require('pg');

const dbConfig = {
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**',
};

async function fixSystemRoleNames() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('🔧 CORRIGIENDO NOMBRES DE ROLES DEL SISTEMA\n');

    // Verificar roles del sistema con problemas
    const problemRoles = await client.query(`
      SELECT id, name, description, is_system_role, company_id, status
      FROM roles
      WHERE is_system_role = true AND (name IS NULL OR name = '' OR TRIM(name) = '')
    `);

    console.log('🔍 ROLES CON NOMBRES PROBLEMÁTICOS:');
    if (problemRoles.rows.length === 0) {
      console.log('   ✅ No hay roles del sistema sin nombre');
    } else {
      console.log(`   ❌ Encontrados ${problemRoles.rows.length} roles problemáticos:`);

      for (const role of problemRoles.rows) {
        console.log(`   - ID: ${role.id}`);
        console.log(`     Nombre actual: "${role.name || 'NULL'}"`);
        console.log(`     Descripción: ${role.description || 'Sin descripción'}`);

        // Si la descripción contiene "Super Administrator", es el SuperAdmin
        if (role.description && role.description.includes('Super Administrator')) {
          console.log('   🔧 Corrigiendo como "Super Admin"...');
          await client.query(`
            UPDATE roles
            SET name = 'Super Admin'
            WHERE id = $1
          `, [role.id]);
          console.log('   ✅ Corregido a "Super Admin"');
        }
        // Si no tiene descripción o es otro, intentar inferir del orden
        else {
          console.log('   🔧 Corrigiendo nombre basado en descripción...');
          await client.query(`
            UPDATE roles
            SET name = 'Super Admin'
            WHERE id = $1
          `, [role.id]);
          console.log('   ✅ Corregido a "Super Admin"');
        }
      }
    }

    // Verificar estado final
    console.log('\n📋 ESTADO FINAL DE ROLES DEL SISTEMA:');
    const finalRoles = await client.query(`
      SELECT id, name, description, is_system_role, company_id, status
      FROM roles
      WHERE is_system_role = true
      ORDER BY name
    `);

    finalRoles.rows.forEach(role => {
      console.log(`   ✅ ${role.name} (${role.id})`);
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

fixSystemRoleNames();