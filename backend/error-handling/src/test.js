// Script de prueba para el sistema de Error Handling
const express = require('express');
const errorHandling = require('./index');

async function testErrorHandling() {
  console.log('=== Probando Sistema de Error Handling ===\n');

  try {
    // 1. Probar clases de error personalizadas
    console.log('1. Probando clases de error personalizadas...');
    
    const validationError = new errorHandling.ValidationError('Datos inválidos', [
      { field: 'email', message: 'Email inválido' },
      { field: 'age', message: 'Debe ser mayor de 18' }
    ]);
    console.log('ValidationError:', validationError.getClientResponse());
    
    const notFoundError = new errorHandling.NotFoundError('Usuario', '123');
    console.log('NotFoundError:', notFoundError.getClientResponse());
    
    const authError = new errorHandling.AuthenticationError('Token inválido');
    console.log('AuthenticationError:', authError.getClientResponse());
    
    console.log('✓ Clases de error funcionando\n');

    // 2. Probar validadores
    console.log('2. Probando validadores...');
    
    const validator = new errorHandling.validators.JoiValidator(
      errorHandling.validators.schemas.user.create
    );
    
    // Datos válidos
    try {
      const validData = validator.validate({
        email: 'user@example.com',
        password: 'SecurePass123',
        firstName: 'John',
        lastName: 'Doe'
      });
      console.log('✓ Validación exitosa:', validData.email);
    } catch (error) {
      console.error('Error en validación:', error.message);
    }
    
    // Datos inválidos
    try {
      validator.validate({
        email: 'invalid-email',
        password: '123',
        firstName: 'J'
      });
    } catch (error) {
      console.log('✓ Validación falló correctamente:', error.errors.length, 'errores');
    }
    
    console.log();

    // 3. Probar async handlers
    console.log('3. Probando async handlers...');
    
    // Handler simple
    const asyncOperation = errorHandling.asyncHandler(async (req, res, next) => {
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('✓ Async handler ejecutado');
      return 'success';
    });
    
    // Handler con retry
    let attempts = 0;
    const retryOperation = errorHandling.asyncHandlerWithRetry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Intento fallido');
        }
        return 'success after retries';
      },
      { maxRetries: 3, retryDelay: 100 }
    );
    
    // Handler con timeout
    const timeoutOperation = errorHandling.asyncTimeoutHandler(
      async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'completed before timeout';
      },
      100
    );
    
    console.log('✓ Async handlers configurados\n');

    // 4. Probar Circuit Breaker
    console.log('4. Probando Circuit Breaker...');
    
    const breaker = new errorHandling.CircuitBreaker({
      threshold: 3,
      timeout: 1000
    });
    
    // Simular fallos
    for (let i = 0; i < 5; i++) {
      try {
        await breaker.execute(async () => {
          if (i < 3) {
            throw new Error('Service unavailable');
          }
          return 'success';
        });
      } catch (error) {
        console.log(`Intento ${i + 1}: ${error.message}`);
      }
    }
    
    console.log('Estado del breaker:', breaker.getStatus());
    console.log();

    // 5. Probar utilidades
    console.log('5. Probando utilidades...');
    
    // Retry operation
    let retryCount = 0;
    const result = await errorHandling.retryOperation(
      async (attempt) => {
        retryCount++;
        if (retryCount < 2) {
          throw new Error('Retry needed');
        }
        return 'Success after retry';
      },
      {
        maxRetries: 3,
        initialDelay: 100,
        onRetry: (error, attempt) => {
          console.log(`Retry ${attempt}: ${error.message}`);
        }
      }
    );
    console.log('✓ Retry operation:', result);
    
    // Timeout operation
    try {
      await errorHandling.withTimeout(
        new Promise(resolve => setTimeout(resolve, 200)),
        100,
        'Custom timeout message'
      );
    } catch (error) {
      console.log('✓ Timeout detectado:', error.message);
    }
    
    console.log();

    // 6. Probar Error Aggregator
    console.log('6. Probando Error Aggregator...');
    
    const aggregator = new errorHandling.ErrorAggregator();
    
    aggregator.add(new Error('Error 1'), { module: 'auth' });
    aggregator.add(new Error('Error 2'), { module: 'database' });
    aggregator.add(new errorHandling.ValidationError('Error 3'), { module: 'validation' });
    
    console.log('Errores agregados:', aggregator.getErrors().length);
    console.log('Resumen:', aggregator.getSummary());
    
    const aggregatedError = aggregator.toError();
    console.log('✓ Error agregado:', aggregatedError.message);
    console.log();

    // 7. Configurar Express app de prueba
    console.log('7. Configurando Express app...');
    
    const app = express();
    app.use(express.json());
    
    // Ruta de prueba con validación
    app.post('/api/users',
      errorHandling.validateBody('user.create'),
      errorHandling.asyncHandler(async (req, res) => {
        // Simular creación de usuario
        res.json({ success: true, user: req.body });
      })
    );
    
    // Ruta que lanza error
    app.get('/api/error',
      errorHandling.asyncHandler(async (req, res) => {
        throw new errorHandling.NotFoundError('Recurso', 'test-id');
      })
    );
    
    // Ruta con timeout
    app.get('/api/slow',
      errorHandling.asyncTimeoutHandler(async (req, res) => {
        await new Promise(resolve => setTimeout(resolve, 100));
        res.json({ message: 'Completed' });
      }, 200)
    );
    
    // Configurar error handling
    errorHandling.setupExpress(app);
    
    console.log('✓ Express app configurado\n');

    // 8. Estadísticas de errores
    console.log('8. Estadísticas de errores...');
    
    // Generar algunos errores para estadísticas
    errorHandling.handleError(new Error('Test error 1'));
    errorHandling.handleError(new errorHandling.ValidationError('Test error 2'));
    errorHandling.handleError(new errorHandling.NotFoundError('Resource'));
    errorHandling.handleError(new errorHandling.ValidationError('Test error 3'));
    
    const stats = errorHandling.getErrorStats();
    console.log('Estadísticas:', JSON.stringify(stats, null, 2));
    console.log();

    // 9. Probar sanitizadores
    console.log('9. Probando sanitizadores...');
    
    const dirtyData = {
      name: '  John Doe  ',
      email: 'JOHN@EXAMPLE.COM',
      description: '<script>alert("XSS")</script>Hello',
      bio: 'Multiple   spaces   here'
    };
    
    const cleaned = errorHandling.validators.sanitizers.sanitizeObject(dirtyData, [
      errorHandling.validators.sanitizers.trimString,
      errorHandling.validators.sanitizers.normalizeWhitespace
    ]);
    
    console.log('Datos originales:', dirtyData);
    console.log('Datos sanitizados:', cleaned);
    console.log();

    // 10. Probar manejo de errores críticos
    console.log('10. Probando detección de errores críticos...');
    
    const operationalError = new errorHandling.BadRequestError('Bad input');
    const criticalError = new errorHandling.InternalServerError('Database down');
    const systemError = new Error('ECONNREFUSED');
    systemError.code = 'ECONNREFUSED';
    
    console.log('BadRequest es crítico?', errorHandling.isCritical(operationalError));
    console.log('InternalServer es crítico?', errorHandling.isCritical(criticalError));
    console.log('ECONNREFUSED es crítico?', errorHandling.isCritical(systemError));
    console.log();

    console.log('=== Todas las pruebas completadas exitosamente ===\n');

  } catch (error) {
    console.error('✗ Error en las pruebas:', error);
    errorHandling.handleError(error);
  }
}

// Ejecutar pruebas si se llama directamente
if (require.main === module) {
  testErrorHandling().then(() => {
    console.log('Pruebas finalizadas');
    process.exit(0);
  });
}

module.exports = testErrorHandling;