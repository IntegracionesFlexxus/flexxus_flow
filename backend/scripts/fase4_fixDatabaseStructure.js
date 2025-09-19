#!/usr/bin/env node
/**
 * FASE 4: Corregir estructura de base de datos
 * Agregar columnas faltantes para el sistema de roles
 */

const { Client } = require('pg');

const dbConfig = {
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**',
};

async function fixDatabaseStructure() {
  const client = new Client(dbConfig);

  try {
    console.log('🔧 CORRIGIENDO ESTRUCTURA DE BASE DE DATOS');
    await client.connect();
    console.log('✅ Conexión establecida');

    // 1. Agregar columna role a users si no existe
    console.log('\n1️⃣ Verificando columna users.role');
    try {
      await client.query('ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT NULL');
      console.log('✅ Columna users.role agregada');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Columna users.role ya existe');
      } else {
        console.log(`❌ Error agregando users.role: ${error.message}`);
      }
    }

    // 2. Agregar columna deleted_at a role_permissions si no existe
    console.log('\n2️⃣ Verificando columna role_permissions.deleted_at');
    try {
      await client.query('ALTER TABLE role_permissions ADD COLUMN deleted_at TIMESTAMP DEFAULT NULL');
      console.log('✅ Columna role_permissions.deleted_at agregada');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Columna role_permissions.deleted_at ya existe');
      } else {
        console.log(`❌ Error agregando role_permissions.deleted_at: ${error.message}`);
      }
    }

    // 3. Agregar columna id a user_roles si no existe (como clave primaria)
    console.log('\n3️⃣ Verificando columna user_roles.id');
    try {
      // Verificar si ya tiene id
      const result = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'user_roles' AND column_name = 'id'
      `);

      if (result.rows.length === 0) {
        await client.query('ALTER TABLE user_roles ADD COLUMN id UUID DEFAULT gen_random_uuid() PRIMARY KEY');
        console.log('✅ Columna user_roles.id agregada');
      } else {
        console.log('✅ Columna user_roles.id ya existe');
      }
    } catch (error) {
      console.log(`❌ Error agregando user_roles.id: ${error.message}`);
    }

    // 4. Establecer super_admin para el usuario cv@flexxus.com
    console.log('\n4️⃣ Configurando SuperAdmin');
    try {
      const result = await client.query(`
        UPDATE users
        SET role = 'super_admin'
        WHERE email = 'cv@flexxus.com' AND deleted_at IS NULL
        RETURNING id, email, first_name, last_name
      `);

      if (result.rows.length > 0) {
        const user = result.rows[0];
        console.log(`✅ SuperAdmin configurado: ${user.first_name} ${user.last_name} (${user.email})`);
      } else {
        console.log('❌ No se encontró usuario cv@flexxus.com');
      }
    } catch (error) {
      console.log(`❌ Error configurando SuperAdmin: ${error.message}`);
    }

    // 5. Verificar estructura final
    console.log('\n5️⃣ Verificando estructura final');

    const checks = [
      {
        name: 'users.role existe',
        query: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'role'
        `
      },
      {
        name: 'role_permissions.deleted_at existe',
        query: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'role_permissions' AND column_name = 'deleted_at'
        `
      },
      {
        name: 'user_roles.id existe',
        query: `
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'user_roles' AND column_name = 'id'
        `
      }
    ];

    for (const check of checks) {
      try {
        const result = await client.query(check.query);
        if (result.rows.length > 0) {
          console.log(`   ✅ ${check.name}`);
        } else {
          console.log(`   ❌ ${check.name}`);
        }
      } catch (error) {
        console.log(`   ❌ ${check.name}: ${error.message}`);
      }
    }

    console.log('\n🎉 ESTRUCTURA DE BASE DE DATOS CORREGIDA');

  } catch (error) {
    console.error('💥 Error crítico:', error.message);
    process.exit(1);

  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

fixDatabaseStructure()
  .then(() => {
    console.log('\n✅ Corrección de estructura completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error no manejado:', error);
    process.exit(1);
  });