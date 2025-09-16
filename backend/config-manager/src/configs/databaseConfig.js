const envLoader = require('../loaders/envLoader');

// Configuración de bases de datos
class DatabaseConfig {
  constructor() {
    this.environment = envLoader.get('NODE_ENV', 'development');
    this.configs = this.loadConfigs();
  }

  // Cargar configuraciones de todas las bases de datos
  loadConfigs() {
    const databases = ['shared', 'omni', 'crm', 'workflow', 'analytics'];
    const configs = {};

    for (const db of databases) {
      configs[db] = this.loadDatabaseConfig(db);
    }

    return configs;
  }

  // Cargar configuración de una base de datos específica
  loadDatabaseConfig(name) {
    const prefix = `${name.toUpperCase()}_DB`;
    
    const config = {
      // Conexión básica
      host: envLoader.get(`${prefix}_HOST`, 'localhost'),
      port: envLoader.getNumber(`${prefix}_PORT`, 5432),
      database: envLoader.get(`${prefix}_NAME`, `flexxus_${name}`),
      user: envLoader.get(`${prefix}_USER`, 'flexxus_user'),
      password: envLoader.get(`${prefix}_PASSWORD`, ''),
      
      // SSL
      ssl: envLoader.getBoolean(`${prefix}_SSL`, false),
      
      // Pool de conexiones
      pool: {
        max: envLoader.getNumber(`${prefix}_POOL_MAX`, this.getDefaultPoolSize(name)),
        min: envLoader.getNumber(`${prefix}_POOL_MIN`, 2),
        idleTimeoutMillis: envLoader.getNumber(`${prefix}_IDLE_TIMEOUT`, 30000),
        connectionTimeoutMillis: envLoader.getNumber(`${prefix}_CONNECTION_TIMEOUT`, 5000),
        maxUses: envLoader.getNumber(`${prefix}_MAX_USES`, 7500)
      },
      
      // Opciones adicionales
      options: {
        statement_timeout: envLoader.getNumber(`${prefix}_STATEMENT_TIMEOUT`, 30000),
        query_timeout: envLoader.getNumber(`${prefix}_QUERY_TIMEOUT`, 30000),
        application_name: `${envLoader.get('APP_NAME', 'flexxus')}_${name}`
      },
      
      // Configuración específica por ambiente
      ...this.getEnvironmentSpecificConfig(name)
    };

    // Agregar string de conexión si está disponible
    const connectionString = envLoader.get(`${prefix}_CONNECTION_STRING`);
    if (connectionString) {
      config.connectionString = connectionString;
    }

    return config;
  }

  // Obtener tamaño de pool por defecto según la base de datos
  getDefaultPoolSize(name) {
    const poolSizes = {
      shared: 20,    // Más conexiones para BD compartida
      omni: 15,      // Omnicanalidad necesita varias conexiones
      crm: 15,       // CRM con tráfico moderado
      workflow: 10,  // Workflows con menos concurrencia
      analytics: 10  // Analytics principalmente lectura
    };

    return poolSizes[name] || 10;
  }

  // Configuración específica por ambiente
  getEnvironmentSpecificConfig(name) {
    const configs = {
      development: {
        logging: true,
        debug: true
      },
      production: {
        logging: false,
        debug: false,
        ssl: {
          rejectUnauthorized: true,
          ca: envLoader.get(`${name.toUpperCase()}_DB_SSL_CA`)
        }
      },
      test: {
        logging: false,
        debug: false,
        pool: {
          max: 5,
          min: 1
        }
      }
    };

    return configs[this.environment] || {};
  }

  // Obtener configuración de una base de datos
  get(name) {
    return this.configs[name];
  }

  // Obtener todas las configuraciones
  getAll() {
    return this.configs;
  }

  // Obtener configuración como objeto pg Pool
  getPgConfig(name) {
    const config = this.get(name);
    if (!config) return null;

    // Si hay connection string, usarla directamente
    if (config.connectionString) {
      return {
        connectionString: config.connectionString,
        ...config.pool,
        ssl: config.ssl
      };
    }

    // Construir configuración estándar
    return {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ...config.pool,
      ssl: config.ssl,
      application_name: config.options.application_name,
      statement_timeout: config.options.statement_timeout,
      query_timeout: config.options.query_timeout
    };
  }

  // Generar connection string
  getConnectionString(name) {
    const config = this.get(name);
    if (!config) return null;

    if (config.connectionString) {
      return config.connectionString;
    }

    const { user, password, host, port, database } = config;
    const sslMode = config.ssl ? '?sslmode=require' : '';
    
    return `postgresql://${user}:${password}@${host}:${port}/${database}${sslMode}`;
  }

  // Validar que todas las configuraciones requeridas estén presentes
  validate() {
    const errors = [];
    const requiredDatabases = ['shared']; // Por lo menos shared debe estar configurada

    for (const db of requiredDatabases) {
      const config = this.get(db);
      
      if (!config.password && !config.connectionString) {
        errors.push(`Base de datos '${db}': password requerido`);
      }
      
      if (!config.user && !config.connectionString) {
        errors.push(`Base de datos '${db}': usuario requerido`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Obtener resumen de configuración
  getSummary() {
    const summary = {};
    
    for (const [name, config] of Object.entries(this.configs)) {
      summary[name] = {
        host: config.host,
        port: config.port,
        database: config.database,
        ssl: config.ssl,
        poolSize: `${config.pool.min}-${config.pool.max}`
      };
    }

    return summary;
  }

  // Recargar configuraciones
  reload() {
    this.configs = this.loadConfigs();
  }
}

// Singleton instance
const databaseConfig = new DatabaseConfig();

module.exports = databaseConfig;