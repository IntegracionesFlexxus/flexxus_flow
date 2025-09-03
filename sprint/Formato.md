---
title: "Formato de Archivo Markdown"
tipo: "lineamiento"
estado: "vigente"
prioridad: "alta"
tags: ["formato", "documentacion", "yaml", "markdown"]
responsable: "Equipo de Documentación"
fecha_inicio: "2024-01-01"
fecha_fin: "2024-01-01"
dependencias: []
version: "1.0"
sprint: 0
---

## Formato de Archivo Markdown

### Estructura Básica
Cada archivo debe seguir este formato:

```markdown
---
# FRONTMATTER YAML (Opcional pero recomendado)
title: "Nombre de la Funcionalidad"
tipo: "funcionalidad"
estado: "vigente"
prioridad: "alta"
tags: ["auth", "backend", "jwt"]
responsable: "Nombre del desarrollador"
fecha_inicio: "2024-01-15"
fecha_fin: "2024-01-30"
dependencias: ["base-datos", "api-core"]
version: "1.0.0"
sprint: "Sprint 1"
---

# Título Principal de la Funcionalidad

## Descripción
Descripción detallada de la funcionalidad...

## Decisiones Técnicas
- **Decidimos** usar JWT para autenticación
- **Se implementa** middleware de validación
- **Adoptamos** bcrypt para hash de passwords

## Implementación
Detalles técnicos de implementación...
```

## Campos del Frontmatter YAML

### **Campos Obligatorios**
- `title`: Nombre descriptivo de la funcionalidad
- `tipo`: Tipo de contenido (ver opciones abajo)

### **Campos Opcionales**
- `estado`: Estado actual del contenido
- `prioridad`: Nivel de prioridad
- `tags`: Array de etiquetas para búsqueda
- `responsable`: Persona asignada
- `fecha_inicio`: Fecha de inicio (YYYY-MM-DD)
- `fecha_fin`: Fecha de finalización
- `dependencias`: Array de dependencias con otros archivos
- `version`: Versión del documento
- `sprint`: Número de sprint (se detecta automáticamente)

## Opciones Reconocidas por el MCP

### **Campo `tipo`**
```yaml
tipo: "funcionalidad"    # Funcionalidad nueva
tipo: "lineamiento"      # Lineamiento o guideline
tipo: "decision"         # Decisión técnica
tipo: "general"          # Contenido general (default)
```

### **Campo `estado`**
```yaml
estado: "vigente"        # Activo y válido (default)
estado: "obsoleto"       # Deprecado o reemplazado
estado: "pendiente"      # En desarrollo o planificación
estado: "revision"       # En proceso de revisión
estado: "aprobado"       # Aprobado pero no implementado
```

### **Campo `prioridad`**
```yaml
prioridad: "alta"        # Prioridad alta
prioridad: "media"       # Prioridad media (default)
prioridad: "baja"        # Prioridad baja
prioridad: "critica"     # Crítica/urgente
```

### **Campo `tags`** (Etiquetas Reconocidas)
```yaml
tags: 
  # Tecnologías
  - "auth"          # Autenticación
  - "api"           # APIs y endpoints
  - "bd"            # Base de datos
  - "ui"            # Interfaz de usuario
  - "frontend"      # Frontend
  - "backend"       # Backend
  - "database"      # Base de datos
  - "devops"        # DevOps y deployment
  - "testing"       # Pruebas y QA
  - "config"        # Configuración
  
  # Frameworks
  - "react"
  - "vue"
  - "angular"
  - "nodejs"
  - "express"
  - "fastify"
  
  # Bases de datos
  - "postgres"
  - "mysql"
  - "mongodb"
  
  # DevOps
  - "docker"
  - "kubernetes"
  - "k8s"
```

## Ejemplos Prácticos

### **Ejemplo 1: Funcionalidad de Autenticación**
```markdown
---
title: "Sistema de Autenticación JWT"
tipo: "funcionalidad"
estado: "vigente"
prioridad: "alta"
tags: ["auth", "jwt", "backend", "nodejs"]
responsable: "Juan Pérez"
fecha_inicio: "2024-01-15"
fecha_fin: "2024-01-30"
dependencias: ["base-datos", "api-core"]
version: "1.0"
sprint: "Sprint 1"
---

# Sistema de Autenticación JWT

## Descripción
Implementación de autenticación basada en JSON Web Tokens para el sistema.

## Decisiones Técnicas
- **Decidimos** usar JWT con expiración de 24 horas
- **Se implementa** refresh token con 7 días de validez
- **Adoptamos** bcrypt con salt rounds de 12

## Endpoints
- `POST /auth/login` - Iniciar sesión
- `POST /auth/refresh` - Renovar token
- `POST /auth/logout` - Cerrar sesión

## Implementación
```javascript
const jwt = require('jsonwebtoken');
// Código de implementación...
```
```

### **Ejemplo 2: Lineamiento de Base de Datos**
```markdown
---
title: "Lineamientos de Base de Datos"
tipo: "lineamiento"
estado: "vigente"
prioridad: "alta"
tags: ["bd", "postgres", "lineamiento"]
responsable: "María García"
fecha_inicio: "2024-01-10"
version: "2.1"
sprint: "Sprint 1"
---

# Lineamientos de Base de Datos

## Convenciones de Nomenclatura
- Tablas en plural: `users`, `orders`, `products`
- Campos en snake_case: `created_at`, `user_id`
- Índices descriptivos: `idx_users_email`, `idx_orders_date`

## Decisiones Arquitecturales
- **Decidimos** usar PostgreSQL como base principal
- **Se adopta** UUID para claves primarias
- **Implementamos** soft delete con campo `deleted_at`
```

### **Ejemplo 3: Decisión Técnica**
```markdown
---
title: "Migración a Microservicios"
tipo: "decision"
estado: "aprobado"
prioridad: "critica"
tags: ["arquitectura", "microservicios", "devops"]
responsable: "Equipo Arquitectura"
fecha_inicio: "2024-02-01"
fecha_fin: "2024-03-15"
version: "1.0"
sprint: "Sprint 1"
---

# Decisión: Migración a Arquitectura de Microservicios

## Contexto
El monolito actual presenta problemas de escalabilidad...

## Decisión
**Decidimos** migrar a una arquitectura de microservicios basada en Docker y Kubernetes.

## Consecuencias
- Mejor escalabilidad horizontal
- Mayor complejidad operacional
- Necesidad de service mesh
```