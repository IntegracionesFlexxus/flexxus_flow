#!/usr/bin/env node

const { Client } = require('pg');

const dbConfig = {
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**',
};

async function checkAdminUser() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('🔍 VERIFICANDO USUARIO admin@flexxus.com\n');

    // Verificar si existe el usuario
    const user = await client.query(`
      SELECT id, email, first_name, last_name, role, password_hash, status, created_at
      FROM users
      WHERE email = 'admin@flexxus.com'
    `);

    if (user.rows.length === 0) {
      console.log('❌ Usuario admin@flexxus.com NO EXISTE');
      console.log('🔧 Necesita ser creado\n');

      // Verificar todos los usuarios existentes
      const allUsers = await client.query(`
        SELECT email, role, status
        FROM users
        ORDER BY email
      `);

      console.log('📋 USUARIOS EXISTENTES EN LA BASE:');
      allUsers.rows.forEach(u => {
        console.log(`   - ${u.email} (role: ${u.role}, status: ${u.status})`);
      });

    } else {
      const u = user.rows[0];
      console.log('✅ Usuario admin@flexxus.com EXISTE:');
      console.log(`   ID: ${u.id}`);
      console.log(`   Email: ${u.email}`);
      console.log(`   Nombre: ${u.first_name} ${u.last_name}`);
      console.log(`   Role: ${u.role}`);
      console.log(`   Status: ${u.status}`);
      console.log(`   Password hash: ${u.password_hash ? 'EXISTS' : 'NULL'}`);
      console.log(`   Creado: ${u.created_at}`);

      // Verificar asignaciones de roles
      const userRoles = await client.query(`
        SELECT ur.*, r.name as role_name, c.name as company_name
        FROM user_roles ur
        LEFT JOIN roles r ON ur.role_id = r.id
        LEFT JOIN companies c ON ur.company_id = c.id
        WHERE ur.user_id = $1
      `, [u.id]);

      console.log(`\n🎭 ASIGNACIONES DE ROLES (${userRoles.rows.length}):`);
      if (userRoles.rows.length === 0) {
        console.log('   Sin asignaciones en user_roles');
      } else {
        userRoles.rows.forEach(ur => {
          console.log(`   - Rol: ${ur.role_name} (${ur.role_id})`);
          console.log(`   - Empresa: ${ur.company_name} (${ur.company_id})`);
        });
      }
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Conexión cerrada');
  }
}

checkAdminUser();