/**
 * Script para resetear y corregir el sistema de roles y permisos
 * Ejecutar con: npx ts-node -r tsconfig-paths/register scripts/resetRoleSystem.ts
 */

import { container } from '../src/container/container';
import { DatabaseConnection } from '../src/shared/database/connections/DatabaseConnection';

interface Role {
  id: string;
  name: string;
  description: string;
  company_id: string | null;
  is_system_role: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: string;
}

async function resetRoleSystem() {
  console.log('🔧 Iniciando reset del sistema de roles y permisos...\n');

  try {
    const db = container.get<DatabaseConnection>('SharedConnection');

    // 1. Verificar estado actual
    console.log('📊 Estado actual de la base de datos:');
    const currentRoles = await db.query('SELECT id, name, description, company_id, is_system_role FROM roles WHERE deleted_at IS NULL ORDER BY name');
    console.log('Roles actuales:', currentRoles.length);
    currentRoles.forEach((role: any) => {
      console.log(`  - ${role.name}: company_id=${role.company_id}, is_system=${role.is_system_role}`);
    });

    const currentPermissions = await db.query('SELECT COUNT(*) as total FROM permissions WHERE deleted_at IS NULL');
    console.log(`Permisos actuales: ${(currentPermissions[0] as any).total}\n`);

    // 2. Limpiar asociaciones existentes
    console.log('🧹 Limpiando asociaciones existentes...');
    await db.query('DELETE FROM role_permissions');
    await db.query('DELETE FROM user_roles WHERE role_id IN (SELECT id FROM roles)');
    console.log('✅ Asociaciones limpiadas\n');

    // 3. Corregir roles del sistema
    console.log('🔧 Corrigiendo roles del sistema...');

    // Crear roles del sistema correctos (sin company_id)
    const systemRoles = [
      {
        name: 'Super Admin',
        description: 'Super Administrator with full system access',
        company_id: null,
        is_system_role: true
      },
      {
        name: 'Admin',
        description: 'Company Administrator',
        company_id: null,
        is_system_role: true
      },
      {
        name: 'User',
        description: 'Standard User',
        company_id: null,
        is_system_role: true
      }
    ];

    // Eliminar roles existentes
    await db.query('UPDATE roles SET deleted_at = NOW() WHERE deleted_at IS NULL');

    // Crear nuevos roles del sistema
    for (const role of systemRoles) {
      const roleId = await db.query(`
        INSERT INTO roles (id, name, description, company_id, is_system_role, status, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active', NOW(), NOW())
        RETURNING id
      `, [role.name, role.description, role.company_id, role.is_system_role]);

      console.log(`✅ Creado rol del sistema: ${role.name} (ID: ${(roleId[0] as any).id})`);
    }

    // 4. Crear permisos básicos
    console.log('\n📋 Creando permisos básicos...');

    const permissions = [
      // Permisos de empresas
      { name: 'companies.view', description: 'View companies', resource: 'companies', action: 'view' },
      { name: 'companies.create', description: 'Create companies', resource: 'companies', action: 'create' },
      { name: 'companies.edit', description: 'Edit companies', resource: 'companies', action: 'edit' },
      { name: 'companies.delete', description: 'Delete companies', resource: 'companies', action: 'delete' },

      // Permisos de usuarios
      { name: 'users.view', description: 'View users', resource: 'users', action: 'view' },
      { name: 'users.create', description: 'Create users', resource: 'users', action: 'create' },
      { name: 'users.edit', description: 'Edit users', resource: 'users', action: 'edit' },
      { name: 'users.delete', description: 'Delete users', resource: 'users', action: 'delete' },

      // Permisos de roles
      { name: 'roles.view', description: 'View roles', resource: 'roles', action: 'view' },
      { name: 'roles.create', description: 'Create roles', resource: 'roles', action: 'create' },
      { name: 'roles.edit', description: 'Edit roles', resource: 'roles', action: 'edit' },
      { name: 'roles.delete', description: 'Delete roles', resource: 'roles', action: 'delete' },

      // Permisos de administración
      { name: 'admin.users.view', description: 'Admin: View users', resource: 'admin', action: 'users.view' },
      { name: 'admin.users.manage', description: 'Admin: Manage users', resource: 'admin', action: 'users.manage' },
      { name: 'admin.companies.view', description: 'Admin: View companies', resource: 'admin', action: 'companies.view' },
      { name: 'admin.roles.manage', description: 'Admin: Manage roles', resource: 'admin', action: 'roles.manage' },

      // Permiso wildcard para SuperAdmin
      { name: '*', description: 'All permissions (SuperAdmin)', resource: '*', action: '*' }
    ];

    // Limpiar permisos existentes
    await db.query('UPDATE permissions SET deleted_at = NOW() WHERE deleted_at IS NULL');

    // Crear nuevos permisos
    const permissionIds: { [key: string]: string } = {};
    for (const permission of permissions) {
      const result = await db.query(`
        INSERT INTO permissions (id, name, description, resource, action, created_at, updated_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      `, [permission.name, permission.description, permission.resource, permission.action]);

      permissionIds[permission.name] = (result[0] as any).id;
      console.log(`✅ Creado permiso: ${permission.name}`);
    }

    // 5. Asignar permisos a roles
    console.log('\n🔗 Asignando permisos a roles...');

    const roles = await db.query('SELECT id, name FROM roles WHERE deleted_at IS NULL ORDER BY name');
    const roleMap: { [key: string]: string } = {};
    roles.forEach((role: any) => {
      roleMap[role.name] = role.id;
    });

    // SuperAdmin: todos los permisos
    if (roleMap['Super Admin']) {
      for (const permissionName of Object.keys(permissionIds)) {
        await db.query(`
          INSERT INTO role_permissions (role_id, permission_id, created_at)
          VALUES ($1, $2, NOW())
        `, [roleMap['Super Admin'], permissionIds[permissionName]]);
      }
      console.log('✅ Super Admin: Todos los permisos asignados');
    }

    // Admin: permisos de administración de empresa (SIN admin.users.view para ocultar módulo en Dashboard)
    if (roleMap['Admin']) {
      const adminPermissions = [
        'users.view', 'users.create', 'users.edit', 'users.delete',
        'roles.view', 'roles.create', 'roles.edit',
        'admin.users.manage', 'admin.roles.manage'
      ];

      for (const permissionName of adminPermissions) {
        if (permissionIds[permissionName]) {
          await db.query(`
            INSERT INTO role_permissions (role_id, permission_id, created_at)
            VALUES ($1, $2, NOW())
          `, [roleMap['Admin'], permissionIds[permissionName]]);
        }
      }
      console.log('✅ Admin: Permisos de administración asignados');
    }

    // User: permisos básicos
    if (roleMap['User']) {
      const userPermissions = ['users.view', 'roles.view'];

      for (const permissionName of userPermissions) {
        if (permissionIds[permissionName]) {
          await db.query(`
            INSERT INTO role_permissions (role_id, permission_id, created_at)
            VALUES ($1, $2, NOW())
          `, [roleMap['User'], permissionIds[permissionName]]);
        }
      }
      console.log('✅ User: Permisos básicos asignados');
    }

    // 6. Reasignar usuario admin@flexxus.com al rol Admin
    console.log('\n👤 Reasignando usuarios...');

    const adminUser = await db.query(`
      SELECT id, email, company_id FROM users
      WHERE email = 'admin@flexxus.com' AND deleted_at IS NULL
    `);

    if (adminUser.length > 0 && roleMap['Admin']) {
      // Actualizar rol del usuario
      await db.query(`
        UPDATE users SET role = 'admin', updated_at = NOW()
        WHERE id = $1
      `, [(adminUser[0] as any).id]);

      // Asignar rol en user_roles
      await db.query(`
        INSERT INTO user_roles (user_id, role_id, company_id, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (user_id, role_id) DO NOTHING
      `, [(adminUser[0] as any).id, roleMap['Admin'], (adminUser[0] as any).company_id]);

      console.log(`✅ Usuario admin@flexxus.com asignado al rol Admin`);
    }

    // 7. Verificar resultado final
    console.log('\n📊 Estado final:');
    const finalRoles = await db.query('SELECT id, name, company_id, is_system_role FROM roles WHERE deleted_at IS NULL ORDER BY name');
    console.log('Roles del sistema:');
    finalRoles.forEach((role: any) => {
      console.log(`  - ${role.name}: company_id=${role.company_id}, is_system=${role.is_system_role}`);
    });

    const finalPermissions = await db.query('SELECT COUNT(*) as total FROM permissions WHERE deleted_at IS NULL');
    console.log(`\nPermisos totales: ${(finalPermissions[0] as any).total}`);

    const rolePermissionCount = await db.query(`
      SELECT r.name, COUNT(rp.permission_id) as permission_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id
      WHERE r.deleted_at IS NULL
      GROUP BY r.id, r.name
      ORDER BY r.name
    `);

    console.log('\nPermisos por rol:');
    rolePermissionCount.forEach((rp: any) => {
      console.log(`  - ${rp.name}: ${rp.permission_count} permisos`);
    });

    console.log('\n🎉 ¡Reset del sistema de roles completado exitosamente!');

  } catch (error) {
    console.error('❌ Error durante el reset:', error);
    throw error;
  }
}

// Ejecutar el script
resetRoleSystem()
  .then(() => {
    console.log('\n✅ Script ejecutado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error en el script:', error);
    process.exit(1);
  });