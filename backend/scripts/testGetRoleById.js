#!/usr/bin/env node

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/v1';

async function testGetRoleById() {
  try {
    console.log('🔍 TEST GET ROLE BY ID\n');

    // 1. LOGIN
    console.log('1️⃣ LOGGING IN...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'cv@flexxus.com',
      password: '123456'
    });

    const token = loginResponse.data.data.accessToken;
    const roleId = 'f98a71a9-31bb-47e7-9cca-9b740f3383c7';

    // 2. GET ROLE BY ID directly
    console.log('2️⃣ GETTING ROLE BY ID DIRECTLY...');
    console.log(`   Role ID: ${roleId}`);

    const roleResponse = await axios.get(`${API_BASE}/roles/${roleId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('\n📋 RESPONSE STRUCTURE:');
    console.log(JSON.stringify(roleResponse.data, null, 2));

    if (roleResponse.data.success && roleResponse.data.data) {
      const role = roleResponse.data.data;
      console.log('\n🎯 ROLE DETAILS:');
      console.log(`   Name: "${role.name}"`);
      console.log(`   Description: ${role.description}`);
      console.log(`   ID: ${role.id}`);

      if (!role.name || role.name.trim() === '') {
        console.log('\n❌ PROBLEM: Role name is empty in API response!');
      } else {
        console.log('\n✅ Role name exists in API response');
      }
    }

  } catch (error) {
    console.error('💥 ERROR:', error.response?.data || error.message);
  }
}

testGetRoleById();