#!/usr/bin/env node

const { Client } = require('pg');

const dbConfig = {
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**',
};

async function checkSuperAdminAssignment() {
  const client = new Client(dbConfig);

  try {
    await client.connect();

    console.log('🔍 VERIFICANDO ASIGNACIONES DEL SUPERADMIN cv@flexxus.com\n');

    // 1. Verificar usuario y role directo
    const user = await client.query(`
      SELECT id, email, role, first_name, last_name
      FROM users
      WHERE email = 'cv@flexxus.com'
    `);

    console.log('👤 USUARIO:');
    if (user.rows.length > 0) {
      const u = user.rows[0];
      console.log(`   ID: ${u.id}`);
      console.log(`   Email: ${u.email}`);
      console.log(`   Role directo: ${u.role || 'NULL'}`);
      console.log(`   Nombre: ${u.first_name} ${u.last_name}\n`);

      // 2. Verificar asignaciones user_roles
      const userRoles = await client.query(`
        SELECT ur.*, r.name as role_name, c.name as company_name
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        LEFT JOIN companies c ON ur.company_id = c.id
        WHERE ur.user_id = $1
      `, [u.id]);

      console.log('🎭 ASIGNACIONES USER_ROLES:');
      if (userRoles.rows.length === 0) {
        console.log('   ✅ No hay asignaciones user_roles (correcto para SuperAdmin)\n');
      } else {
        console.log(`   ⚠️  Encontradas ${userRoles.rows.length} asignaciones:`);
        userRoles.rows.forEach(ur => {
          console.log(`   - Rol: ${ur.role_name}`);
          console.log(`   - Empresa: ${ur.company_name} (${ur.company_id})`);
          console.log(`   - Role ID: ${ur.role_id}\n`);
        });
      }

      // 3. Verificar empresa que está usando en la sesión
      console.log('🏢 EMPRESA EN SESIÓN:');
      const company = await client.query(`
        SELECT id, name, plan, status
        FROM companies
        WHERE id = '0a8e08a1-fdad-4caa-b90e-d8d791fa82ee'
      `);

      if (company.rows.length > 0) {
        const c = company.rows[0];
        console.log(`   ID: ${c.id}`);
        console.log(`   Nombre: ${c.name}`);
        console.log(`   Plan: ${c.plan}`);
        console.log(`   Status: ${c.status}\n`);
      }

      // 4. Verificar empresa Sistema Global
      console.log('🌍 EMPRESA SISTEMA GLOBAL:');
      const globalCompany = await client.query(`
        SELECT id, name, plan, status
        FROM companies
        WHERE id = '00000000-0000-0000-0000-000000000000'
      `);

      if (globalCompany.rows.length > 0) {
        const gc = globalCompany.rows[0];
        console.log(`   ✅ Empresa Sistema Global existe:`);
        console.log(`   ID: ${gc.id}`);
        console.log(`   Nombre: ${gc.name}`);
        console.log(`   Plan: ${gc.plan}`);
        console.log(`   Status: ${gc.status}\n`);
      } else {
        console.log(`   ❌ Empresa Sistema Global NO existe\n`);
      }

    } else {
      console.log('   ❌ Usuario no encontrado');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await client.end();
  }
}

checkSuperAdminAssignment();