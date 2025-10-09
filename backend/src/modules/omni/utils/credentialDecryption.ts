/**
 * Credential Decryption Utility
 * Desencripta credenciales que fueron encriptadas desde el frontend
 */

import * as CryptoJS from 'crypto-js';

/**
 * Configuración de encriptación (debe coincidir con el frontend)
 */
const ENCRYPTION_PREFIX = '__encrypted__';
const BASE_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'flexxus_flow_omni_2024';

/**
 * Desencripta un valor que fue encriptado por el frontend
 * @param encryptedValue Valor encriptado con prefijo __encrypted__
 * @returns Valor desencriptado o el valor original si no estaba encriptado
 */
export function decryptCredential(encryptedValue: string | null | undefined): string {
  if (!encryptedValue) {
    return '';
  }

  // Si no está encriptado, retornar tal cual
  if (!encryptedValue.startsWith(ENCRYPTION_PREFIX)) {
    return encryptedValue;
  }

  try {
    // Remover prefijo
    const encrypted = encryptedValue.substring(ENCRYPTION_PREFIX.length);

    // Generar clave (NUEVA versión fija, sin timestamp ni useragent)
    const encryptionKey = CryptoJS.SHA256(BASE_KEY).toString();

    // Desencriptar
    const decrypted = CryptoJS.AES.decrypt(encrypted, encryptionKey);
    let result = decrypted.toString(CryptoJS.enc.Utf8);

    if (result && result.length > 0) {
      // ⚠️ PROTECCIÓN CONTRA DOBLE ENCRIPTACIÓN
      // Si el resultado TODAVÍA tiene el prefijo __encrypted__, desencriptar de nuevo
      if (result.startsWith(ENCRYPTION_PREFIX)) {
        console.warn('[credentialDecryption] ⚠️  DOBLE ENCRIPTACIÓN DETECTADA - Desencriptando segunda vez');
        const doubleEncrypted = result.substring(ENCRYPTION_PREFIX.length);
        const secondDecryption = CryptoJS.AES.decrypt(doubleEncrypted, encryptionKey);
        const secondResult = secondDecryption.toString(CryptoJS.enc.Utf8);

        if (secondResult && secondResult.length > 0) {
          console.warn('[credentialDecryption] ✅ Doble desencriptación exitosa - RECOMIENDA RECREAR EL CANAL');
          return secondResult;
        }
      }

      return result;
    }

    // Si falla con la nueva clave, intentar con formato antiguo (retrocompatibilidad)
    console.warn('[credentialDecryption] No se pudo desencriptar con la nueva clave, intentando con formato antiguo');
    return decryptWithLegacyMethod(encrypted);
  } catch (error) {
    console.error('[credentialDecryption] Error al desencriptar:', error);
    return '';
  }
}

/**
 * Intenta desencriptar usando el método antiguo (con fecha y useragent)
 * Solo para retrocompatibilidad con credenciales antiguas
 */
function decryptWithLegacyMethod(encrypted: string): string {
  // Probar con diferentes fechas (hoy, ayer, 2 días atrás)
  const dates = [
    new Date().toISOString().split('T')[0],
    new Date(Date.now() - 86400000).toISOString().split('T')[0],
    new Date(Date.now() - 172800000).toISOString().split('T')[0],
  ];

  // User agents comunes
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Mozilla/5.0',
    ''
  ];

  for (const date of dates) {
    for (const ua of userAgents) {
      try {
        const keyString = `${BASE_KEY}_${ua}_${date}`;
        const legacyKey = CryptoJS.SHA256(keyString).toString();
        const decrypted = CryptoJS.AES.decrypt(encrypted, legacyKey);
        const result = decrypted.toString(CryptoJS.enc.Utf8);

        if (result && result.length > 0) {
          console.warn('[credentialDecryption] ⚠️  Credencial desencriptada con método antiguo - Recomienda re-configurar el canal');
          return result;
        }
      } catch (e) {
        // Continuar con la siguiente combinación
      }
    }
  }

  console.error('[credentialDecryption] No se pudo desencriptar con ningún método');
  return '';
}

/**
 * Verifica si un valor está encriptado
 */
export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith(ENCRYPTION_PREFIX);
}

/**
 * Desencripta todos los campos sensibles en un objeto de configuración
 */
export function decryptConfiguration(config: any): any {
  if (!config || typeof config !== 'object') {
    return config;
  }

  const decrypted = { ...config };

  // Campos comunes que suelen estar encriptados
  const sensitiveFields = [
    'accessToken',
    'apiKey',
    'apiSecret',
    'authToken',
    'smtpPassword',
    'pageAccessToken',
    'appSecret',
    'webhookVerifyToken',
    'password',
    'secret',
    'token'
  ];

  for (const field of sensitiveFields) {
    if (field in decrypted && typeof decrypted[field] === 'string') {
      decrypted[field] = decryptCredential(decrypted[field]);
    }
  }

  return decrypted;
}
