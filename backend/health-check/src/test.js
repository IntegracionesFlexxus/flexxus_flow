// Script de prueba para el sistema de Health Check
const { createHealthCheckSystem } = require('./index');

async function testHealthCheck() {
  console.log('=== Probando Sistema de Health Check ===\n');

  // Crear sistema con configuración de prueba
  const healthSystem = createHealthCheckSystem({
    standalone: false, // No crear servidor para pruebas
    monitor: {
      includeDetails: true,
      parallel: true,
      system: {
        memoryThreshold: 90,
        cpuThreshold: 80,
        diskThreshold: 85
      }
    }
  });

  try {
    // 1. Inicializar sistema
    console.log('1. Inicializando sistema...');
    await healthSystem.initialize();
    console.log('✓ Sistema inicializado\n');

    // 2. Probar liveness check
    console.log('2. Probando liveness check...');
    const liveness = await healthSystem.checkLiveness();
    console.log('Liveness:', {
      status: liveness.status,
      uptime: liveness.uptime,
      memory: liveness.memory
    });
    console.log();

    // 3. Probar readiness check
    console.log('3. Probando readiness check...');
    const readiness = await healthSystem.checkReadiness();
    console.log('Readiness:', {
      status: readiness.status,
      responseTime: `${readiness.responseTime}ms`,
      summary: readiness.summary
    });
    console.log();

    // 4. Probar checks de componentes específicos
    console.log('4. Probando componentes individuales...');
    
    // System checks
    const memoryCheck = await healthSystem.checkComponent('system', 'memory');
    console.log('Memory check:', {
      status: memoryCheck.details.status,
      usage: memoryCheck.details.details?.usagePercent + '%'
    });
    
    const cpuCheck = await healthSystem.checkComponent('system', 'cpu');
    console.log('CPU check:', {
      status: cpuCheck.details.status,
      cores: cpuCheck.details.details?.cores
    });
    
    console.log();

    // 5. Obtener métricas
    console.log('5. Obteniendo métricas...');
    const metrics = healthSystem.getMetrics();
    console.log('Métricas:', {
      uptime: metrics.uptime.human,
      checks: metrics.checks,
      availability: metrics.availability
    });
    console.log();

    // 6. Simular múltiples checks para historial
    console.log('6. Generando historial de checks...');
    for (let i = 0; i < 5; i++) {
      await healthSystem.checkReadiness();
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const history = healthSystem.getMonitor().getHistory(3);
    console.log(`Historial (últimos 3):`, history.map(h => ({
      status: h.status,
      time: h.responseTime + 'ms'
    })));
    console.log();

    // 7. Probar estado detallado
    console.log('7. Obteniendo estado detallado...');
    const detailed = await healthSystem.getMonitor().getDetailedStatus();
    console.log('Estado detallado:', {
      current: detailed.current.status,
      components: Object.keys(detailed.components),
      metrics: {
        availability: detailed.metrics.availability.percentage + '%',
        avgResponse: detailed.metrics.performance.avgResponseTime + 'ms'
      }
    });
    console.log();

    // 8. Integración con Express (simulación)
    console.log('8. Probando integración con Express...');
    const express = require('express');
    const app = express();
    
    healthSystem.integrate(app, {
      basePath: '/api/health',
      middleware: {
        cors: true,
        rateLimit: true
      }
    });
    
    console.log('✓ Health check integrado en /api/health');
    console.log();

    // 9. Programar checks automáticos
    console.log('9. Programando checks automáticos...');
    const intervalId = healthSystem.scheduleChecks(5000); // cada 5 segundos
    console.log('✓ Checks programados cada 5 segundos');
    
    // Esperar algunos checks
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Detener checks
    healthSystem.stopScheduledChecks();
    console.log('✓ Checks automáticos detenidos');
    console.log();

    // 10. Probar webhook (simulación)
    console.log('10. Configurando webhook...');
    healthSystem.setWebhook('http://localhost:4000/webhook', {
      events: ['unhealthy', 'degraded'],
      headers: {
        'X-Service': 'health-check'
      }
    });
    console.log('✓ Webhook configurado\n');

    // Resumen final
    console.log('=== Resumen de Pruebas ===');
    const finalMetrics = healthSystem.getMetrics();
    const lastCheck = healthSystem.getLastCheck();
    
    console.log({
      totalChecks: finalMetrics.checks.total,
      availability: finalMetrics.availability.percentage + '%',
      lastStatus: lastCheck.status,
      components: lastCheck.summary
    });
    
    console.log('\n=== Todas las pruebas completadas exitosamente ===\n');

  } catch (error) {
    console.error('✗ Error en las pruebas:', error);
  } finally {
    // Limpiar recursos
    await healthSystem.shutdown();
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  testHealthCheck().then(() => {
    console.log('Pruebas finalizadas');
    process.exit(0);
  }).catch(error => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
}

module.exports = testHealthCheck;