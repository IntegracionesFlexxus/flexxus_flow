#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function testAdminLogin() {
  try {
    console.log('🔍 PRUEBA DE LOGIN ADMIN\n');

    console.log('1️⃣ INTENTANDO LOGIN CON admin@flexxus.com...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@flexxus.com',
      password: 'admin123'
    });

    if (loginResponse.data.success) {
      console.log('✅ Login exitoso!');
      console.log(`   Token: ${loginResponse.data.data.accessToken.substring(0, 20)}...`);
      console.log(`   Usuario: ${loginResponse.data.data.user.email}`);
      console.log(`   Role: ${loginResponse.data.data.user.role}`);
      console.log(`   Company: ${loginResponse.data.data.user.companyId}`);
      console.log(`   Empresas disponibles: ${loginResponse.data.data.companies?.length || 0}`);

      if (loginResponse.data.data.companies?.length > 0) {
        console.log('   Empresas:');
        loginResponse.data.data.companies.forEach(company => {
          console.log(`     - ${company.name} (${company.id})`);
          console.log(`       Role en empresa: ${company.role}`);
        });
      }
    } else {
      console.log('❌ Login falló:', loginResponse.data.message);
    }

  } catch (error) {
    console.error('💥 ERROR EN LOGIN:');

    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data?.message || 'Sin mensaje'}`);
      console.error(`   Error: ${error.response.data?.error || 'Sin error específico'}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
  }
}

testAdminLogin();