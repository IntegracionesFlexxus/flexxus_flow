#!/usr/bin/env node
/**
 * Script para verificar estructura de tabla companies
 */

const { Client } = require('pg');

const dbConfig = {
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**',
};

async function checkCompaniesStructure() {
  const client = new Client(dbConfig);

  try {
    console.log('🔍 VERIFICANDO ESTRUCTURA DE TABLA COMPANIES');
    await client.connect();

    // Verificar columnas de la tabla companies
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'companies'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Columnas de la tabla companies:');
    columns.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
    });

    // Ver si hay empresas existentes
    const existingCompanies = await client.query(`
      SELECT * FROM companies LIMIT 3
    `);

    console.log(`\n🏢 Empresas existentes: ${existingCompanies.rows.length}`);
    existingCompanies.rows.forEach(company => {
      console.log(`   ${company.id} - ${company.name}`);
    });

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await client.end();
  }
}

checkCompaniesStructure();