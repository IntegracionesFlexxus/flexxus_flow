#!/usr/bin/env node

const { Client } = require('pg');

const dbConfig = {
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**',
};

async function fixSuperAdminAssignment() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('🔧 CORRIGIENDO ASIGNACIÓN DE SUPERADMIN\n');

    // 1. Mostrar estado actual
    const userRoles = await client.query(`
      SELECT ur.*, r.name as role_name, c.name as company_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      LEFT JOIN companies c ON ur.company_id = c.id
      WHERE ur.user_id = '11c3239e-7d75-469c-8c38-2cbe8e0c625c'
    `);

    console.log('📋 ASIGNACIONES ACTUALES:');
    userRoles.rows.forEach(ur => {
      console.log(`   - Rol: ${ur.role_name} (${ur.role_id})`);
      console.log(`   - Empresa: ${ur.company_name} (${ur.company_id})`);
    });

    if (userRoles.rows.length === 0) {
      console.log('✅ No hay asignaciones user_roles (ya está correcto)\n');
      return;
    }

    // 2. Eliminar asignaciones user_roles para SuperAdmin
    console.log('\n🗑️  ELIMINANDO ASIGNACIONES USER_ROLES...');

    const deleteResult = await client.query(`
      DELETE FROM user_roles
      WHERE user_id = '11c3239e-7d75-469c-8c38-2cbe8e0c625c'
      RETURNING role_id, company_id
    `);

    console.log(`✅ Eliminadas ${deleteResult.rows.length} asignaciones:`);
    deleteResult.rows.forEach(deleted => {
      console.log(`   - Role ID: ${deleted.role_id}`);
      console.log(`   - Company ID: ${deleted.company_id}`);
    });

    // 3. Verificar estado final
    console.log('\n🔍 VERIFICANDO ESTADO FINAL...');

    const finalCheck = await client.query(`
      SELECT u.id, u.email, u.role as direct_role
      FROM users u
      WHERE u.id = '11c3239e-7d75-469c-8c38-2cbe8e0c625c'
    `);

    const finalUser = finalCheck.rows[0];
    console.log('👤 USUARIO FINAL:');
    console.log(`   Email: ${finalUser.email}`);
    console.log(`   Role directo: ${finalUser.direct_role}`);

    const finalUserRoles = await client.query(`
      SELECT COUNT(*) as count
      FROM user_roles
      WHERE user_id = '11c3239e-7d75-469c-8c38-2cbe8e0c625c'
    `);

    console.log(`   Asignaciones user_roles: ${finalUserRoles.rows[0].count}`);

    if (finalUser.direct_role === 'super_admin' && finalUserRoles.rows[0].count === '0') {
      console.log('\n🎉 ¡SUPERADMIN CONFIGURADO CORRECTAMENTE!');
      console.log('   ✅ Role directo: super_admin');
      console.log('   ✅ Sin asignaciones user_roles');
      console.log('   ✅ Usará empresa virtual Sistema Global');
    } else {
      console.log('\n⚠️  Configuración no es la esperada');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

fixSuperAdminAssignment();