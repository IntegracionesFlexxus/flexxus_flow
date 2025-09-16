# Guía de Migración: Nivel 2 → Nivel 3

## Resumen de Cambios

La migración de Nivel 2 a Nivel 3 implementa:
- ✅ **Testing Completo** - Unit, integration, E2E con 80%+ cobertura
- ✅ **Calidad de Código** - ESLint, Prettier, formateo automático
- ✅ **CI/CD Pipeline** - GitHub Actions con validaciones automáticas
- ✅ **Documentación** - TypeDoc, README exhaustivo, guías de migración
- ✅ **Cobertura de Código** - Reportes y umbrales configurados
- ✅ **Pre-commit Hooks** - Validaciones antes de commit

## Nuevas Herramientas y Configuraciones

### Testing
- **Jest**: Framework de testing
- **ts-jest**: Soporte TypeScript para Jest
- **Coverage**: Reportes con lcov y codecov

### Calidad de Código
- **ESLint**: Linting con reglas estrictas
- **Prettier**: Formateo consistente
- **lint-staged**: Validación en archivos staged
- **Husky**: Git hooks automatizados

### Documentación
- **TypeDoc**: Generación automática de docs
- **typedoc-plugin-markdown**: Docs en formato Markdown

## Estructura de Tests

```
src/
├── __tests__/
│   └── setup.ts                 # Configuración global de Jest
├── services/
│   └── __tests__/
│       ├── ValidatorService.test.ts
│       ├── CacheService.test.ts
│       └── ...
├── controllers/
│   └── __tests__/
├── repositories/
│   └── __tests__/
└── integration/
    └── __tests__/
```

## Pasos de Migración

### 1. Instalar Dependencias de Testing

```bash
# Testing framework
npm install --save-dev --legacy-peer-deps jest ts-jest @types/jest

# ESLint y Prettier
npm install --save-dev --legacy-peer-deps \
  eslint-plugin-jest \
  eslint-plugin-import \
  eslint-plugin-prettier \
  eslint-config-prettier

# Pre-commit hooks
npm install --save-dev --legacy-peer-deps husky lint-staged

# Documentación
npm install --save-dev --legacy-peer-deps typedoc typedoc-plugin-markdown
```

### 2. Configurar Jest

Crear `jest.config.js`:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### 3. Configurar ESLint y Prettier

Crear `.eslintrc.js`:
```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:jest/recommended',
    'prettier'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  }
};
```

### 4. Escribir Tests

#### Test Unitario Ejemplo
```typescript
import 'reflect-metadata';
import { ValidatorService } from '../ValidatorService';

describe('ValidatorService', () => {
  let service: ValidatorService;
  
  beforeEach(() => {
    service = new ValidatorService();
  });
  
  describe('isEmail', () => {
    it('should validate correct emails', () => {
      expect(service.isEmail('test@example.com')).toBe(true);
    });
    
    it('should reject invalid emails', () => {
      expect(service.isEmail('not-an-email')).toBe(false);
    });
  });
});
```

#### Test de Integración Ejemplo
```typescript
describe('API Integration', () => {
  let app: Application;
  
  beforeAll(async () => {
    app = new Application();
    await app.initialize();
  });
  
  afterAll(async () => {
    await app.shutdown();
  });
  
  it('should return health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('healthy');
  });
});
```

### 5. Configurar CI/CD Pipeline

Crear `.github/workflows/backend-ci.yml`:
```yaml
name: Backend CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci --legacy-peer-deps
      - run: npm run build
  
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci --legacy-peer-deps
      - run: npm run lint
      - run: npm run format:check
  
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci --legacy-peer-deps
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4
```

### 6. Configurar Pre-commit Hooks

Crear `.lintstagedrc.json`:
```json
{
  "*.{ts,tsx}": [
    "eslint --fix",
    "prettier --write",
    "jest --bail --findRelatedTests --passWithNoTests"
  ]
}
```

### 7. Actualizar Scripts en package.json

```json
{
  "scripts": {
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\"",
    "docs": "typedoc",
    "prepare": "husky"
  }
}
```

## Checklist de Migración

### Configuración Inicial
- [ ] Instalar todas las dependencias de testing
- [ ] Configurar Jest con `jest.config.js`
- [ ] Configurar ESLint con `.eslintrc.js`
- [ ] Configurar Prettier con `.prettierrc`
- [ ] Configurar TypeDoc con `typedoc.json`

### Tests
- [ ] Crear setup global de tests
- [ ] Escribir tests unitarios para servicios críticos
- [ ] Escribir tests de integración para APIs
- [ ] Configurar mocks para dependencias externas
- [ ] Alcanzar 80% de cobertura mínima

### Calidad de Código
- [ ] Ejecutar ESLint sin errores
- [ ] Aplicar Prettier a todo el código
- [ ] Configurar pre-commit hooks
- [ ] Resolver todos los warnings

### CI/CD
- [ ] Crear workflow de GitHub Actions
- [ ] Configurar jobs de build, quality, test
- [ ] Agregar badges al README
- [ ] Configurar Codecov para reportes

### Documentación
- [ ] Generar documentación con TypeDoc
- [ ] Actualizar README con badges y secciones
- [ ] Documentar APIs públicas
- [ ] Crear guías de contribución

## Comandos de Validación

```bash
# Verificar que todo funciona
npm run build          # Compilación exitosa
npm run lint           # Sin errores de ESLint
npm run format:check   # Código formateado
npm test               # Tests pasando
npm run test:coverage  # Cobertura > 80%
npx typedoc           # Documentación generada
```

## Métricas de Éxito

### Cobertura de Código
```
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   ≥80   |    ≥80   |   ≥80   |   ≥80   |
Critical services   |   ≥90   |    ≥90   |   ≥90   |   ≥90   |
```

### Calidad de Código
- ✅ 0 errores de ESLint
- ✅ 0 errores de TypeScript
- ✅ Código formateado con Prettier
- ✅ Tests pasando en CI/CD

### Documentación
- ✅ API docs generada automáticamente
- ✅ README completo con badges
- ✅ Ejemplos de código en docs
- ✅ Guías de migración

## Problemas Comunes

### Error: "Cannot find module 'reflect-metadata'"
```bash
npm install reflect-metadata
# Importar al inicio de tests
import 'reflect-metadata';
```

### Error: "Jest encountered an unexpected token"
```bash
# Verificar tsconfig.json para Jest
{
  "compilerOptions": {
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

### Error: "Coverage below threshold"
```bash
# Escribir más tests o ajustar temporalmente
jest.config.js:
coverageThreshold: {
  global: {
    lines: 70  // Ajustar gradualmente
  }
}
```

### Error: "ESLint peer dependency conflicts"
```bash
# Usar legacy peer deps
npm install --legacy-peer-deps
```

## Beneficios Post-Migración

### Confiabilidad
- 🎯 Detección temprana de bugs
- 🛡️ Prevención de regresiones
- ✅ Validación automática en PRs

### Mantenibilidad
- 📊 Código consistente y limpio
- 📚 Documentación siempre actualizada
- 🔍 Fácil debugging con tests

### Productividad
- ⚡ Refactoring seguro con tests
- 🚀 Deploy con confianza
- 👥 Onboarding más rápido

## Siguiente Nivel (Futuro)

### Nivel 4 - Producción
- Monitoring con Prometheus/Grafana
- Tracing distribuido con Jaeger
- Feature flags con LaunchDarkly
- A/B testing framework
- Blue-green deployments
- Chaos engineering

## Scripts de Automatización

### Ejecutar Migración Completa
```bash
#!/bin/bash
# migrate-to-level3.sh

echo "🚀 Starting Level 3 Migration..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install --save-dev --legacy-peer-deps \
  jest ts-jest @types/jest \
  eslint-plugin-jest eslint-plugin-import \
  eslint-plugin-prettier eslint-config-prettier \
  husky lint-staged \
  typedoc typedoc-plugin-markdown

# Run initial checks
echo "✅ Running quality checks..."
npm run build
npm run lint:fix
npm run format

# Run tests
echo "🧪 Running tests..."
npm test

# Generate docs
echo "📚 Generating documentation..."
npx typedoc

echo "✨ Migration complete!"
```

## Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [TypeDoc Guide](https://typedoc.org/guides/overview/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Codecov Integration](https://docs.codecov.com/docs)

---

**Fecha de actualización**: 2025-09-03  
**Versión**: 1.0.0  
**Responsable**: Equipo Backend