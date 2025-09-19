#!/usr/bin/env node

const { Client } = require('pg');

const dbConfig = {
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**',
};

async function checkSuperAdminComplete() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('🔍 VERIFICACIÓN COMPLETA SUPERADMIN cv@flexxus.com\n');

    // 1. Verificar usuario exacto
    const user = await client.query(`
      SELECT id, email, role, first_name, last_name, password_hash, status, created_at
      FROM users
      WHERE email = 'cv@flexxus.com'
    `);

    console.log('👤 DATOS DEL USUARIO:');
    if (user.rows.length > 0) {
      const u = user.rows[0];
      console.log(`   ✅ Encontrado: ${u.email}`);
      console.log(`   ID: ${u.id}`);
      console.log(`   Role directo: ${u.role || 'NULL'}`);
      console.log(`   Nombre: ${u.first_name} ${u.last_name}`);
      console.log(`   Status: ${u.status}`);
      console.log(`   Password hash: ${u.password_hash ? 'EXISTS' : 'NULL'}`);
      console.log(`   Creado: ${u.created_at}\n`);

      // 2. Verificar asignaciones user_roles (debe estar vacío)
      const userRoles = await client.query(`
        SELECT ur.*, r.name as role_name, c.name as company_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        LEFT JOIN companies c ON ur.company_id = c.id
        WHERE ur.user_id = $1
      `, [u.id]);

      console.log('🎭 ASIGNACIONES USER_ROLES:');
      if (userRoles.rows.length === 0) {
        console.log('   ✅ No hay asignaciones user_roles (CORRECTO para SuperAdmin)\n');
      } else {
        console.log(`   ❌ PROBLEMA: Encontradas ${userRoles.rows.length} asignaciones user_roles:`);
        userRoles.rows.forEach(ur => {
          console.log(`   - Rol: ${ur.role_name} (${ur.role_id})`);
          console.log(`   - Empresa: ${ur.company_name} (${ur.company_id})`);
        });
        console.log('   🔧 ACCIÓN REQUERIDA: Eliminar estas asignaciones\n');
      }

      // 3. Verificar empresa Sistema Global
      console.log('🌍 EMPRESA SISTEMA GLOBAL:');
      const globalCompany = await client.query(`
        SELECT id, name, plan, status, created_at
        FROM companies
        WHERE id = '00000000-0000-0000-0000-000000000000'
      `);

      if (globalCompany.rows.length > 0) {
        const gc = globalCompany.rows[0];
        console.log(`   ✅ Empresa Sistema Global existe:`);
        console.log(`   ID: ${gc.id}`);
        console.log(`   Nombre: ${gc.name}`);
        console.log(`   Plan: ${gc.plan}`);
        console.log(`   Status: ${gc.status}`);
        console.log(`   Creado: ${gc.created_at}\n`);
      } else {
        console.log(`   ❌ PROBLEMA: Empresa Sistema Global NO existe`);
        console.log(`   🔧 ACCIÓN REQUERIDA: Crear empresa con UUID 00000000-0000-0000-0000-000000000000\n`);
      }

      // 4. Verificar roles del sistema
      console.log('🎭 ROLES DEL SISTEMA:');
      const systemRoles = await client.query(`
        SELECT id, name, description, is_system_role, company_id, status
        FROM roles
        WHERE is_system_role = true
        ORDER BY name
      `);

      console.log(`   Encontrados ${systemRoles.rows.length} roles del sistema:`);
      systemRoles.rows.forEach(role => {
        console.log(`   - ${role.name} (${role.id})`);
        console.log(`     Descripción: ${role.description || 'Sin descripción'}`);
        console.log(`     Company ID: ${role.company_id || 'NULL'}`);
        console.log(`     Status: ${role.status}`);
      });

      // 5. VERIFICAR CONFIGURACIÓN IDEAL
      console.log('\n📋 RESUMEN DE CONFIGURACIÓN IDEAL:');
      console.log('✅ Usuario cv@flexxus.com debe tener:');
      console.log('   - role = "super_admin" (campo directo)');
      console.log('   - SIN asignaciones en user_roles');
      console.log('   - Empresa virtual: 00000000-0000-0000-0000-000000000000');
      console.log('   - Acceso total a todos los endpoints');
      console.log('   - Sin restricciones de permisos');

      // Verificar estado actual
      const isCorrect =
        u.role === 'super_admin' &&
        userRoles.rows.length === 0 &&
        globalCompany.rows.length > 0;

      if (isCorrect) {
        console.log('\n🎉 ¡CONFIGURACIÓN PERFECTA!');
        console.log('   SuperAdmin está configurado correctamente');
      } else {
        console.log('\n⚠️  CONFIGURACIÓN NECESITA CORRECCIÓN:');
        if (u.role !== 'super_admin') {
          console.log(`   ❌ Role directo: "${u.role}" debe ser "super_admin"`);
        }
        if (userRoles.rows.length > 0) {
          console.log(`   ❌ Tiene ${userRoles.rows.length} asignaciones user_roles (debe ser 0)`);
        }
        if (globalCompany.rows.length === 0) {
          console.log(`   ❌ Falta empresa Sistema Global`);
        }
      }

    } else {
      console.log('   ❌ Usuario cv@flexxus.com NO ENCONTRADO');
      console.log('   🔧 ACCIÓN REQUERIDA: Crear usuario SuperAdmin');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

checkSuperAdminComplete();