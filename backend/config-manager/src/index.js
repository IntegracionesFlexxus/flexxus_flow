// Entry point para el Configuration Manager
const envLoader = require('./loaders/envLoader');
const configValidator = require('./validators/configValidator');
const serverConfig = require('./configs/serverConfig');
const databaseConfig = require('./configs/databaseConfig');
const securityConfig = require('./configs/securityConfig');

// Clase principal del Configuration Manager
class ConfigManager {
  constructor() {
    this.initialized = false;
    this.configs = {};
    this.validationResult = null;
  }

  // Inicializar el Configuration Manager
  initialize() {
    if (this.initialized) {
      console.log('✓ Configuration Manager ya inicializado');
      return this.configs;
    }

    console.log('=== Inicializando Configuration Manager ===\n');

    // Cargar variables de entorno
    console.log('1. Cargando variables de entorno...');
    envLoader.load();
    
    // Validar configuración mínima
    console.log('2. Validando configuración mínima...');
    const minimumCheck = configValidator.validateMinimum(process.env);
    
    if (!minimumCheck.valid) {
      console.error('✗ Variables requeridas faltantes:', minimumCheck.missing);
      throw new Error(`Variables de entorno requeridas faltantes: ${minimumCheck.missing.join(', ')}`);
    }

    // Validar configuración completa
    console.log('3. Validando configuración completa...');
    this.validationResult = configValidator.validateAll(process.env);
    
    if (!this.validationResult.valid) {
      console.error('✗ Errores de validación encontrados:');
      console.error(configValidator.generateReport());
      
      // En desarrollo, solo mostrar warnings
      if (!envLoader.isDevelopment()) {
        throw new Error('Configuración inválida. Ver errores arriba.');
      }
    }

    // Mostrar warnings si existen
    if (this.validationResult.warnings.length > 0) {
      console.warn('\n⚠ Advertencias de configuración:');
      this.validationResult.warnings.forEach(w => {
        console.warn(`  - ${w.section}: ${w.message}`);
      });
    }

    // Cargar todas las configuraciones
    console.log('\n4. Cargando configuraciones...');
    this.configs = {
      server: serverConfig.getAll(),
      databases: databaseConfig.getAll(),
      security: securityConfig.getAll(),
      environment: envLoader.get('NODE_ENV', 'development')
    };

    this.initialized = true;
    console.log('\n✓ Configuration Manager inicializado correctamente');
    console.log(`✓ Ambiente: ${this.configs.environment}\n`);

    return this.configs;
  }

  // Obtener toda la configuración
  getAll() {
    if (!this.initialized) {
      this.initialize();
    }
    return this.configs;
  }

  // Obtener configuración específica
  get(section) {
    if (!this.initialized) {
      this.initialize();
    }
    return this.configs[section];
  }

  // Obtener configuración del servidor
  getServer() {
    return serverConfig.getAll();
  }

  // Obtener configuración de base de datos
  getDatabase(name) {
    return databaseConfig.get(name);
  }

  // Obtener configuración de seguridad
  getSecurity() {
    return securityConfig.getAll();
  }

  // Obtener variable de entorno
  getEnv(key, defaultValue) {
    return envLoader.get(key, defaultValue);
  }

  // Verificar si estamos en desarrollo
  isDevelopment() {
    return envLoader.isDevelopment();
  }

  // Verificar si estamos en producción
  isProduction() {
    return envLoader.isProduction();
  }

  // Verificar si estamos en test
  isTest() {
    return envLoader.isTest();
  }

  // Verificar si una feature está habilitada
  isFeatureEnabled(feature) {
    return serverConfig.isFeatureEnabled(feature);
  }

  // Obtener resumen de configuración
  getSummary() {
    if (!this.initialized) {
      this.initialize();
    }

    return {
      environment: this.configs.environment,
      server: serverConfig.getSummary(),
      databases: databaseConfig.getSummary(),
      security: securityConfig.getSummary(),
      validation: {
        valid: this.validationResult?.valid || false,
        errors: this.validationResult?.errors.length || 0,
        warnings: this.validationResult?.warnings.length || 0
      }
    };
  }

  // Recargar configuración
  reload() {
    console.log('Recargando configuración...');
    
    this.initialized = false;
    envLoader.reload();
    serverConfig.reload();
    databaseConfig.reload();
    
    return this.initialize();
  }

  // Validar configuración actual
  validate() {
    return configValidator.validateAll(process.env);
  }

  // Exportar configuración (sin valores sensibles)
  export() {
    const summary = this.getSummary();
    
    // Remover información sensible
    delete summary.security.jwt;
    delete summary.databases;
    
    return {
      ...summary,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}

// Singleton instance
const configManager = new ConfigManager();

// Exportar todo lo necesario
module.exports = {
  // Instance principal
  configManager,
  
  // Acceso directo a componentes
  envLoader,
  configValidator,
  serverConfig,
  databaseConfig,
  securityConfig,
  
  // Funciones helper
  initialize: () => configManager.initialize(),
  getConfig: (section) => configManager.get(section),
  getEnv: (key, defaultValue) => configManager.getEnv(key, defaultValue),
  isProduction: () => configManager.isProduction(),
  isDevelopment: () => configManager.isDevelopment(),
  isTest: () => configManager.isTest(),
  isFeatureEnabled: (feature) => configManager.isFeatureEnabled(feature),
  reload: () => configManager.reload(),
  validate: () => configManager.validate(),
  getSummary: () => configManager.getSummary()
};