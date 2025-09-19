#!/usr/bin/env node
/**
 * Script para crear la empresa "Sistema Global" para SuperAdmin
 */

const { Client } = require('pg');

const dbConfig = {
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**',
};

async function createGlobalSystemCompany() {
  const client = new Client(dbConfig);

  try {
    console.log('🏢 CREANDO EMPRESA SISTEMA GLOBAL');
    await client.connect();
    console.log('✅ Conexión establecida');

    // Verificar si ya existe
    const existingCompany = await client.query(`
      SELECT id, name FROM companies
      WHERE id = '00000000-0000-0000-0000-000000000000'
    `);

    if (existingCompany.rows.length > 0) {
      console.log('✅ Empresa Sistema Global ya existe:', existingCompany.rows[0]);
      return;
    }

    // Crear la empresa
    const result = await client.query(`
      INSERT INTO companies (
        id,
        name,
        phone,
        address,
        plan,
        status,
        settings,
        timezone,
        language,
        created_at,
        updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        'Sistema Global',
        '+00000000',
        'Sistema Central',
        'enterprise',
        'active',
        '{"is_system_company": true, "description": "Empresa virtual para SuperAdmin"}',
        'UTC',
        'es',
        NOW(),
        NOW()
      )
      RETURNING id, name, plan, status
    `);

    const company = result.rows[0];
    console.log('✅ Empresa Sistema Global creada exitosamente:');
    console.log(`   ID: ${company.id}`);
    console.log(`   Nombre: ${company.name}`);
    console.log(`   Plan: ${company.plan}`);
    console.log(`   Status: ${company.status}`);

    console.log('\n🎉 EMPRESA SISTEMA GLOBAL LISTA PARA SUPERADMIN');

  } catch (error) {
    console.error('💥 Error creando empresa:', error.message);
    process.exit(1);

  } finally {
    await client.end();
    console.log('🔌 Conexión cerrada');
  }
}

createGlobalSystemCompany()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Error no manejado:', error);
    process.exit(1);
  });