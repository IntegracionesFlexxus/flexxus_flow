/**
 * Script para probar la conexión SMTP del canal de email
 */

const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configuración de la base de datos
const pool = new Pool({
  host: '10.250.0.68',
  port: 5003,
  database: 'flexxus_omni',
  user: 'flexxus',
  password: 'Flexxus2023**'
});

// Función para desencriptar (usando crypto-js como en el frontend - NUEVA VERSION FIJA)
function decrypt(encryptedText) {
  if (!encryptedText || !encryptedText.startsWith('__encrypted__')) {
    return encryptedText;
  }

  try {
    const CryptoJS = require('crypto-js');
    const encrypted = encryptedText.replace('__encrypted__', '');

    // Usar la NUEVA clave fija (sin timestamp ni userAgent)
    const baseKey = process.env.REACT_APP_ENCRYPTION_KEY || 'flexxus_flow_omni_2024';
    const encryptionKey = CryptoJS.SHA256(baseKey).toString();

    try {
      const decrypted = CryptoJS.AES.decrypt(encrypted, encryptionKey);
      const result = decrypted.toString(CryptoJS.enc.Utf8);

      if (result && result.length > 0) {
        console.log('✅ Contraseña desencriptada con NUEVA clave fija');
        return result;
      }
    } catch (e) {
      console.log('⚠️  No se pudo desencriptar con la nueva clave fija');
    }

    // Intentar con el formato ANTIGUO (por retrocompatibilidad)
    console.log('⚠️  Intentando con formato antiguo (fecha/useragent)...');
    const dates = [
      new Date().toISOString().split('T')[0], // Hoy
      new Date(Date.now() - 86400000).toISOString().split('T')[0], // Ayer
      new Date(Date.now() - 172800000).toISOString().split('T')[0], // Anteayer
    ];

    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0',
      ''
    ];

    for (const date of dates) {
      for (const ua of userAgents) {
        try {
          const keyString = `${baseKey}_${ua}_${date}`;
          const oldEncryptionKey = CryptoJS.SHA256(keyString).toString();
          const decrypted = CryptoJS.AES.decrypt(encrypted, oldEncryptionKey);
          const result = decrypted.toString(CryptoJS.enc.Utf8);

          if (result && result.length > 0) {
            console.log('✅ Contraseña desencriptada con clave ANTIGUA');
            console.log('   Fecha:', date);
            console.log('   ⚠️  ADVERTENCIA: Esta contraseña fue encriptada con el sistema antiguo');
            console.log('   ⚠️  Necesitas re-configurar el canal para usar la nueva encriptación');
            return result;
          }
        } catch (e) {
          // Continuar
        }
      }
    }

    console.error('❌ No se pudo desencriptar con ningún método');
    return null;
  } catch (error) {
    console.error('Error al desencriptar:', error.message);
    return null;
  }
}

async function testEmailConnection() {
  try {
    console.log('🔍 Obteniendo configuración del canal de email...\n');

    // Obtener configuración del canal
    const result = await pool.query(`
      SELECT c.id, c.name, c.configuration, e.*
      FROM channels c
      LEFT JOIN email_channels e ON c.id = e.channel_id
      WHERE c.channel_type = 'email'
      ORDER BY c.created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ No se encontró ningún canal de email configurado');
      await pool.end();
      return;
    }

    const channel = result.rows[0];
    console.log('📧 Canal encontrado:', channel.name);
    console.log('📊 Estado de salud:', channel.health_status || 'unknown');
    console.log('');

    // Obtener credenciales
    const smtpHost = channel.smtp_host;
    const smtpPort = channel.smtp_port;
    const smtpUser = channel.smtp_user;
    const encryptedPassword = channel.smtp_password;

    console.log('🔐 Configuración SMTP:');
    console.log('   Host:', smtpHost);
    console.log('   Port:', smtpPort);
    console.log('   User:', smtpUser);
    console.log('   Password:', encryptedPassword ? 'Encriptada (desencriptando...)' : 'NO CONFIGURADA');
    console.log('');

    // Desencriptar contraseña
    const smtpPassword = decrypt(encryptedPassword);

    if (!smtpPassword) {
      console.log('❌ No se pudo desencriptar la contraseña');
      await pool.end();
      return;
    }

    console.log('✅ Contraseña desencriptada exitosamente');
    console.log('📝 Longitud de la contraseña:', smtpPassword.length, 'caracteres');
    console.log('🔑 Primeros 4 caracteres:', smtpPassword.substring(0, 4) + '...');
    console.log('');

    // Crear transporter de nodemailer
    console.log('🔌 Creando conexión SMTP...');
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true para 465, false para otros puertos
      auth: {
        user: smtpUser,
        pass: smtpPassword
      },
      tls: {
        rejectUnauthorized: false // Para desarrollo
      }
    });

    console.log('');
    console.log('🧪 Probando conexión SMTP...');
    console.log('⏱️  Esto puede tomar unos segundos...');
    console.log('');

    // Verificar conexión
    await transporter.verify();

    console.log('✅ ¡CONEXIÓN SMTP EXITOSA!');
    console.log('');
    console.log('🎉 El servidor SMTP está respondiendo correctamente');
    console.log('✅ Las credenciales son válidas');
    console.log('✅ El canal está configurado correctamente');
    console.log('');
    console.log('💡 DIAGNÓSTICO:');
    console.log('   Si estás usando Gmail, verifica que:');
    console.log('   1. Tengas habilitada la verificación en 2 pasos');
    console.log('   2. Estés usando una "Contraseña de aplicación" (App Password)');
    console.log('   3. No estés usando tu contraseña normal de Gmail');
    console.log('');
    console.log('📱 Para generar una App Password:');
    console.log('   https://myaccount.google.com/apppasswords');

  } catch (error) {
    console.log('');
    console.log('❌ ERROR EN LA CONEXIÓN SMTP');
    console.log('');
    console.log('🔴 Tipo de error:', error.code || 'UNKNOWN');
    console.log('📝 Mensaje:', error.message);
    console.log('');

    if (error.code === 'EAUTH' || error.responseCode === 535) {
      console.log('🚨 DIAGNÓSTICO: Credenciales Inválidas');
      console.log('');
      console.log('Este error significa que Google está rechazando tu contraseña.');
      console.log('');
      console.log('✅ SOLUCIÓN - Necesitas una "App Password" de Google:');
      console.log('');
      console.log('1. Ve a: https://myaccount.google.com/apppasswords');
      console.log('2. Genera una nueva contraseña de aplicación');
      console.log('3. Copia la contraseña de 16 caracteres (sin espacios)');
      console.log('4. Actualiza el canal en la aplicación con esta nueva contraseña');
      console.log('');
      console.log('⚠️  NO uses tu contraseña normal de Gmail');
      console.log('⚠️  DEBES tener habilitada la verificación en 2 pasos');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      console.log('🚨 DIAGNÓSTICO: Problema de Red/Firewall');
      console.log('   - El servidor SMTP no responde');
      console.log('   - Puede estar bloqueado por firewall');
      console.log('   - Verifica la conexión a internet');
    } else {
      console.log('🚨 DIAGNÓSTICO: Error Desconocido');
      console.log('   Detalles completos del error:');
      console.log(error);
    }
  } finally {
    await pool.end();
  }
}

// Ejecutar test
testEmailConnection();
