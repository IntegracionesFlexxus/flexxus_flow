#!/usr/bin/env ts-node
/**
 * FASE 3: Script para integrar el nuevo PermissionService
 * Uso: npm run script fase3_integratePermissionService.ts
 */

import { Container } from 'inversify';
import { config } from '../src/config/environment';
import { TYPES } from '../src/container/types';
import { Database } from '../src/shared/database/Database';
import { PermissionServiceNew } from '../src/modules/auth/services/PermissionServiceNew';

interface TestUser {
  id: string;
  email: string;
  role: string;
  expectedRole: 'super_admin' | 'admin' | 'user';
  expectedCompanyAccess: boolean;
}

const TEST_USERS: TestUser[] = [
  {
    id: '11c3239e-7d75-469c-8c38-2cbe8e0c625c',
    email: 'cv@flexxus.com',
    role: 'super_admin',
    expectedRole: 'super_admin',
    expectedCompanyAccess: true
  }
];

async function testPermissionService(): Promise<void> {
  let database: Database | null = null;

  try {
    console.log('🧪 INICIANDO TESTS DEL NUEVO PERMISSIONSERVICE');

    // Configurar contenedor
    const container = new Container();

    // Configurar base de datos
    database = new Database(config.database);
    await database.connect();
    console.log('✅ Conexión a base de datos establecida');

    // Registrar dependencias básicas
    container.bind<Database>(TYPES.Database).toConstantValue(database);

    // Importar y registrar repositorios
    const { UserRepository } = await import('../src/modules/auth/repositories/UserRepository');
    const { RoleRepository } = await import('../src/modules/auth/repositories/RoleRepository');
    const winston = await import('winston');

    const logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [new winston.transports.Console()]
    });

    const userRepository = new UserRepository();
    const roleRepository = new RoleRepository();

    // Crear instancia del PermissionService
    const permissionService = new PermissionServiceNew(userRepository, roleRepository, logger);
    console.log('✅ PermissionService creado');

    // TESTS
    console.log('\n🔬 EJECUTANDO TESTS...');

    // Test 1: Verificar SuperAdmin
    console.log('\n1️⃣ Test: Verificar SuperAdmin');
    try {
      const isSuperAdmin = await permissionService.isSuperAdmin('11c3239e-7d75-469c-8c38-2cbe8e0c625c');
      console.log(`   SuperAdmin detectado: ${isSuperAdmin ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 2: Obtener información de rol
    console.log('\n2️⃣ Test: Obtener información de rol');
    try {
      const roleInfo = await permissionService.getUserRoleInfo('11c3239e-7d75-469c-8c38-2cbe8e0c625c');
      console.log('   Información de rol:', {
        role: roleInfo.role,
        isSuperAdmin: roleInfo.isSuperAdmin,
        companyId: roleInfo.companyId,
        permissionsCount: roleInfo.permissions.length
      });
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 3: Verificar permisos
    console.log('\n3️⃣ Test: Verificar permisos');
    const testPermissions = ['users.read', 'users.create', 'roles.create', 'companies.delete'];

    for (const permission of testPermissions) {
      try {
        const hasPermission = await permissionService.hasPermission(
          '11c3239e-7d75-469c-8c38-2cbe8e0c625c',
          permission
        );
        console.log(`   ${permission}: ${hasPermission ? '✅' : '❌'}`);
      } catch (error) {
        console.log(`   ${permission}: ❌ Error - ${error.message}`);
      }
    }

    // Test 4: Capacidades del usuario
    console.log('\n4️⃣ Test: Capacidades del usuario');
    try {
      const capabilities = await permissionService.getUserCapabilities('11c3239e-7d75-469c-8c38-2cbe8e0c625c');
      console.log('   Capacidades:', capabilities);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Test 5: Validaciones de gestión
    console.log('\n5️⃣ Test: Validaciones de gestión');
    try {
      const canModifyRoles = await permissionService.canModifyRole('11c3239e-7d75-469c-8c38-2cbe8e0c625c', 'any-role-id');
      const canManageUsers = await permissionService.canManageUser('11c3239e-7d75-469c-8c38-2cbe8e0c625c', 'any-user-id');

      console.log(`   Puede modificar roles: ${canModifyRoles ? '✅' : '❌'}`);
      console.log(`   Puede gestionar usuarios: ${canManageUsers ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('\n🎉 TESTS COMPLETADOS');

    // Mostrar próximos pasos
    console.log('\n📝 PRÓXIMOS PASOS PARA INTEGRACIÓN:');
    console.log('   1. Registrar PermissionServiceNew en el contenedor IoC');
    console.log('   2. Actualizar RoleController para usar PermissionService');
    console.log('   3. Actualizar UserController para validaciones');
    console.log('   4. Ejecutar FASE 4: Testing completo');

  } catch (error) {
    console.error('💥 Error crítico durante los tests:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);

  } finally {
    if (database) {
      await database.disconnect();
      console.log('🔌 Conexión a base de datos cerrada');
    }
  }
}

// Función para verificar el estado actual de la base de datos
async function checkDatabaseState(): Promise<void> {
  let database: Database | null = null;

  try {
    console.log('🔍 VERIFICANDO ESTADO DE LA BASE DE DATOS...');

    database = new Database(config.database);
    await database.connect();

    // Verificar usuarios
    const usersResult = await database.query(`
      SELECT id, email, role, created_at
      FROM users
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log('\n👥 USUARIOS EN LA BASE DE DATOS:');
    usersResult.rows.forEach(user => {
      console.log(`   ${user.email} - Rol: ${user.role || 'NULL'} - ID: ${user.id}`);
    });

    // Verificar roles
    const rolesResult = await database.query(`
      SELECT id, name, is_system_role, company_id
      FROM roles
      WHERE deleted_at IS NULL
      ORDER BY name
    `);

    console.log('\n🎭 ROLES EN LA BASE DE DATOS:');
    rolesResult.rows.forEach(role => {
      console.log(`   ${role.name} - Sistema: ${role.is_system_role} - Empresa: ${role.company_id || 'NULL'}`);
    });

    // Verificar user_roles
    const userRolesResult = await database.query(`
      SELECT ur.user_id, ur.role_id, ur.company_id, r.name as role_name, u.email
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN users u ON ur.user_id = u.id
      LIMIT 10
    `);

    console.log('\n🔗 ASIGNACIONES USER_ROLES:');
    userRolesResult.rows.forEach(assignment => {
      console.log(`   ${assignment.email} -> ${assignment.role_name} (Empresa: ${assignment.company_id || 'NULL'})`);
    });

  } catch (error) {
    console.error('❌ Error verificando base de datos:', error.message);
  } finally {
    if (database) {
      await database.disconnect();
    }
  }
}

// Función principal
async function main(): Promise<void> {
  console.log('🚀 FASE 3: INTEGRACIÓN DE PERMISSIONSERVICE\n');

  // Verificar estado de la base de datos
  await checkDatabaseState();

  console.log('\n' + '='.repeat(60) + '\n');

  // Ejecutar tests del PermissionService
  await testPermissionService();
}

// Ejecutar el script
main()
  .then(() => {
    console.log('\n✅ Script finalizado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error no manejado:', error);
    process.exit(1);
  });