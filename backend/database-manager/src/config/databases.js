// Configuración de bases de datos
// TODO: Mover credenciales a .env en Nivel 2

const DB_CONFIG = {
  // Base de datos compartida para usuarios y empresas
  shared: {
    host: 'localhost',
    port: 5432,
    database: 'flexxus_shared',
    user: 'flexxus_user',
    password: 'flexxus_pass_123', // TODO: Mover a .env en Nivel 2
    max: 20, // máximo de conexiones en el pool
    min: 5,  // mínimo de conexiones en el pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  },
  
  // Base de datos para omnicanalidad
  omni: {
    host: 'localhost',
    port: 5432,
    database: 'flexxus_omni',
    user: 'flexxus_user',
    password: 'flexxus_pass_123', // TODO: Mover a .env en Nivel 2
    max: 15,
    min: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  },
  
  // Base de datos para CRM
  crm: {
    host: 'localhost',
    port: 5432,
    database: 'flexxus_crm',
    user: 'flexxus_user',
    password: 'flexxus_pass_123', // TODO: Mover a .env en Nivel 2
    max: 15,
    min: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  },
  
  // Base de datos para workflows
  workflow: {
    host: 'localhost',
    port: 5432,
    database: 'flexxus_workflow',
    user: 'flexxus_user',
    password: 'flexxus_pass_123', // TODO: Mover a .env en Nivel 2
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  },
  
  // Base de datos para analytics
  analytics: {
    host: 'localhost',
    port: 5432,
    database: 'flexxus_analytics',
    user: 'flexxus_user',
    password: 'flexxus_pass_123', // TODO: Mover a .env en Nivel 2
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  }
};

module.exports = { DB_CONFIG };