# Sistema de Dependencias - Nivel 1 (Sin DI Container)

## Decisión de Arquitectura

Siguiendo el **lineamiento_nivel1.md**, NO se implementa un Dependency Injection Container complejo porque:

1. **Es sobreingeniería para un MVP** - El lineamiento prohíbe "abstracciones tempranas"
2. **No hay casos de uso múltiples** - No justifica la complejidad adicional
3. **Simplicidad sobre complejidad** - MVP funcional con código mínimo

## Solución Implementada

### 1. Servicios Compartidos (`shared/services.ts`)
```javascript
// Servicios simples sin librerías externas
- logger: Sistema de logging básico
- cache: Cache en memoria simple
- eventBus: Comunicación entre módulos
- validator: Validaciones básicas
- utils: Utilidades comunes
```

### 2. Sistema de Dependencias (`shared/dependencies.ts`)
```javascript
// Instancias únicas (singleton manual)
- repositories: Acceso a datos
- services: Lógica de negocio
- utils: Herramientas compartidas
```

### 3. Uso en Módulos
```javascript
// Importación simple
import { getDependencies } from '@shared/dependencies';
const { services, repositories, utils } = getDependencies();
```

## Ventajas del Enfoque

✅ **Simplicidad**: Sin configuración compleja ni decoradores
✅ **Transparencia**: Código fácil de entender y debuggear
✅ **Flexibilidad**: Fácil migración a DI real en Nivel 2
✅ **Funcional**: Cumple los requisitos del MVP

## Migración a Nivel 2

Cuando se justifique un DI Container real:

1. **Instalar Inversify**
```bash
npm install inversify reflect-metadata
```

2. **Crear Container**
```typescript
// container.ts
import { Container } from 'inversify';
// Migrar servicios actuales
```

3. **Decorar Clases**
```typescript
@injectable()
class UserService {
  constructor(@inject(TYPES.UserRepo) private repo: IUserRepository) {}
}
```

## Servicios Disponibles

### Logger
```javascript
logger.info('Mensaje informativo');
logger.error('Error:', error);
logger.warn('Advertencia');
logger.debug('Debug en desarrollo');
```

### Cache
```javascript
cache.set('key', value, 300); // TTL 5 minutos
const value = cache.get('key');
cache.delete('key');
```

### Event Bus
```javascript
eventBus.on('user.created', (user) => {});
eventBus.emit('user.created', userData);
```

### Validator
```javascript
validator.isEmail('test@example.com');
validator.isPhone('+56912345678');
validator.required(value, 'fieldName');
```

### Utils
```javascript
utils.generateId('prefix');
utils.hashPassword('password');
utils.apiResponse(true, data, 'message');
```

## Ejemplo de Uso Completo

```javascript
// En un controlador
import { getDependencies } from '@shared/dependencies';

const { services, utils } = getDependencies();

export const userController = {
  async login(req, res) {
    try {
      // Validar
      if (!utils.validator.isEmail(req.body.email)) {
        return res.status(400).json(
          utils.apiResponse(false, null, 'Email inválido')
        );
      }
      
      // Usar servicio
      const result = await services.auth.login(email, password);
      
      // Logging
      utils.logger.info(`Login: ${email}`);
      
      // Responder
      res.json(utils.apiResponse(true, result));
    } catch (error) {
      utils.logger.error('Error:', error);
      res.status(500).json(
        utils.apiResponse(false, null, 'Error interno')
      );
    }
  }
};
```

## Notas Importantes

⚠️ **Variables sensibles**: Todas las credenciales están hardcodeadas temporalmente
⚠️ **Sin validación real**: Los repositorios retornan datos mock
⚠️ **Sin persistencia**: Cache y eventos son en memoria
⚠️ **Para desarrollo**: No usar en producción sin mejoras de Nivel 2+

## TODOs para Nivel 2

- [ ] Evaluar necesidad real de DI Container
- [ ] Implementar interfaces si hay múltiples implementaciones
- [ ] Agregar tests unitarios con mocks
- [ ] Configurar inyección para testing
- [ ] Documentar contratos de servicios