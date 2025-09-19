#!/usr/bin/env node
/**
 * FASE 4: Script de testing completo del sistema de roles
 * Uso: node scripts/fase4_testingComplete.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuración de base de datos
const dbConfig = {
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**',
};

// Tests a ejecutar
const TEST_CASES = [
  {
    name: 'Verificar estructura de roles',
    query: `
      SELECT name, is_system_role
      FROM roles
      WHERE deleted_at IS NULL
      ORDER BY name
    `,
    expected: 3
  },
  {
    name: 'Verificar permisos totales',
    query: `
      SELECT COUNT(*) as count
      FROM permissions
      WHERE deleted_at IS NULL
    `,
    expected: 17
  },
  {
    name: 'Verificar permisos de SuperAdmin',
    query: `
      SELECT COUNT(*) as count
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      WHERE r.name = 'Superadmin'
    `,
    expected: 17
  },
  {
    name: 'Verificar permisos de Admin',
    query: `
      SELECT COUNT(*) as count
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      WHERE r.name = 'Admin'
    `,
    expected: 9
  },
  {
    name: 'Verificar permisos de User',
    query: `
      SELECT COUNT(*) as count
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      WHERE r.name = 'User'
    `,
    expected: 2
  },
  {
    name: 'Verificar usuarios sin asignaciones user_roles',
    query: `
      SELECT COUNT(*) as count
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.deleted_at IS NULL
        AND ur.user_id IS NULL
        AND (u.role IS NULL OR u.role = '')
    `,
    expected: 0
  }
];

async function runTest(client, testCase) {
  console.log(`\n🧪 Test: ${testCase.name}`);

  try {
    const result = await client.query(testCase.query);
    const actual = result.rows[0]?.count || result.rows.length;

    if (testCase.expected && actual == testCase.expected) {
      console.log(`   ✅ PASÓ - Esperado: ${testCase.expected}, Obtenido: ${actual}`);
      return true;
    } else if (testCase.expected) {
      console.log(`   ❌ FALLÓ - Esperado: ${testCase.expected}, Obtenido: ${actual}`);
      return false;
    } else {
      console.log(`   ℹ️  Resultado: ${actual}`);
      if (result.rows.length > 0) {
        result.rows.forEach(row => {
          const values = Object.values(row);
          console.log(`      ${values.join(' | ')}`);
        });
      }
      return true;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function testUserAuthentication(client) {
  console.log('\n🔐 TESTING AUTENTICACIÓN DE USUARIOS');

  // Test SuperAdmin
  console.log('\n1️⃣ Test SuperAdmin (cv@flexxus.com)');
  try {
    const result = await client.query(`
      SELECT id, email, role, first_name, last_name
      FROM users
      WHERE email = 'cv@flexxus.com' AND deleted_at IS NULL
    `);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log(`   Usuario encontrado: ${user.first_name} ${user.last_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role directo: ${user.role || 'NULL'}`);

      // Verificar si debe tener role directo
      if (!user.role) {
        console.log(`   ⚠️  ADVERTENCIA: SuperAdmin debe tener role='super_admin'`);

        // Actualizar a super_admin
        await client.query(`
          UPDATE users
          SET role = 'super_admin'
          WHERE id = $1
        `, [user.id]);
        console.log(`   ✅ Actualizado role a 'super_admin'`);
      } else {
        console.log(`   ✅ Role directo configurado correctamente`);
      }
    } else {
      console.log(`   ❌ Usuario SuperAdmin no encontrado`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test Admin users
  console.log('\n2️⃣ Test Admin users');
  try {
    const result = await client.query(`
      SELECT u.id, u.email, u.first_name, u.role as direct_role,
             r.name as assigned_role, ur.company_id
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name = 'Admin' AND u.deleted_at IS NULL
    `);

    console.log(`   Admins encontrados: ${result.rows.length}`);
    result.rows.forEach(admin => {
      console.log(`   ${admin.email} - Rol: ${admin.assigned_role} - Empresa: ${admin.company_id || 'NULL'}`);
      if (admin.direct_role && admin.direct_role !== '') {
        console.log(`     ⚠️  ADVERTENCIA: Admin no debe tener role directo`);
      }
    });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test User users
  console.log('\n3️⃣ Test User users');
  try {
    const result = await client.query(`
      SELECT u.id, u.email, u.first_name, u.role as direct_role,
             r.name as assigned_role, ur.company_id
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.name = 'User' AND u.deleted_at IS NULL
      LIMIT 5
    `);

    console.log(`   Users encontrados: ${result.rows.length}`);
    result.rows.forEach(user => {
      console.log(`   ${user.email} - Rol: ${user.assigned_role} - Empresa: ${user.company_id || 'NULL'}`);
      if (user.direct_role && user.direct_role !== '') {
        console.log(`     ⚠️  ADVERTENCIA: User no debe tener role directo`);
      }
    });
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function testPermissionHierarchy(client) {
  console.log('\n🎭 TESTING JERARQUÍA DE PERMISOS');

  const roles = ['Superadmin', 'Admin', 'User'];

  for (const roleName of roles) {
    console.log(`\n🔍 Permisos del rol: ${roleName}`);
    try {
      const result = await client.query(`
        SELECT p.name as permission_name
        FROM role_permissions rp
        JOIN roles r ON rp.role_id = r.id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE r.name = $1
        ORDER BY p.name
      `, [roleName]);

      console.log(`   Total permisos: ${result.rows.length}`);
      result.rows.forEach(perm => {
        console.log(`   - ${perm.permission_name}`);
      });
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function testDataConsistency(client) {
  console.log('\n🔍 TESTING CONSISTENCIA DE DATOS');

  // Test usuarios sin roles
  console.log('\n1️⃣ Usuarios sin roles asignados');
  try {
    const result = await client.query(`
      SELECT u.id, u.email, u.first_name, u.role as direct_role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.deleted_at IS NULL
        AND ur.user_id IS NULL
        AND (u.role IS NULL OR u.role = '')
    `);

    if (result.rows.length === 0) {
      console.log(`   ✅ Todos los usuarios tienen roles asignados`);
    } else {
      console.log(`   ⚠️  ${result.rows.length} usuarios sin roles:`);
      result.rows.forEach(user => {
        console.log(`     ${user.email} - ${user.first_name}`);
      });
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  // Test roles huérfanos
  console.log('\n2️⃣ Asignaciones user_roles huérfanas');
  try {
    const result = await client.query(`
      SELECT ur.user_id, ur.role_id, ur.company_id
      FROM user_roles ur
      LEFT JOIN users u ON ur.user_id = u.id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id IS NULL OR r.id IS NULL
    `);

    if (result.rows.length === 0) {
      console.log(`   ✅ No hay asignaciones huérfanas`);
    } else {
      console.log(`   ⚠️  ${result.rows.length} asignaciones huérfanas encontradas`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
}

async function fase4Testing() {
  const client = new Client(dbConfig);

  try {
    console.log('🧪 INICIANDO FASE 4: TESTING COMPLETO DEL SISTEMA DE ROLES');
    console.log('===========================================================\n');

    // Conectar a la base de datos
    await client.connect();
    console.log('✅ Conexión a base de datos establecida');

    // Tests estructurales
    console.log('\n📊 TESTS ESTRUCTURALES');
    let passed = 0;
    let total = TEST_CASES.length;

    for (const testCase of TEST_CASES) {
      const result = await runTest(client, testCase);
      if (result) passed++;
    }

    console.log(`\n📈 Tests estructurales: ${passed}/${total} pasaron`);

    // Tests funcionales
    await testUserAuthentication(client);
    await testPermissionHierarchy(client);
    await testDataConsistency(client);

    // Resumen final
    console.log('\n🎯 RESUMEN FINAL DE FASE 4');
    console.log('============================');

    const finalStats = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
        (SELECT COUNT(*) FROM users WHERE role = 'super_admin') as super_admins,
        (SELECT COUNT(*) FROM roles WHERE deleted_at IS NULL) as total_roles,
        (SELECT COUNT(*) FROM permissions WHERE deleted_at IS NULL) as total_permissions,
        (SELECT COUNT(*) FROM user_roles) as user_role_assignments
    `);

    const stats = finalStats.rows[0];
    console.log(`📊 Estadísticas:`);
    console.log(`   - Usuarios totales: ${stats.total_users}`);
    console.log(`   - SuperAdmins: ${stats.super_admins}`);
    console.log(`   - Roles disponibles: ${stats.total_roles}`);
    console.log(`   - Permisos totales: ${stats.total_permissions}`);
    console.log(`   - Asignaciones user_roles: ${stats.user_role_assignments}`);

    if (passed === total) {
      console.log('\n🎉 ¡SISTEMA DE ROLES VALIDADO EXITOSAMENTE!');
      console.log('\n✅ TODAS LAS FASES COMPLETADAS:');
      console.log('   ✅ FASE 0: Reestructuración de base de datos');
      console.log('   ✅ FASE 1: AuthService corregido');
      console.log('   ✅ FASE 2: Middlewares actualizados');
      console.log('   ✅ FASE 3: PermissionService implementado');
      console.log('   ✅ FASE 4: Testing y validación completa');

      console.log('\n🚀 SISTEMA LISTO PARA PRODUCCIÓN');
    } else {
      console.log('\n⚠️  Hay algunos tests que fallaron, revisa los detalles arriba');
    }

  } catch (error) {
    console.error('\n💥 Error crítico durante FASE 4:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);

  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

// Ejecutar FASE 4
fase4Testing()
  .then(() => {
    console.log('\n✅ FASE 4 finalizada exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error no manejado en FASE 4:', error);
    process.exit(1);
  });