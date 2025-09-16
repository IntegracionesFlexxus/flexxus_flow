# Guía de Migración: Nivel 1 → Nivel 2

## Resumen de Cambios

La migración de Nivel 1 a Nivel 2 introduce:
- ✅ **TypeScript** para type safety
- ✅ **Inversify** para Dependency Injection
- ✅ **SOLID Principles** aplicados sistemáticamente
- ✅ **Configuración centralizada** con validación
- ✅ **Estructura de carpetas estándar**
- ✅ **Patrones de diseño** (Strategy, Factory, Singleton)

## Estructura Nueva

```
backend/
├── src/
│   ├── container/        # DI Container y configuración
│   │   ├── container.ts
│   │   └── types.ts
│   ├── interfaces/       # Contratos e interfaces
│   │   ├── IConfig.ts
│   │   ├── IServices.ts
│   │   └── IRepositories.ts
│   ├── services/         # Lógica de negocio
│   │   ├── ConfigService.ts
│   │   ├── LoggerService.ts
│   │   ├── CacheService.ts
│   │   ├── EventBusService.ts
│   │   ├── ValidatorService.ts
│   │   └── ErrorHandlerService.ts
│   ├── repositories/     # Acceso a datos
│   ├── controllers/      # Controladores HTTP
│   ├── middlewares/      # Express middlewares
│   ├── models/          # Modelos de dominio
│   ├── utils/           # Utilidades
│   ├── config/          # Configuración
│   └── index.ts         # Entry point
├── dist/                # Código compilado
├── logs/               # Archivos de log
├── .env.example        # Variables de entorno
├── tsconfig.json       # Configuración TypeScript
└── package.json        # Dependencias y scripts
```

## Pasos de Migración

### 1. Actualizar Dependencias

```bash
# Instalar nuevas dependencias
npm install inversify reflect-metadata typescript ts-node-dev
npm install winston winston-daily-rotate-file bcrypt jsonwebtoken
npm install node-cache joi axios tsconfig-paths rimraf prettier

# Instalar tipos
npm install -D @types/node @types/express @types/bcrypt @types/jsonwebtoken
```

### 2. Configurar TypeScript

Copiar el `tsconfig.json` provisto con las siguientes características:
- Target ES2022
- Decoradores habilitados
- Path aliases configurados
- Strict mode activado

### 3. Migrar Servicios Existentes

#### Antes (Nivel 1):
```javascript
// shared/services.ts
const logger = {
  info: (msg) => console.log(msg),
  error: (msg) => console.error(msg)
};

module.exports = { logger };
```

#### Después (Nivel 2):
```typescript
// services/LoggerService.ts
@injectable()
export class LoggerService implements ILoggerService {
  constructor(@inject(TYPES.Config) private config: IConfig) {
    // Configuración con Winston
  }
  
  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }
}
```

### 4. Implementar Dependency Injection

#### Registrar servicios:
```typescript
// container/container.ts
container.bind<ILoggerService>(TYPES.LoggerService)
  .to(LoggerService)
  .inSingletonScope();
```

#### Usar servicios:
```typescript
// En cualquier clase
@injectable()
export class UserService {
  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.UserRepository) private userRepo: IUserRepository
  ) {}
}
```

### 5. Migrar Configuración

#### Antes (Nivel 1):
```javascript
// Hardcoded o disperso
const dbConfig = {
  host: 'localhost',
  port: 5432
};
```

#### Después (Nivel 2):
```typescript
// Centralizado y validado
const config = container.get<IConfig>(TYPES.Config);
// config.database.shared.host
// config.security.jwtSecret
```

### 6. Aplicar SOLID Principles

#### Single Responsibility:
- Cada servicio tiene una responsabilidad única
- LoggerService solo maneja logs
- CacheService solo maneja cache

#### Open/Closed:
- Extensible sin modificar código existente
- Usar herencia e interfaces

#### Dependency Inversion:
- Depender de interfaces, no implementaciones
- Todos los servicios tienen interfaces

### 7. Implementar Patrones

#### Strategy Pattern (CacheService):
```typescript
interface ICacheStrategy {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

class MemoryCacheStrategy implements ICacheStrategy { }
class RedisCacheStrategy implements ICacheStrategy { }
```

#### Circuit Breaker (ErrorHandlerService):
```typescript
async withCircuitBreaker<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T>
```

## Mapeo de Sistemas Nivel 1 → Nivel 2

| Sistema Nivel 1 | Ubicación Nivel 2 | Cambios Principales |
|----------------|-------------------|---------------------|
| api-gateway/ | controllers/ + middlewares/ | Usa DI, tipado fuerte |
| database-manager/ | repositories/ + DatabaseManager | Interfaces, transacciones |
| config-manager/ | services/ConfigService | Validación con Joi |
| logging-system/ | services/LoggerService | Winston, rotación de logs |
| error-handling/ | services/ErrorHandlerService | Circuit breaker, retry |
| health-check/ | services/HealthService | Estrategias de check |

## Scripts NPM Actualizados

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "eslint src/**/*.ts",
    "test": "jest"
  }
}
```

## Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```bash
# Nuevas variables requeridas
JWT_SECRET=cambiar_en_produccion
REFRESH_TOKEN_SECRET=cambiar_en_produccion
BCRYPT_ROUNDS=10
API_KEYS=key1:service1,key2:service2
```

## Testing del Sistema Migrado

```bash
# 1. Compilar TypeScript
npm run build

# 2. Ejecutar en desarrollo
npm run dev

# 3. Verificar health check
curl http://localhost:3000/health

# 4. Verificar DI container
curl http://localhost:3000/api/v1/status
```

## Checklist de Migración

- [ ] Instalar todas las dependencias
- [ ] Configurar TypeScript
- [ ] Crear estructura de carpetas Nivel 2
- [ ] Migrar servicios a clases con @injectable
- [ ] Definir interfaces para todos los servicios
- [ ] Configurar container de Inversify
- [ ] Migrar configuración a ConfigService
- [ ] Actualizar imports para usar path aliases
- [ ] Actualizar scripts en package.json
- [ ] Crear archivo .env desde .env.example
- [ ] Probar compilación con `npm run build`
- [ ] Probar ejecución con `npm run dev`
- [ ] Verificar que todos los servicios se inicializan
- [ ] Actualizar documentación

## Problemas Comunes y Soluciones

### Error: "Cannot find module '@interfaces/...'"
**Solución**: Instalar tsconfig-paths y usarlo en scripts:
```bash
npm install tsconfig-paths
# En package.json: ts-node-dev -r tsconfig-paths/register
```

### Error: "Reflect.metadata is not defined"
**Solución**: Importar reflect-metadata al inicio:
```typescript
import 'reflect-metadata';
```

### Error: "Cannot inject dependencies"
**Solución**: Verificar que la clase tenga @injectable() y que esté registrada en el container.

### Error: "Environment variables not loading"
**Solución**: Crear archivo .env basado en .env.example

## Beneficios Post-Migración

1. **Type Safety**: Errores detectados en tiempo de compilación
2. **Mejor Testing**: Inyección de mocks facilitada
3. **Mantenibilidad**: Código más organizado y predecible
4. **Escalabilidad**: Fácil agregar nuevos servicios
5. **Documentación**: Interfaces como documentación viva
6. **Performance**: Singletons optimizados automáticamente

## Próximos Pasos (Nivel 3)

- Agregar tests unitarios con Jest
- Implementar Redis para cache distribuido
- Agregar OpenAPI/Swagger documentation
- Implementar GraphQL endpoints
- Agregar monitoring con Prometheus
- Implementar CI/CD pipeline

## Soporte

Para dudas durante la migración:
1. Revisar los archivos de ejemplo en `src/`
2. Consultar interfaces en `src/interfaces/`
3. Verificar logs en `logs/` para debugging
4. Ejecutar en modo debug: `npm run dev:debug`