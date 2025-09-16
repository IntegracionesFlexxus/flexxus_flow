// Entry point para el módulo de gestión de bases de datos
const connectionManager = require('./connections/ConnectionManager');
const healthCheckService = require('./utils/healthCheck');
const BaseRepository = require('./repositories/BaseRepository');
const UserRepository = require('./repositories/UserRepository');
const CompanyRepository = require('./repositories/CompanyRepository');

// Función de inicialización
async function initialize() {
  try {
    console.log('=== Inicializando Database Manager ===');
    
    // Inicializar conexiones
    await connectionManager.initialize();
    
    // Verificar health de todas las conexiones
    const health = await healthCheckService.check();
    console.log(`\n✓ Estado general: ${health.overall}`);
    console.log(`✓ Bases de datos saludables: ${health.summary.healthy}/${health.summary.total}`);
    
    // Iniciar monitoreo (opcional)
    // TODO: Configurar intervalo desde .env en Nivel 2
    const MONITORING_ENABLED = false; 
    if (MONITORING_ENABLED) {
      healthCheckService.startMonitoring(30000);
    }
    
    console.log('\n=== Database Manager listo ===\n');
    
    return true;
  } catch (error) {
    console.error('✗ Error inicializando Database Manager:', error.message);
    throw error;
  }
}

// Función para cerrar todas las conexiones
async function shutdown() {
  try {
    console.log('\n=== Cerrando Database Manager ===');
    
    // Detener monitoreo si está activo
    healthCheckService.stopMonitoring();
    
    // Cerrar todas las conexiones
    await connectionManager.closeAll();
    
    console.log('=== Database Manager cerrado ===\n');
  } catch (error) {
    console.error('✗ Error cerrando Database Manager:', error.message);
    throw error;
  }
}

// Manejadores de señales para cerrar conexiones
process.on('SIGINT', async () => {
  console.log('\n✓ SIGINT recibido');
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n✓ SIGTERM recibido');
  await shutdown();
  process.exit(0);
});

// Exportar todo lo necesario
module.exports = {
  // Core
  connectionManager,
  healthCheckService,
  
  // Repositories
  BaseRepository,
  UserRepository,
  CompanyRepository,
  
  // Funciones principales
  initialize,
  shutdown,
  
  // Helper para obtener conexión directa
  getConnection: (name) => connectionManager.getConnection(name),
  
  // Helper para query directo
  query: (database, text, params) => connectionManager.query(database, text, params),
  
  // Helper para transacciones
  transaction: (database, callback) => connectionManager.transaction(database, callback)
};