#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function debugLoginResponse() {
  try {
    console.log('🔍 DEBUG LOGIN RESPONSE STRUCTURE\n');

    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'cv@flexxus.com',
      password: '123456'
    });

    console.log('📋 FULL RESPONSE STRUCTURE:');
    console.log(JSON.stringify(loginResponse.data, null, 2));

    console.log('\n🎯 SPECIFIC PROPERTY ACCESS:');
    console.log(`loginResponse.data: ${typeof loginResponse.data}`);
    console.log(`loginResponse.data.data: ${typeof loginResponse.data.data}`);
    console.log(`loginResponse.data.data.user: ${typeof loginResponse.data.data.user}`);

    if (loginResponse.data.data && loginResponse.data.data.user) {
      const user = loginResponse.data.data.user;
      console.log(`\n👤 USER OBJECT PROPERTIES:`);
      Object.keys(user).forEach(key => {
        console.log(`  ${key}: ${user[key]}`);
      });
    }

  } catch (error) {
    console.error('💥 ERROR:', error.response?.data || error.message);
  }
}

debugLoginResponse();