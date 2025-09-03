// Script de prueba para el sistema de logging
const logging = require('./index');
const express = require('express');

async function testLoggingSystem() {
  console.log('=== Probando Sistema de Logging ===\n');

  try {
    // 1. Logs básicos
    console.log('1. Probando niveles de log básicos...');
    
    logging.error('Error de prueba', new Error('Algo salió mal'), {
      userId: 123,
      action: 'test'
    });
    
    logging.warn('Advertencia de prueba', {
      threshold: 100,
      current: 150
    });
    
    logging.info('Información de prueba', {
      event: 'test_started'
    });
    
    logging.debug('Debug de prueba', {
      details: 'información detallada'
    });
    
    console.log('✓ Logs básicos funcionando\n');

    // 2. Logs especializados
    console.log('2. Probando logs especializados...');
    
    // Performance
    const timer = logging.startTimer('operacion_lenta');
    await new Promise(resolve => setTimeout(resolve, 100));
    timer.end({ result: 'success' });
    
    // Auditoría
    logging.audit('CREATE_USER', 'user:456', 'success', {
      admin: 'admin@example.com',
      ip: '192.168.1.1'
    });
    
    // Base de datos
    logging.database('SELECT', 'SELECT * FROM users WHERE active = true', 45, {
      rows: 10
    });
    
    // Seguridad
    logging.security('FAILED_LOGIN_ATTEMPT', {
      username: 'user@example.com',
      ip: '192.168.1.100',
      attempts: 3
    });
    
    console.log('✓ Logs especializados funcionando\n');

    // 3. Múltiples loggers
    console.log('3. Probando múltiples categorías de logger...');
    
    const authLogger = logging.getLogger('auth');
    authLogger.info('Usuario autenticado', { userId: 789 });
    
    const apiLogger = logging.getLogger('api');
    apiLogger.warn('Rate limit alcanzado', { 
      endpoint: '/api/users',
      limit: 100 
    });
    
    console.log('✓ Múltiples loggers funcionando\n');

    // 4. Child logger con contexto
    console.log('4. Probando child logger con contexto...');
    
    const requestLogger = logging.createLogger('request', {
      requestId: 'req-123',
      sessionId: 'sess-456'
    });
    
    requestLogger.info('Procesando request');
    requestLogger.error('Error en request', new Error('Validation failed'));
    
    console.log('✓ Child logger funcionando\n');

    // 5. Express middleware (simulación)
    console.log('5. Configurando Express middleware...');
    
    const app = express();
    
    // Configurar logging para Express
    logging.setupExpress(app, {
      morgan: { format: 'combined' },
      audit: { actions: ['POST', 'PUT', 'DELETE'] },
      performance: true
    });
    
    console.log('✓ Express middleware configurado\n');

    // 6. Estadísticas de logs
    console.log('6. Obteniendo estadísticas de logs...');
    
    const stats = logging.getStats();
    if (stats) {
      console.log(`  Total de archivos: ${stats.total}`);
      console.log(`  Tamaño total: ${(stats.totalSize / 1024).toFixed(2)} KB`);
    }
    console.log();

    // 7. Performance timing
    console.log('7. Probando medición de performance...');
    
    // Operación rápida
    const quickTimer = logging.startTimer('quick_operation');
    await new Promise(resolve => setTimeout(resolve, 10));
    quickTimer.end();
    
    // Operación lenta
    const slowTimer = logging.startTimer('slow_operation');
    await new Promise(resolve => setTimeout(resolve, 200));
    slowTimer.end({ warning: 'operación lenta' });
    
    console.log('✓ Medición de performance funcionando\n');

    // 8. Manejo de errores
    console.log('8. Probando manejo de errores...');
    
    // Error con stack trace
    try {
      throw new Error('Error intencional para prueba');
    } catch (error) {
      logging.error('Error capturado', error, {
        module: 'test',
        severity: 'high'
      });
    }
    
    // Error personalizado
    const customError = new Error('Custom error');
    customError.code = 'ERR_CUSTOM';
    customError.statusCode = 400;
    logging.error('Error personalizado', customError);
    
    console.log('✓ Manejo de errores funcionando\n');

    // 9. Logs con metadata compleja
    console.log('9. Probando logs con metadata compleja...');
    
    logging.info('Operación compleja completada', {
      user: {
        id: 123,
        email: 'user@example.com',
        roles: ['admin', 'user']
      },
      request: {
        method: 'POST',
        path: '/api/orders',
        body: { items: 3, total: 150.50 }
      },
      response: {
        status: 201,
        time: 145
      },
      metadata: {
        version: '1.0.0',
        environment: 'test'
      }
    });
    
    console.log('✓ Metadata compleja funcionando\n');

    // 10. Batch de operaciones
    console.log('10. Probando batch de operaciones...');
    
    const operations = ['op1', 'op2', 'op3', 'op4', 'op5'];
    
    for (const op of operations) {
      const timer = logging.startTimer(op);
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      timer.end({ index: operations.indexOf(op) });
    }
    
    console.log('✓ Batch de operaciones completado\n');

    console.log('=== Todas las pruebas completadas exitosamente ===\n');

    // Esperar un momento para que se escriban todos los logs
    await new Promise(resolve => setTimeout(resolve, 1000));

  } catch (error) {
    console.error('✗ Error en las pruebas:', error);
    logging.error('Test failed', error);
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  testLoggingSystem().then(() => {
    console.log('\nPuedes revisar los logs en el directorio ./logs/');
    process.exit(0);
  });
}

module.exports = testLoggingSystem;