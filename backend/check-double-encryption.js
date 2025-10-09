const { Pool } = require('pg');
const CryptoJS = require('crypto-js');

const pool = new Pool({
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_omni',
  user: 'flexxus',
  password: 'Flexxus2023**'
});

const ENCRYPTION_PREFIX = '__encrypted__';
const BASE_KEY = 'flexxus_flow_omni_2024';
const CORRECT_PASSWORD = 'amjmfzmioeiwfbiv';

async function checkDoubleEncryption() {
  try {
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🔍 DIAGNÓSTICO DE DOBLE ENCRIPTACIÓN');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    // 1. Obtener contraseña de la BD
    const result = await pool.query(`
      SELECT ec.smtp_password
      FROM email_channels ec
      JOIN channels c ON c.id = ec.channel_id
      WHERE ec.channel_id = '1f7066aa-b1ed-4947-8587-e3bbe6c06262'
    `);

    if (result.rows.length === 0) {
      console.log('❌ Canal no encontrado');
      await pool.end();
      return;
    }

    const storedPassword = result.rows[0].smtp_password;

    console.log('📦 PASO 1: Contraseña almacenada en BD');
    console.log('   - Longitud:', storedPassword.length);
    console.log('   - Primeros 100 chars:', storedPassword.substring(0, 100));
    console.log('   - Tiene prefijo __encrypted__?:', storedPassword.startsWith(ENCRYPTION_PREFIX));
    console.log('');

    // 2. Primera desencriptación
    const encryptionKey = CryptoJS.SHA256(BASE_KEY).toString();
    const encrypted1 = storedPassword.replace(ENCRYPTION_PREFIX, '');
    const decrypted1 = CryptoJS.AES.decrypt(encrypted1, encryptionKey);
    const result1 = decrypted1.toString(CryptoJS.enc.Utf8);

    console.log('🔓 PASO 2: Primera desencriptación');
    console.log('   - Resultado:', result1);
    console.log('   - Longitud:', result1.length);
    console.log('   - TODAVÍA tiene prefijo __encrypted__?:', result1.startsWith(ENCRYPTION_PREFIX));
    console.log('   - Es la App Password correcta?:', result1 === CORRECT_PASSWORD);
    console.log('');

    if (result1.startsWith(ENCRYPTION_PREFIX)) {
      console.log('⚠️  CONFIRMADO: ¡DOBLE ENCRIPTACIÓN DETECTADA!');
      console.log('');
      console.log('🔓 PASO 3: Segunda desencriptación (intentando desencriptar de nuevo)');

      try {
        const encrypted2 = result1.replace(ENCRYPTION_PREFIX, '');
        const decrypted2 = CryptoJS.AES.decrypt(encrypted2, encryptionKey);
        const result2 = decrypted2.toString(CryptoJS.enc.Utf8);

        console.log('   - Resultado:', result2);
        console.log('   - Longitud:', result2.length);
        console.log('   - Es la App Password correcta?:', result2 === CORRECT_PASSWORD);
        console.log('');

        if (result2 === CORRECT_PASSWORD) {
          console.log('✅ ÉXITO: La contraseña ORIGINAL es correcta después de desencriptar DOS VECES');
          console.log('');
          console.log('💡 SOLUCIÓN:');
          console.log('   El problema es que el frontend está encriptando DOS veces.');
          console.log('   Necesitas eliminar y recrear el canal.');
        } else {
          console.log('❌ Incluso después de dos desencriptaciones, no es la contraseña correcta');
        }
      } catch (error) {
        console.log('❌ No se pudo desencriptar por segunda vez:', error.message);
      }
    } else {
      console.log('✅ No hay doble encriptación');
      if (result1 === CORRECT_PASSWORD) {
        console.log('✅ La contraseña es correcta');
      } else {
        console.log('❌ La contraseña desencriptada no es la correcta');
        console.log('   - Esperada:', CORRECT_PASSWORD);
        console.log('   - Obtenida:', result1);
      }
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkDoubleEncryption();
