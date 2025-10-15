const CryptoJS = require('crypto-js');

const BASE_KEY = 'flexxus_flow_omni_2024';
const ENCRYPTION_PREFIX = '__encrypted__';
const NEW_TOKEN = 'EAAKTrzWzTJIBPuAN02ujhC2C8xu1de0uyFmue91fYeW0Qi7pWHYZAOPrqCAsVKGeK2P7jUEBP5N2TGPlme2rJa2n0XX1Pw74FEjj9tVNXPnO0hccsmMnWlOHZCx6PSUBxX4EHZCX1qSRe1t0YzsLYNPEdPLejRNeM44IseRtFoDo4LaE3nHDvuitZC5nP8XINQyojOGr1itWZBdp3w2yzEqvK7lwW47OyZCOb92i0szCGW3LpvAdFEVjebBVFEngZDZD';

// Generar clave de encriptación
const encryptionKey = CryptoJS.SHA256(BASE_KEY).toString();

// Encriptar el token
const encrypted = CryptoJS.AES.encrypt(NEW_TOKEN, encryptionKey).toString();

// Agregar prefijo
const finalValue = ENCRYPTION_PREFIX + encrypted;

console.log('Encrypted token:');
console.log(finalValue);
