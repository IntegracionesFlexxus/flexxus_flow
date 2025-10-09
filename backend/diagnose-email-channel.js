/**
 * Script de Diagnóstico Completo del Canal de Email
 */

const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const CryptoJS = require('crypto-js');

// Configuración
const pool = new Pool({
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_omni',
  user: 'flexxus',
  password: 'Flexxus2023**'
});

const APP_PASSWORD = 'amjmfzmioeiwfbiv'; // La App Password correcta

console.log('═══════════════════════════════════════════════════════════════════');
console.log('🔍 DIAGNÓSTICO COMPLETO DEL CANAL DE EMAIL');
console.log('═══════════════════════════════════════════════════════════════════\n');

async function diagnosticar() {
  try {
    // PASO 1: Obtener configuración del canal
    console.log('📋 PASO 1: Obteniendo configuración del canal...\n');

    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.configuration,
        e.smtp_host,
        e.smtp_port,
        e.smtp_user,
        e.smtp_password,
        e.provider
      FROM channels c
      LEFT JOIN email_channels e ON c.id = e.channel_id
      WHERE c.channel_type = 'email'
      ORDER BY c.created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ No se encontró ningún canal de email');
      await pool.end();
      return;
    }

    const channel = result.rows[0];
    console.log('✅ Canal encontrado:');
    console.log('   ID:', channel.id);
    console.log('   Nombre:', channel.name);
    console.log('   Host:', channel.smtp_host);
    console.log('   Port:', channel.smtp_port);
    console.log('   User:', channel.smtp_user);
    console.log('   Provider:', channel.provider);
    console.log('');

    // PASO 2: Analizar contraseña almacenada
    console.log('🔐 PASO 2: Analizando contraseña almacenada...\n');

    const storedPassword = channel.smtp_password;
    console.log('Contraseña almacenada (primeros 80 chars):');
    console.log(storedPassword?.substring(0, 80) + '...');
    console.log('');

    if (!storedPassword || !storedPassword.startsWith('__encrypted__')) {
      console.log('⚠️  La contraseña NO está encriptada o tiene formato incorrecto');
      await pool.end();
      return;
    }

    console.log('✅ La contraseña tiene el prefijo __encrypted__');
    console.log('');

    // PASO 3: Intentar desencriptar con NUEVA clave
    console.log('🔑 PASO 3: Intentando desencriptar con NUEVA clave fija...\n');

    const BASE_KEY = 'flexxus_flow_omni_2024';
    const newEncryptionKey = CryptoJS.SHA256(BASE_KEY).toString();
    const encrypted = storedPassword.replace('__encrypted__', '');

    let decryptedPassword = null;

    try {
      const decrypted = CryptoJS.AES.decrypt(encrypted, newEncryptionKey);
      const result = decrypted.toString(CryptoJS.enc.Utf8);

      if (result && result.length > 0) {
        decryptedPassword = result;
        console.log('✅ DESENCRIPTACIÓN EXITOSA con clave nueva!');
        console.log('   Contraseña desencriptada:', decryptedPassword);
        console.log('   Longitud:', decryptedPassword.length, 'caracteres');
      } else {
        console.log('❌ Clave nueva: Desencriptación falló (resultado vacío)');
      }
    } catch (error) {
      console.log('❌ Clave nueva: Error al desencriptar:', error.message);
    }
    console.log('');

    // PASO 4: Si falló, intentar con ANTIGUO sistema
    if (!decryptedPassword) {
      console.log('🔄 PASO 4: Intentando con sistema ANTIGUO (fecha/useragent)...\n');

      const dates = [
        new Date().toISOString().split('T')[0],
        new Date(Date.now() - 86400000).toISOString().split('T')[0],
        new Date(Date.now() - 172800000).toISOString().split('T')[0],
      ];

      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Mozilla/5.0',
        ''
      ];

      let found = false;
      for (const date of dates) {
        for (const ua of userAgents) {
          try {
            const keyString = `${BASE_KEY}_${ua}_${date}`;
            const oldKey = CryptoJS.SHA256(keyString).toString();
            const decrypted = CryptoJS.AES.decrypt(encrypted, oldKey);
            const result = decrypted.toString(CryptoJS.enc.Utf8);

            if (result && result.length > 0) {
              decryptedPassword = result;
              console.log('✅ DESENCRIPTACIÓN EXITOSA con clave antigua!');
              console.log('   Fecha usada:', date);
              console.log('   UserAgent:', ua.substring(0, 50) + (ua.length > 50 ? '...' : ''));
              console.log('   Contraseña desencriptada:', decryptedPassword);
              console.log('   Longitud:', decryptedPassword.length, 'caracteres');
              found = true;
              break;
            }
          } catch (e) {
            // Continuar
          }
        }
        if (found) break;
      }

      if (!found) {
        console.log('❌ No se pudo desencriptar con ningún método');
      }
      console.log('');
    }

    // PASO 5: Comparar con App Password correcta
    console.log('🔍 PASO 5: Comparando con App Password correcta...\n');
    console.log('App Password correcta:', APP_PASSWORD);
    console.log('Contraseña desencriptada:', decryptedPassword || '(no se pudo desencriptar)');

    if (decryptedPassword === APP_PASSWORD) {
      console.log('✅ ¡COINCIDEN! La contraseña almacenada es correcta');
    } else {
      console.log('❌ NO COINCIDEN!');
      console.log('');
      console.log('   PROBLEMA IDENTIFICADO:');
      console.log('   La contraseña almacenada en la BD NO es la App Password correcta');
      console.log('   Necesitas ACTUALIZAR el canal con la App Password correcta');
    }
    console.log('');

    // PASO 6: Probar conexión SMTP con la contraseña desencriptada
    if (decryptedPassword) {
      console.log('🧪 PASO 6: Probando conexión SMTP con contraseña DESENCRIPTADA...\n');

      try {
        const transporter = nodemailer.createTransport({
          host: channel.smtp_host,
          port: channel.smtp_port,
          secure: channel.smtp_port === 465,
          auth: {
            user: channel.smtp_user,
            pass: decryptedPassword
          }
        });

        await transporter.verify();
        console.log('✅ ¡CONEXIÓN SMTP EXITOSA con contraseña desencriptada!');
      } catch (error) {
        console.log('❌ Conexión SMTP FALLÓ con contraseña desencriptada:');
        console.log('   Error:', error.message);
        console.log('   Código:', error.code);
      }
      console.log('');
    }

    // PASO 7: Probar conexión SMTP con App Password correcta
    console.log('🧪 PASO 7: Probando conexión SMTP con App Password CORRECTA...\n');

    try {
      const transporter = nodemailer.createTransport({
        host: channel.smtp_host,
        port: channel.smtp_port,
        secure: channel.smtp_port === 465,
        auth: {
          user: channel.smtp_user,
          pass: APP_PASSWORD
        }
      });

      await transporter.verify();
      console.log('✅ ¡CONEXIÓN SMTP EXITOSA con App Password correcta!');
      console.log('');
      console.log('🎯 CONCLUSIÓN:');
      console.log('   La App Password es válida y Google la acepta.');
      console.log('   El problema es que la BD tiene una contraseña diferente.');
      console.log('');
      console.log('💡 SOLUCIÓN:');
      console.log('   1. Elimina el canal actual');
      console.log('   2. Crea un nuevo canal');
      console.log('   3. Usa la App Password:', APP_PASSWORD);
    } catch (error) {
      console.log('❌ Conexión SMTP FALLÓ con App Password correcta:');
      console.log('   Error:', error.message);
      console.log('   Código:', error.code);
      console.log('');
      console.log('🎯 CONCLUSIÓN:');
      console.log('   Hay un problema con la App Password o la configuración de Gmail.');
      console.log('');
      console.log('💡 VERIFICA:');
      console.log('   1. La App Password es correcta: ' + APP_PASSWORD);
      console.log('   2. Verificación en 2 pasos está habilitada en tu cuenta Google');
      console.log('   3. La App Password no fue revocada');
      console.log('   4. Genera una NUEVA App Password si es necesario');
    }
    console.log('');

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar diagnóstico
diagnosticar().then(() => {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('Diagnóstico completado');
  console.log('═══════════════════════════════════════════════════════════════════');
});
