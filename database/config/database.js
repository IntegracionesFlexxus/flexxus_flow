// ============================================
// Módulo de Conexión a Base de Datos
// Nivel 1 - MVP Funcional Mínimo
// ============================================

const { Pool } = require('pg');

// Configuración de conexiones
// TODO: Mover estas variables a .env en Nivel 2
const DB_CONFIG = {
  // Credenciales comunes
  user: 'flexxus_app',           // TODO: Variable de entorno DB_USER
  password: 'app_password_123',   // TODO: Variable de entorno DB_PASSWORD
  host: 'localhost',              // TODO: Variable de entorno DB_HOST
  port: 5432,                     // TODO: Variable de entorno DB_PORT
  
  // Configuración del pool
  max: 20,                        // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000,       // Tiempo antes de cerrar conexión idle
  connectionTimeoutMillis: 2000,   // Timeout para establecer conexión
};

// Crear pools para cada base de datos
const pools = {
  shared: new Pool({
    ...DB_CONFIG,
    database: 'flexxus_shared'    // TODO: Variable de entorno DB_NAME_SHARED
  }),
  
  omni: new Pool({
    ...DB_CONFIG,
    database: 'flexxus_omni'      // TODO: Variable de entorno DB_NAME_OMNI
  }),
  
  crm: new Pool({
    ...DB_CONFIG,
    database: 'flexxus_crm'  // TODO: Variable de entorno DB_NAME_CRM
  }),
  
  workflow: new Pool({
    ...DB_CONFIG,
    database: 'flexxus_workflow' // TODO: Variable de entorno DB_NAME_WORKFLOW
  }),
  
  analytics: new Pool({
    ...DB_CONFIG,
    database: 'flexxus_analytics' // TODO: Variable de entorno DB_NAME_ANALYTICS
  })
};

// Función helper para obtener conexión
async function getConnection(database = 'shared') {
  if (!pools[database]) {
    throw new Error(`Base de datos '${database}' no configurada`);
  }
  
  try {
    const client = await pools[database].connect();
    return client;
  } catch (error) {
    console.error(`Error conectando a ${database}:`, error.message);
    throw error;
  }
}

// Función para ejecutar queries simples
async function query(sql, params = [], database = 'shared') {
  const client = await getConnection(database);
  
  try {
    const result = await client.query(sql, params);
    return result;
  } catch (error) {
    console.error('Error en query:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Función para transacciones
async function transaction(callback, database = 'shared') {
  const client = await getConnection(database);
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error en transacción:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

// Función para verificar conexión
async function checkConnection(database = 'shared') {
  try {
    const result = await query('SELECT NOW()', [], database);
    console.log(`✓ Conexión a ${database} exitosa:`, result.rows[0].now);
    return true;
  } catch (error) {
    console.error(`✗ Error conectando a ${database}:`, error.message);
    return false;
  }
}

// Función para cerrar todas las conexiones
async function closeAll() {
  const promises = Object.entries(pools).map(async ([name, pool]) => {
    try {
      await pool.end();
      console.log(`✓ Pool ${name} cerrado`);
    } catch (error) {
      console.error(`Error cerrando pool ${name}:`, error.message);
    }
  });
  
  await Promise.all(promises);
}

// Helper para queries con company_id (multi-tenancy básico)
async function queryWithCompany(sql, params = [], companyId, database = 'shared') {
  // Agregar company_id como primer parámetro si no está
  const modifiedSql = sql.includes('$1') ? sql : sql.replace('WHERE', 'WHERE company_id = $1 AND');
  const modifiedParams = [companyId, ...params];
  
  return query(modifiedSql, modifiedParams, database);
}

// Exportar funciones
module.exports = {
  getConnection,
  query,
  transaction,
  checkConnection,
  closeAll,
  queryWithCompany,
  
  // Exportar pools por si se necesita acceso directo
  pools
};

// Verificar conexiones al cargar el módulo (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
  console.log('🔌 Verificando conexiones a bases de datos...');
  
  // Verificar cada base de datos
  Promise.all([
    checkConnection('shared'),
    checkConnection('crm'),
    // Comentadas para no sobrecargar en desarrollo
    // checkConnection('omni'),
    // checkConnection('notificaciones'),
    // checkConnection('organizaciones')
  ]).then(() => {
    console.log('✅ Todas las conexiones verificadas');
  }).catch(error => {
    console.error('❌ Error verificando conexiones:', error);
  });
}

// Manejar cierre limpio
process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando conexiones a base de datos...');
  await closeAll();
  process.exit(0);
});