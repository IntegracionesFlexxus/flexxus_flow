# Frontend - Flexxus Flow MVP

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env

# Instalar Husky
npm run prepare

# Iniciar en desarrollo
npm run dev
```

## 📦 Scripts Disponibles

```bash
npm run dev          # Iniciar servidor de desarrollo
npm run build        # Compilar para producción
npm run preview      # Preview de build de producción
npm run lint         # Verificar errores de ESLint
npm run lint:fix     # Corregir errores de ESLint automáticamente
npm run format       # Formatear código con Prettier
npm run format:check # Verificar formato del código
npm run type-check   # Verificar tipos TypeScript
npm run clean        # Limpiar build y node_modules
npm run analyze      # Analizar bundle size
```

## 🛠 Herramientas de Desarrollo Configuradas

### Linting & Formatting
- **ESLint**: Análisis estático de código con reglas para React y TypeScript
- **Prettier**: Formateo automático consistente
- **Husky**: Git hooks para validación pre-commit
- **lint-staged**: Validación solo en archivos modificados

### Configuración VS Code
El proyecto incluye configuraciones recomendadas:
- `.vscode/settings.json`: Configuraciones del editor
- `.vscode/extensions.json`: Extensiones recomendadas
- `.vscode/launch.json`: Configuraciones de debugging

### Variables de Entorno
Configurar las variables necesarias copiando `.env.example`:
```bash
cp .env.example .env
```

Variables principales:
- `VITE_API_URL`: URL del backend API
- `VITE_WS_URL`: URL del WebSocket
- `VITE_APP_ENV`: Ambiente (development/production)
- `VITE_AUTH_TOKEN_KEY`: Key para almacenar token
- Feature flags para habilitar/deshabilitar funcionalidades

## 🏗 Estructura del Proyecto

```
frontend-v1/
├── src/
│   ├── components/     # Componentes reutilizables
│   ├── modules/        # Módulos por dominio
│   ├── shared/         # Recursos compartidos
│   │   └── hooks/      # Custom hooks implementados
│   ├── assets/         # Recursos estáticos
│   └── styles/         # Estilos globales
├── .husky/            # Git hooks
│   ├── pre-commit     # Ejecuta lint-staged
│   └── commit-msg     # Valida formato del commit
├── .vscode/           # Configuración VS Code
└── package.json       # Dependencias y scripts
```

## 🎯 Custom Hooks Disponibles

- `useAuth`: Autenticación y autorización
- `useLocalStorage`: Persistencia local con sincronización
- `useDebounce`: Optimización de rendimiento
- `useAsync`: Manejo de operaciones asíncronas
- `useWebSocket`: Comunicación en tiempo real
- `useForm`: Gestión de formularios
- `useNotification`: Sistema de notificaciones UI

## 🔧 Commits Convencionales

Formato requerido: `tipo: descripción`

Tipos válidos:
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bugs
- `docs`: Documentación
- `style`: Cambios de estilo (formato, no CSS)
- `refactor`: Refactorización
- `test`: Tests
- `chore`: Tareas de mantenimiento

Ejemplo: `feat: agregar login de usuarios`

## 📋 Configuraciones de Calidad

### ESLint Rules
- TypeScript strict checks habilitados
- React hooks rules activadas
- Complejidad ciclomática máxima: 10
- Profundidad máxima de anidamiento: 4
- Línea máxima: 120 caracteres

### Prettier Config
- Single quotes
- Semicolons habilitados
- Tab width: 2 espacios
- Trailing comma: ES5

### Pre-commit Hooks
- ESLint fix automático
- Prettier format
- TypeScript check
- Validación de mensaje de commit

## 🚀 Debugging

### Chrome DevTools
```bash
# Iniciar con DevTools
npm run dev
# Abrir Chrome en http://localhost:3000
# F12 para abrir DevTools
```

### VS Code Debugging
- Configuración incluida en `.vscode/launch.json`
- F5 para iniciar debugging
- Breakpoints disponibles en código TypeScript

## 📝 TODO - Nivel 2

- [ ] Agregar testing (Jest + React Testing Library)
- [ ] Configurar CI/CD pipeline
- [ ] Implementar Storybook para componentes
- [ ] Agregar análisis de bundle con webpack-bundle-analyzer
- [ ] Configurar PWA con Workbox
- [ ] Implementar i18n para internacionalización
- [ ] Agregar error boundaries globales
- [ ] Configurar Sentry para monitoreo de producción
- [ ] Implementar lazy loading para rutas
- [ ] Agregar Service Workers para offline

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit con formato convencional (`git commit -m 'feat: add amazing feature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Propiedad de Flexxus - Todos los derechos reservados

---

**Versión**: 1.0.0 (MVP - Nivel 1)
**Sprint**: 1 - Frontend Team
**Última actualización**: Enero 2025