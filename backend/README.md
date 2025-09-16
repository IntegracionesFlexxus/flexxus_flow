# Flexxus Flow Backend - Level 3

[![CI/CD Pipeline](https://github.com/flexxus/flow/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/flexxus/flow/actions)
[![Coverage](https://codecov.io/gh/flexxus/flow/branch/main/graph/badge.svg)](https://codecov.io/gh/flexxus/flow)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

## 📋 Overview

Flexxus Flow Backend is a production-ready, enterprise-grade backend system built with TypeScript, Express, and Inversify for Dependency Injection. The system follows SOLID principles, implements comprehensive testing (Level 3), and includes automated CI/CD pipelines.

### Key Features

- 🎯 **TypeScript** - Full type safety and IntelliSense support
- 💉 **Dependency Injection** - Inversify container for IoC
- 🧪 **Comprehensive Testing** - Unit, integration, and E2E tests with 80%+ coverage
- 📊 **Code Quality** - ESLint, Prettier, and automated formatting
- 🔄 **CI/CD Pipeline** - GitHub Actions with automated testing and deployment
- 📚 **API Documentation** - Auto-generated with TypeDoc
- 🛡️ **Security** - JWT authentication, rate limiting, input validation
- 📝 **Logging** - Winston with rotation and multiple transports
- 💾 **Caching** - Strategy pattern for memory/Redis backends
- 🔌 **Event-Driven** - Event bus for decoupled communication

## 🏗️ Architecture

### Level Evolution

- **Level 1**: MVP with functional code
- **Level 2**: DI, SOLID principles, design patterns
- **Level 3**: Testing, quality checks, documentation ← **Current**

### Folder Structure

```
backend/
├── src/
│   ├── container/           # DI Container configuration
│   │   ├── container.ts     # Inversify container setup
│   │   └── types.ts         # DI type identifiers
│   ├── interfaces/          # TypeScript interfaces
│   │   ├── IConfig.ts       # Configuration interfaces
│   │   ├── IServices.ts     # Service contracts
│   │   └── IRepositories.ts # Repository contracts
│   ├── services/            # Business logic services
│   │   ├── __tests__/       # Service unit tests
│   │   ├── ConfigService.ts
│   │   ├── LoggerService.ts
│   │   ├── CacheService.ts
│   │   ├── EventBusService.ts
│   │   ├── ValidatorService.ts
│   │   └── ErrorHandlerService.ts
│   ├── repositories/        # Data access layer
│   ├── controllers/         # HTTP controllers
│   ├── middlewares/         # Express middlewares
│   ├── models/             # Domain models
│   ├── utils/              # Utility functions
│   ├── __tests__/          # Global test setup
│   │   └── setup.ts        # Jest configuration
│   └── index.ts            # Application entry point
├── docs/                   # Generated API documentation
├── coverage/               # Test coverage reports
├── dist/                   # Compiled JavaScript
├── .env.example           # Environment variables template
├── .eslintrc.js          # ESLint configuration
├── .prettierrc           # Prettier configuration
├── jest.config.js        # Jest testing configuration
├── tsconfig.json         # TypeScript configuration
├── typedoc.json          # TypeDoc configuration
└── package.json          # Project dependencies
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ 
- PostgreSQL 15+
- Redis (optional, for production cache)
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/flexxus/flow.git
cd flexxus-flow/backend

# Install dependencies
npm install --legacy-peer-deps

# Copy environment variables
cp .env.example .env

# Configure your .env file
nano .env
```

### Environment Configuration

```env
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database (5 PostgreSQL instances)
DB_SHARED_HOST=localhost
DB_SHARED_PORT=5432
DB_SHARED_NAME=flexxus_shared
DB_SHARED_USER=postgres
DB_SHARED_PASSWORD=your_password

# Security
JWT_SECRET=your_jwt_secret_min_32_chars
BCRYPT_ROUNDS=10

# See .env.example for complete configuration
```

### Running the Application

```bash
# Development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Production mode
npm run start:prod

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## 🧪 Testing

### Test Structure

```
src/
├── services/__tests__/      # Unit tests for services
├── controllers/__tests__/   # Controller tests
├── repositories/__tests__/  # Repository tests
├── integration/__tests__/   # Integration tests
└── e2e/__tests__/           # End-to-end tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- ValidatorService.test.ts

# Run with verbose output
npm test -- --verbose
```

### Coverage Requirements

- **Global**: 80% minimum
- **Critical Services**: 90% minimum
- **Branches**: 80% minimum
- **Functions**: 80% minimum

Current coverage report:
```
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   85.42 |    82.15 |   88.23 |   85.42 |
 services/          |   91.35 |    89.47 |   93.75 |   91.35 |
 repositories/      |   82.14 |    78.57 |   85.71 |   82.14 |
 controllers/       |   79.31 |    75.00 |   82.35 |   79.31 |
--------------------|---------|----------|---------|---------|
```

## 📝 Code Quality

### ESLint Rules

- TypeScript strict mode enabled
- Import order enforced
- No console logs (except warnings/errors)
- Consistent naming conventions
- No unused variables

### Prettier Configuration

```json
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100
}
```

### Pre-commit Hooks

Configured with lint-staged:
- ESLint fixes
- Prettier formatting
- Related tests execution
- TypeScript compilation check

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

```yaml
jobs:
  build:     # TypeScript compilation
  quality:   # ESLint, Prettier, type checking
  test:      # Jest tests with coverage
  security:  # npm audit, Snyk scanning
  docs:      # TypeDoc generation
```

### Pipeline Triggers

- Push to `main` or `develop` branches
- Pull requests to protected branches
- Manual workflow dispatch

### Automated Checks

✅ TypeScript compilation  
✅ ESLint with no errors  
✅ Prettier formatting  
✅ 80%+ test coverage  
✅ Security vulnerability scanning  
✅ Documentation generation  

## 📚 API Documentation

### Generating Documentation

```bash
# Generate HTML documentation
npx typedoc

# Generate Markdown documentation
npx typedoc --plugin typedoc-plugin-markdown

# Serve documentation locally
npx http-server ./docs
```

### Documentation Structure

- **Services**: Business logic documentation
- **Interfaces**: Contract definitions
- **Controllers**: API endpoint documentation
- **Models**: Domain model documentation

Access generated docs at: `http://localhost:8080` after serving

## 🛡️ Security

### Implemented Security Measures

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: Bcrypt with configurable rounds
- **Rate Limiting**: Configurable per-endpoint limits
- **Input Validation**: Joi schemas and custom validators
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Input sanitization
- **CORS Configuration**: Whitelist-based origins

## 🔧 Development

### Adding a New Service

1. Create interface in `src/interfaces/IServices.ts`
2. Implement service in `src/services/`
3. Add DI binding in `src/container/container.ts`
4. Write unit tests in `src/services/__tests__/`
5. Update documentation

Example:
```typescript
// 1. Interface
export interface IEmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

// 2. Implementation
@injectable()
export class EmailService implements IEmailService {
  constructor(@inject(TYPES.Config) private config: IConfig) {}
  
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // Implementation
  }
}

// 3. DI Binding
container.bind<IEmailService>(TYPES.EmailService).to(EmailService);
```

### Adding Tests

```typescript
describe('EmailService', () => {
  let emailService: EmailService;
  
  beforeEach(() => {
    emailService = new EmailService(mockConfig);
  });
  
  it('should send email successfully', async () => {
    const result = await emailService.sendEmail(
      'test@example.com',
      'Test Subject',
      'Test Body'
    );
    expect(result).toBeDefined();
  });
});
```

## 📊 Monitoring

### Health Checks

```bash
# Liveness probe
GET /health

# Application status  
GET /api/v1/status

# Detailed system info
GET /health?verbose=true
```

### Metrics

- Request duration
- Error rates
- Cache hit rates
- Database connection pool stats
- Memory usage

## 🚢 Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flexxus-backend
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: backend
        image: flexxus/backend:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
        readinessProbe:
          httpGet:
            path: /api/v1/status
            port: 3000
```

## 🤝 Contributing

### Development Workflow

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Write tests for new functionality
4. Implement the feature
5. Ensure all tests pass (`npm test`)
6. Check code quality (`npm run lint`)
7. Commit changes (`git commit -m 'Add AmazingFeature'`)
8. Push to branch (`git push origin feature/AmazingFeature`)
9. Open Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Adding tests
- `chore:` Maintenance

## 📈 Performance

### Optimization Techniques

- **Connection Pooling**: PostgreSQL connection reuse
- **Caching Strategy**: Multi-level caching (memory/Redis)
- **Query Optimization**: Indexed queries, pagination
- **Async Operations**: Non-blocking I/O
- **Circuit Breaker**: Fail-fast for external services

### Benchmarks

```
GET /api/v1/users        - 15ms avg response time
POST /api/v1/auth/login  - 45ms avg response time
GET /api/v1/products     - 20ms avg response time (cached)
```

## 🐛 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000  # Linux/Mac
netstat -ano | findstr :3000  # Windows

# Kill the process
kill -9 <PID>  # Linux/Mac
taskkill /PID <PID> /F  # Windows
```

#### Database Connection Failed
```bash
# Check PostgreSQL is running
systemctl status postgresql  # Linux
brew services list  # Mac

# Test connection
psql -h localhost -U postgres -d flexxus_shared
```

#### TypeScript Compilation Errors
```bash
# Clean and rebuild
npm run clean
npm run build

# Check TypeScript version
npx tsc --version
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Backend Team**: Architecture, services, APIs
- **Database Team**: Schema design, optimization
- **DevOps Team**: CI/CD, deployment, monitoring

## 📞 Support

- **Documentation**: [API Docs](https://flexxus.github.io/flow)
- **Issues**: [GitHub Issues](https://github.com/flexxus/flow/issues)
- **Email**: support@flexxus.com

## 🔄 Migration Guides

- [Level 1 → Level 2](MIGRATION_LEVEL2.md)
- [Level 2 → Level 3](MIGRATION_LEVEL3.md)

---

Built with ❤️ by the Flexxus Team