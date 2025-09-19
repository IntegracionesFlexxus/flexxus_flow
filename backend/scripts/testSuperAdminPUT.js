#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function testSuperAdminPUT() {
  try {
    console.log('🔧 PRUEBA COMPLETA PUT ROLES SUPERADMIN\n');

    // 1. LOGIN como SuperAdmin
    console.log('1️⃣ INICIANDO SESIÓN COMO SUPERADMIN...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'cv@flexxus.com',
      password: '123456'
    });

    if (!loginResponse.data.success) {
      throw new Error('Login falló: ' + loginResponse.data.message);
    }

    console.log('🔍 DEBUG: loginResponse.data structure:', Object.keys(loginResponse.data));
    console.log('🔍 DEBUG: accessToken:', loginResponse.data.accessToken ? 'EXISTS' : 'MISSING');

    const token = loginResponse.data.data.accessToken;
    const userInfo = loginResponse.data.data.user;

    console.log('✅ Login exitoso:');
    console.log(`   Token: ${token.substring(0, 20)}...`);
    console.log(`   Usuario: ${userInfo.email}`);
    console.log(`   Role: ${userInfo.role}`);
    console.log(`   Company: ${userInfo.companyId || (loginResponse.data.data.companies?.[0]?.id)}\n`);

    // 2. OBTENER ROLES DEL SISTEMA
    console.log('2️⃣ OBTENIENDO ROLES DEL SISTEMA...');
    const rolesResponse = await axios.get(`${API_BASE}/roles/system`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!rolesResponse.data.success) {
      throw new Error('Obtener roles falló: ' + rolesResponse.data.message);
    }

    const roles = rolesResponse.data.data;
    console.log(`✅ Obtenidos ${roles.length} roles:`);
    roles.forEach(role => {
      console.log(`   - ${role.name} (${role.id})`);
      console.log(`     Descripción: ${role.description || 'Sin descripción'}`);
    });

    // 3. SELECCIONAR ROL PARA ACTUALIZAR (usaremos el primer rol)
    if (roles.length === 0) {
      throw new Error('No hay roles disponibles para actualizar');
    }

    const roleToUpdate = roles[0];
    console.log(`\n3️⃣ ACTUALIZANDO ROL: ${roleToUpdate.name}`);
    console.log(`   ID: ${roleToUpdate.id}`);
    console.log(`   Descripción original: ${roleToUpdate.description}`);

    // 4. REALIZAR PUT CON DATOS DE PRUEBA
    const updateData = {
      name: roleToUpdate.name, // Mantener el mismo nombre
      description: `${roleToUpdate.description} - Actualizado el ${new Date().toLocaleString()}`
    };

    console.log(`\n4️⃣ ENVIANDO PUT REQUEST...`);
    console.log(`   URL: ${API_BASE}/roles/${roleToUpdate.id}`);
    console.log(`   Headers: Authorization: Bearer ${token.substring(0, 20)}...`);
    console.log(`   Body: ${JSON.stringify(updateData, null, 2)}`);

    const updateResponse = await axios.put(`${API_BASE}/roles/${roleToUpdate.id}`, updateData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`\n✅ PUT EXITOSO:`);
    console.log(`   Status: ${updateResponse.status}`);
    console.log(`   Success: ${updateResponse.data.success}`);
    console.log(`   Message: ${updateResponse.data.message}`);

    if (updateResponse.data.data) {
      console.log(`   Rol actualizado:`);
      console.log(`     - Nombre: ${updateResponse.data.data.name}`);
      console.log(`     - Descripción: ${updateResponse.data.data.description}`);
      console.log(`     - ID: ${updateResponse.data.data.id}`);
    }

    console.log('\n🎉 ¡PRUEBA COMPLETADA EXITOSAMENTE!');

  } catch (error) {
    console.error('\n💥 ERROR EN LA PRUEBA:');

    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Headers: ${JSON.stringify(error.response.headers, null, 2)}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      console.error(`   No response received: ${error.message}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }

    if (error.stack) {
      console.error(`   Stack: ${error.stack}`);
    }
  }
}

// Instalar axios si no está disponible
try {
  testSuperAdminPUT();
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('axios')) {
    console.log('📦 Instalando axios...');
    const { execSync } = require('child_process');
    execSync('npm install axios', { stdio: 'inherit' });
    console.log('✅ Axios instalado, ejecutando prueba...');
    testSuperAdminPUT();
  } else {
    throw error;
  }
}