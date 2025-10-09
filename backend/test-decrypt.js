/**
 * Script rápido para probar desencriptación
 */

const CryptoJS = require('crypto-js');

// Clave fija (igual que el frontend)
const BASE_KEY = 'flexxus_flow_omni_2024';
const encryptionKey = CryptoJS.SHA256(BASE_KEY).toString();

// Texto de prueba
const testPassword = 'mi-password-de-prueba-123';

// Encriptar (como lo hace el frontend)
console.log('\n=== PRUEBA DE ENCRIPTACIÓN/DESENCRIPTACIÓN ===\n');
console.log('1. Texto original:', testPassword);

const encrypted = CryptoJS.AES.encrypt(testPassword, encryptionKey).toString();
const encryptedWithPrefix = `__encrypted__${encrypted}`;

console.log('2. Encriptado:', encryptedWithPrefix.substring(0, 50) + '...');

// Desencriptar (como lo hace el backend)
const encryptedData = encryptedWithPrefix.replace('__encrypted__', '');
const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

console.log('3. Desencriptado:', decryptedText);

// Verificar
if (decryptedText === testPassword) {
  console.log('\n✅ ¡ÉXITO! La encriptación/desencriptación funciona correctamente');
} else {
  console.log('\n❌ ERROR: No coincide');
  console.log('   Esperado:', testPassword);
  console.log('   Obtenido:', decryptedText);
}

console.log('\n');
