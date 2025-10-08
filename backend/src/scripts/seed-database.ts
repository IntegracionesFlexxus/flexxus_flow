/**
 * Script para poblar la base de datos con datos de prueba
 * Genera empresas, usuarios, roles y permisos de forma coherente
 */

import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

// Configuración de la base de datos
const pool = new Pool({
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**'
});

// Datos de prueba
const companies = [
  { name: 'TechNova Solutions', tax_id: 'TN-2024-001', plan: 'enterprise', industry: 'Technology', website: 'https://technova.com' },
  { name: 'DataFlex Analytics', tax_id: 'DF-2024-002', plan: 'professional', industry: 'Analytics', website: 'https://dataflex.com' },
  { name: 'AgroSoft', tax_id: 'AS-2024-003', plan: 'starter', industry: 'Agriculture', website: 'https://agrosoft.com' },
  { name: 'Medicorp Health', tax_id: 'MH-2024-004', plan: 'professional', industry: 'Healthcare', website: 'https://medicorp.com' },
  { name: 'LogiPro Logistics', tax_id: 'LP-2024-005', plan: 'basic', industry: 'Logistics', website: 'https://logipro.com' }
];

const roles = [
  { name: 'Administrador', description: 'Acceso completo a todas las funcionalidades', level: 'admin' },
  { name: 'Líder de Equipo', description: 'Gestión de equipo y proyectos', level: 'manager' },
  { name: 'Empleado', description: 'Acceso básico operativo', level: 'employee' }
];

const permissions = [
  // Usuarios
  { resource: 'users', action: 'read', description: 'Ver usuarios' },
  { resource: 'users', action: 'create', description: 'Crear usuarios' },
  { resource: 'users', action: 'update', description: 'Actualizar usuarios' },
  { resource: 'users', action: 'delete', description: 'Eliminar usuarios' },

  // Roles
  { resource: 'roles', action: 'read', description: 'Ver roles' },
  { resource: 'roles', action: 'create', description: 'Crear roles' },
  { resource: 'roles', action: 'update', description: 'Actualizar roles' },
  { resource: 'roles', action: 'delete', description: 'Eliminar roles' },

  // Proyectos
  { resource: 'projects', action: 'read', description: 'Ver proyectos' },
  { resource: 'projects', action: 'create', description: 'Crear proyectos' },
  { resource: 'projects', action: 'update', description: 'Actualizar proyectos' },
  { resource: 'projects', action: 'delete', description: 'Eliminar proyectos' },

  // Reportes
  { resource: 'reports', action: 'read', description: 'Ver reportes' },
  { resource: 'reports', action: 'create', description: 'Crear reportes' },
  { resource: 'reports', action: 'export', description: 'Exportar reportes' },

  // Configuración
  { resource: 'settings', action: 'read', description: 'Ver configuración' },
  { resource: 'settings', action: 'update', description: 'Actualizar configuración' }
];

const rolePermissions: Record<string, string[]> = {
  'Administrador': [
    'users:read', 'users:create', 'users:update', 'users:delete',
    'roles:read', 'roles:create', 'roles:update', 'roles:delete',
    'projects:read', 'projects:create', 'projects:update', 'projects:delete',
    'reports:read', 'reports:create', 'reports:export',
    'settings:read', 'settings:update'
  ],
  'Líder de Equipo': [
    'users:read',
    'roles:read',
    'projects:read', 'projects:create', 'projects:update',
    'reports:read', 'reports:create', 'reports:export',
    'settings:read'
  ],
  'Empleado': [
    'projects:read',
    'reports:read',
    'settings:read'
  ]
};

const userTemplates = [
  { firstName: 'Juan', lastName: 'Pérez', role: 'Administrador' },
  { firstName: 'María', lastName: 'González', role: 'Líder de Equipo' },
  { firstName: 'Carlos', lastName: 'Rodríguez', role: 'Líder de Equipo' },
  { firstName: 'Ana', lastName: 'Martínez', role: 'Empleado' },
  { firstName: 'Luis', lastName: 'Fernández', role: 'Empleado' },
  { firstName: 'Sofia', lastName: 'López', role: 'Empleado' }
];

interface SeedResult {
  companies: any[];
  users: any[];
  roles: any[];
  permissions: any[];
}

async function cleanTestData() {
  const client = await pool.connect();
  try {
    console.log('🧹 Limpiando datos de prueba anteriores...\n');

    // Eliminar en orden para respetar foreign keys
    const testTaxIds = ['TN-2024-001', 'DF-2024-002', 'AS-2024-003', 'MH-2024-004', 'LP-2024-005'];

    // Obtener IDs de empresas de prueba
    const companiesResult = await client.query(
      'SELECT id FROM companies WHERE tax_id = ANY($1)',
      [testTaxIds]
    );
    const companyIds = companiesResult.rows.map((r: any) => r.id);

    if (companyIds.length > 0) {
      // Eliminar user_companies asociados a estas empresas
      await client.query(
        'DELETE FROM user_companies WHERE company_id = ANY($1)',
        [companyIds]
      );

      // Eliminar user_roles asociados a estas empresas
      await client.query(
        'DELETE FROM user_roles WHERE company_id = ANY($1)',
        [companyIds]
      );

      // Eliminar role_permissions de roles asociados a estas empresas
      await client.query(`
        DELETE FROM role_permissions
        WHERE role_id IN (SELECT id FROM roles WHERE company_id = ANY($1))
      `, [companyIds]);

      // Eliminar roles de estas empresas
      await client.query(
        'DELETE FROM roles WHERE company_id = ANY($1)',
        [companyIds]
      );
    }

    // Eliminar usuarios de prueba (por email) - también de user_companies por si acaso
    await client.query(`
      DELETE FROM user_companies
      WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@test%')
    `);

    await client.query("DELETE FROM users WHERE email LIKE '%@test%'");

    // Eliminar empresas de prueba
    await client.query('DELETE FROM companies WHERE tax_id = ANY($1)', [testTaxIds]);

    console.log('✅ Datos anteriores eliminados\n');
  } finally {
    client.release();
  }
}

async function verifyTables() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verificando estructura de la base de datos...\n');

    const tables = ['companies', 'plans', 'users', 'roles', 'permissions', 'user_roles', 'role_permissions'];

    for (const table of tables) {
      const result = await client.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)`,
        [table]
      );

      if (result.rows[0].exists) {
        console.log(`✅ Tabla "${table}" existe`);
      } else {
        console.log(`❌ Tabla "${table}" NO existe`);
      }
    }
    console.log('');
  } finally {
    client.release();
  }
}

async function createPermissions(client: any): Promise<Map<string, string>> {
  console.log('📋 Creando permisos...\n');

  const permissionMap = new Map<string, string>();

  for (const perm of permissions) {
    // Verificar si el permiso ya existe
    const existing = await client.query(
      'SELECT id FROM permissions WHERE resource = $1 AND action = $2',
      [perm.resource, perm.action]
    );

    if (existing.rows.length > 0) {
      permissionMap.set(`${perm.resource}:${perm.action}`, existing.rows[0].id);
      console.log(`  ℹ️  Permiso "${perm.resource}:${perm.action}" ya existe`);
    } else {
      const result = await client.query(
        `INSERT INTO permissions (resource, action, description, name)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [perm.resource, perm.action, perm.description, `${perm.resource}:${perm.action}`]
      );

      permissionMap.set(`${perm.resource}:${perm.action}`, result.rows[0].id);
      console.log(`  ✅ Permiso "${perm.resource}:${perm.action}" creado`);
    }
  }

  console.log('');
  return permissionMap;
}

async function seedDatabase(): Promise<SeedResult> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result: SeedResult = {
      companies: [],
      users: [],
      roles: [],
      permissions: []
    };

    // 1. Crear permisos globales
    const permissionMap = await createPermissions(client);

    // 2. Crear empresas
    console.log('🏢 Creando empresas...\n');

    for (const company of companies) {
      // Crear empresa (el campo plan es VARCHAR, no FK a tabla plans)
      const companyResult = await client.query(
        `INSERT INTO companies (name, tax_id, plan, status, settings, website)
         VALUES ($1, $2, $3, 'active', $4, $5)
         RETURNING *`,
        [
          company.name,
          company.tax_id,
          company.plan,
          JSON.stringify({ industry: company.industry }),
          company.website
        ]
      );

      const createdCompany = companyResult.rows[0];
      result.companies.push({ ...createdCompany, planName: company.plan });

      console.log(`  ✅ Empresa "${company.name}" creada (${company.plan})`);

      // 3. Crear roles para esta empresa
      console.log(`     📝 Creando roles para ${company.name}...`);

      const companyRoles = new Map<string, string>();

      for (const role of roles) {
        const roleResult = await client.query(
          `INSERT INTO roles (name, description, company_id, is_system_role, status)
           VALUES ($1, $2, $3, false, 'active')
           RETURNING id`,
          [role.name, role.description, createdCompany.id]
        );

        const roleId = roleResult.rows[0].id;
        companyRoles.set(role.name, roleId);

        result.roles.push({
          id: roleId,
          name: role.name,
          company: company.name,
          permissions: []
        });

        // Asignar permisos al rol
        const permsForRole = rolePermissions[role.name] || [];

        for (const permKey of permsForRole) {
          const permId = permissionMap.get(permKey);
          if (permId) {
            await client.query(
              `INSERT INTO role_permissions (role_id, permission_id)
               VALUES ($1, $2)`,
              [roleId, permId]
            );

            const roleIndex = result.roles.findIndex(r => r.id === roleId);
            if (roleIndex !== -1) {
              result.roles[roleIndex].permissions.push(permKey);
            }
          }
        }

        console.log(`        ✅ Rol "${role.name}" creado con ${permsForRole.length} permisos`);
      }

      // 4. Crear usuarios para esta empresa
      console.log(`     👥 Creando usuarios para ${company.name}...`);

      const numUsers = Math.floor(Math.random() * 3) + 3; // 3-6 usuarios
      const companyDomain = company.name.toLowerCase().replace(/\s+/g, '').substring(0, 10);

      for (let i = 0; i < numUsers && i < userTemplates.length; i++) {
        const user = userTemplates[i];
        const email = `${user.firstName.toLowerCase()}.${user.lastName.toLowerCase()}@test.${companyDomain}.com`;
        const hashedPassword = await bcrypt.hash('Test123456!', 10);

        // Verificar si users tiene company_id (de lo contrario, podría no ser necesario)
        const userResult = await client.query(
          `INSERT INTO users (email, password_hash, first_name, last_name, status, email_verified_at)
           VALUES ($1, $2, $3, $4, 'active', NOW())
           RETURNING id, email, first_name, last_name`,
          [email, hashedPassword, user.firstName, user.lastName]
        );

        const createdUser = userResult.rows[0];

        // Asignar rol al usuario en user_roles
        const roleId = companyRoles.get(user.role);
        if (roleId) {
          await client.query(
            `INSERT INTO user_roles (user_id, role_id, company_id)
             VALUES ($1, $2, $3)`,
            [createdUser.id, roleId, createdCompany.id]
          );

          // IMPORTANTE: También insertar en user_companies (requerido por AuthService)
          const isFirstUser = i === 0; // El primer usuario (Admin) será default
          await client.query(
            `INSERT INTO user_companies (user_id, company_id, role_id, role, is_default, status, joined_at)
             VALUES ($1, $2, $3, $4, $5, 'active', NOW())`,
            [createdUser.id, createdCompany.id, roleId, user.role, isFirstUser]
          );
        }

        result.users.push({
          ...createdUser,
          role: user.role,
          company: company.name
        });

        console.log(`        ✅ Usuario "${user.firstName} ${user.lastName}" (${user.role})`);
      }

      console.log('');
    }

    await client.query('COMMIT');

    return result;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function generateReport(result: SeedResult) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 RESUMEN DE DATOS GENERADOS');
  console.log('='.repeat(80) + '\n');

  console.log(`✅ Total: ${result.companies.length} empresas, ${result.users.length} usuarios, ${result.roles.length} roles\n`);

  for (const company of result.companies) {
    console.log(`\n## 🏢 ${company.name}`);
    console.log(`   - Plan: **${company.plan}**`);
    console.log(`   - Tax ID: \`${company.tax_id}\``);
    console.log(`   - Estado: ${company.status}`);

    const companyUsers = result.users.filter(u => u.company === company.name);
    console.log(`\n   ### 👥 Usuarios (${companyUsers.length}):`);

    const roleGroups = {
      'Administrador': companyUsers.filter(u => u.role === 'Administrador'),
      'Líder de Equipo': companyUsers.filter(u => u.role === 'Líder de Equipo'),
      'Empleado': companyUsers.filter(u => u.role === 'Empleado')
    };

    for (const [roleName, users] of Object.entries(roleGroups)) {
      if (users.length > 0) {
        console.log(`\n   **${roleName}**:`);
        for (const user of users) {
          console.log(`   - ${user.first_name} ${user.last_name} (${user.email})`);
        }
      }
    }

    const companyRoles = result.roles.filter(r => r.company === company.name);
    console.log(`\n   ### 🔐 Roles y Permisos:`);

    for (const role of companyRoles) {
      console.log(`\n   **${role.name}** (${role.permissions.length} permisos):`);
      console.log(`   ${role.permissions.map((p: string) => `\`${p}\``).join(', ')}`);
    }

    console.log('\n' + '-'.repeat(80));
  }

  console.log('\n\n## 🔑 Credenciales de Prueba\n');
  console.log('**Contraseña para todos los usuarios:** `Test123456!`\n');
  console.log('### Ejemplos de login:\n');

  for (const company of result.companies) {
    const adminUser = result.users.find(u => u.company === company.name && u.role === 'Administrador');
    if (adminUser) {
      console.log(`- **${company.name}**: ${adminUser.email}`);
    }
  }

  console.log('\n' + '='.repeat(80) + '\n');
}

async function main() {
  try {
    console.log('\n🚀 Iniciando proceso de seed de base de datos\n');
    console.log('='.repeat(80) + '\n');

    // Verificar tablas
    await verifyTables();

    // Limpiar datos anteriores
    await cleanTestData();

    // Poblar base de datos
    const result = await seedDatabase();

    // Generar reporte
    generateReport(result);

    console.log('✅ Proceso completado exitosamente!\n');

  } catch (error) {
    console.error('\n❌ Error durante el proceso de seed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
