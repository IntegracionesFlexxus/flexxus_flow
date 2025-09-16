const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Clase para cargar variables de entorno
class EnvLoader {
  constructor() {
    this.loaded = false;
    this.environment = process.env.NODE_ENV || 'development';
  }

  // Cargar variables de entorno
  load() {
    if (this.loaded) {
      console.log('✓ Variables de entorno ya cargadas');
      return;
    }

    // Determinar archivo .env según ambiente
    const envFiles = [
      `.env.${this.environment}.local`,
      `.env.${this.environment}`,
      '.env.local',
      '.env'
    ];

    // Buscar y cargar el primer archivo que exista
    let envFileLoaded = false;
    for (const envFile of envFiles) {
      const envPath = path.resolve(process.cwd(), envFile);
      
      if (fs.existsSync(envPath)) {
        const result = dotenv.config({ path: envPath });
        
        if (result.error) {
          console.error(`✗ Error cargando ${envFile}:`, result.error.message);
        } else {
          console.log(`✓ Variables cargadas desde ${envFile}`);
          envFileLoaded = true;
          break;
        }
      }
    }

    if (!envFileLoaded) {
      console.warn('⚠ No se encontró archivo .env, usando valores por defecto');
    }

    this.loaded = true;
    
    // Log del ambiente actual
    console.log(`✓ Ambiente: ${this.environment}`);
  }

  // Obtener variable de entorno con valor por defecto
  get(key, defaultValue = null) {
    return process.env[key] || defaultValue;
  }

  // Obtener variable de entorno requerida
  getRequired(key) {
    const value = process.env[key];
    
    if (!value) {
      throw new Error(`Variable de entorno requerida '${key}' no está definida`);
    }
    
    return value;
  }

  // Obtener variable como número
  getNumber(key, defaultValue = 0) {
    const value = this.get(key, defaultValue);
    const number = Number(value);
    
    if (isNaN(number)) {
      console.warn(`⚠ Variable '${key}' no es un número válido, usando default: ${defaultValue}`);
      return defaultValue;
    }
    
    return number;
  }

  // Obtener variable como booleano
  getBoolean(key, defaultValue = false) {
    const value = this.get(key);
    
    if (value === null || value === undefined) {
      return defaultValue;
    }
    
    return value.toLowerCase() === 'true' || value === '1';
  }

  // Obtener variable como array
  getArray(key, separator = ',', defaultValue = []) {
    const value = this.get(key);
    
    if (!value) {
      return defaultValue;
    }
    
    return value.split(separator).map(item => item.trim()).filter(Boolean);
  }

  // Verificar si estamos en desarrollo
  isDevelopment() {
    return this.environment === 'development';
  }

  // Verificar si estamos en producción
  isProduction() {
    return this.environment === 'production';
  }

  // Verificar si estamos en test
  isTest() {
    return this.environment === 'test';
  }

  // Obtener todas las variables que empiezan con un prefijo
  getByPrefix(prefix) {
    const result = {};
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(prefix)) {
        result[key] = value;
      }
    }
    
    return result;
  }

  // Recargar variables de entorno
  reload() {
    this.loaded = false;
    this.load();
  }

  // Obtener resumen de configuración (sin valores sensibles)
  getSummary() {
    return {
      environment: this.environment,
      loaded: this.loaded,
      variables: {
        total: Object.keys(process.env).length,
        custom: Object.keys(process.env).filter(key => 
          !key.startsWith('npm_') && 
          !key.startsWith('NODE_') &&
          key !== 'PATH'
        ).length
      }
    };
  }
}

// Singleton instance
const envLoader = new EnvLoader();

module.exports = envLoader;