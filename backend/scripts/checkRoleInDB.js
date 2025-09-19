#!/usr/bin/env node

const { Client } = require('pg');

const dbConfig = {
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_shared',
  user: 'flexxus',
  password: 'Flexxus2023**',
};

async function checkRoleInDB() {
  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('🔍 CHECKING ROLE IN DATABASE DIRECTLY\n');

    const roleId = 'f98a71a9-31bb-47e7-9cca-9b740f3383c7';

    const role = await client.query(`
      SELECT id, name, description, is_system_role, company_id, status, created_at, updated_at
      FROM roles
      WHERE id = $1
    `, [roleId]);

    if (role.rows.length > 0) {
      const r = role.rows[0];
      console.log('📋 ROLE DATA FROM DATABASE:');
      console.log(`   ID: ${r.id}`);
      console.log(`   Name: "${r.name}"`);
      console.log(`   Description: ${r.description}`);
      console.log(`   Is System Role: ${r.is_system_role}`);
      console.log(`   Company ID: ${r.company_id}`);
      console.log(`   Status: ${r.status}`);
      console.log(`   Created: ${r.created_at}`);
      console.log(`   Updated: ${r.updated_at}`);

      if (!r.name || r.name.trim() === '') {
        console.log('\n❌ PROBLEM: Role name is empty or null in database!');
      } else {
        console.log('\n✅ Role name exists in database');
      }
    } else {
      console.log('❌ Role not found in database');
    }

  } catch (error) {
    console.error('💥 Error:', error.message);
  } finally {
    await client.end();
    console.log('\n🔌 Connection closed');
  }
}

checkRoleInDB();