/**
 * Script para probar login de SuperAdmin
 */

import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

async function testLogin() {
  console.log('🔐 Probando login de SuperAdmin...\n');

  const pool = new Pool({
    host: '10.254.252.91',
    port: 5003,
    database: 'flexxus_shared',
    user: 'flexxus',
    password: 'Flexxus2023**',
    ssl: false
  });

  try {
    // 1. Obtener usuario
    const userResult = await pool.query(`
      SELECT id, email, first_name, last_name, password_hash FROM users
      WHERE email = 'cv@flexxus.com'
    `);

    if (!userResult.rows[0]) {
      throw new Error('Usuario no encontrado');
    }

    const user = userResult.rows[0];
    console.log('Usuario encontrado:', {
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`,
      hasPasswordHash: !!user.password_hash
    });

    // 2. Probar diferentes contraseñas
    const testPasswords = [
      'Flexxus2023**',
      'flexxus123',
      'admin123',
      'SuperAdmin123',
      'cv@flexxus.com',
      '123456'
    ];

    console.log('\n🔑 Probando contraseñas...');
    for (const password of testPasswords) {
      try {
        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log(`Password "${password}": ${isValid ? '✅ VÁLIDA' : '❌ inválida'}`);
        if (isValid) {
          console.log(`\n🎉 Contraseña correcta encontrada: "${password}"`);
          break;
        }
      } catch (error) {
        console.log(`Password "${password}": ❌ error - ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

testLogin()
  .then(() => {
    console.log('\n🏁 Prueba completada!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });