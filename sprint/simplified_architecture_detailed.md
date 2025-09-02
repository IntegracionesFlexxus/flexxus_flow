# Arquitectura Simplificada Detallada - Sistema Integral de Gestión Comercial

## Concepto Arquitectural: Monolito Modular con Separación de Datos

### Filosofía de Diseño
La arquitectura propuesta busca el equilibrio entre simplicidad operacional y separación de responsabilidades. En lugar de microservicios independientes, implementamos un **monolito modular** que mantiene las ventajas de la separación funcional sin la complejidad de múltiples aplicaciones.

### Principios Fundamentales
- **Una aplicación única** que simplifica deployment y debugging
- **Separación lógica por dominios** mediante módulos independientes  
- **Bases de datos especializadas** optimizadas para cada funcionalidad
- **Multi-tenancy nativo** con aislamiento automático por empresa
- **Comunicación interna eficiente** sin overhead de red
- **Evolución independiente** de cada dominio funcional

---

## Visión General de la Arquitectura

### Estructura de Alto Nivel

```
                      FRONTEND ÚNICO
                     (React + TypeScript)
                            │
                            ▼
                   ┌─────────────────┐
                   │   API GATEWAY   │
                   │   (Express.js)  │
                   │  + WebSocket    │
                   └─────────────────┘
                            │
      ┌─────────────────────┼─────────────────────┐
      │                     │                     │
      ▼                     ▼                     ▼
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│    AUTH    │    │    OMNI    │    │    CRM     │    │ WORKFLOW   │
│   MODULE   │    │   MODULE   │    │   MODULE   │    │   MODULE   │
│            │    │ +WebSocket │    │            │    │            │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
      │                     │                     │           │
      ▼                     ▼                     ▼           ▼
┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐
│ Shared DB  │    │  Omni DB   │    │  CRM DB    │    │Workflow DB │
│            │    │            │    │            │    │            │
│• Companies │    │• Channels  │    │• Accounts  │    │• Workflows │
│• Users     │    │• Messages  │    │• Contacts  │    │• Templates │
│• Sessions  │    │• Campaigns │    │• Pipeline  │    │• Executions│
│• Features  │    │• Analytics │    │• Products  │    │• Events    │
└────────────┘    └────────────┘    └────────────┘    └────────────┘
                                                              │
                                                              ▼
                                                    ┌────────────┐
                                                    │ANALYTICS DB│
                                                    │            │
                                                    │• Data Marts│
                                                    │• KPI Views │
                                                    │• Reports   │
                                                    │• Dashboards│
                                                    └────────────┘
```

### Patrón de Comunicación Cross-Módulo

#### Repository Pattern para Acceso Cross-Database
Cada módulo expone servicios que otros módulos pueden consumir, manteniendo el encapsulamiento de datos:

```
CRM Module Service:
- getContactById(id)
- getAccountConversations(accountId) 
- updateContactFromLead(leadData)

Omni Module Service:
- getConversationHistory(contactId)
- sendMessage(contactId, content, channel)
- createLeadFromSubmission(formData)

Auth Module Service:
- validateUser(token, companyId)
- getUserPermissions(userId, companyId)
- switchCompanyContext(userId, newCompanyId)
```

#### Event Bus Interno
Sistema de eventos síncronos para mantener coherencia entre módulos:

```
Eventos Principales:
• lead.captured → CRM Module crea/actualiza contact
• contact.updated → Omni Module actualiza customer info
• opportunity.won → Workflow Module trigger celebration
• message.received → CRM Module log interaction
• user.login → Audit Module log access

Eventos WebSocket (Real-time):
• message.sent → Broadcasting a agents y customer
• conversation.assigned → Notificación en tiempo real
• typing.indicator → Mostrar typing status
• connection.status → Estado de conexión del canal
• sla.alert → Alertas de SLA en tiempo real
```

---

## Dominio 1: AUTH MODULE (Core System)

### Responsabilidades Principales
- **Gestión de usuarios multi-empresa** con roles granulares
- **Autenticación y autorización** con JWT y permisos específicos
- **Feature flags dinámicos** basados en planes de suscripción
- **Configuración global** del sistema por empresa

### Funcionalidades Clave

#### Multi-Company User Management
Los usuarios pueden pertenecer a múltiples empresas con roles diferentes en cada una. El sistema maneja automáticamente el cambio de contexto empresarial sin re-autenticación.

**Flujo de Login:**
1. Usuario ingresa credenciales → Validación
2. Sistema identifica empresas del usuario
3. Si múltiples empresas → Company Selector
4. Genera JWT con company_id específico
5. Frontend se configura según plan y permisos

#### Plan-Based Feature Control
El sistema implementa feature flags dinámicos que se evalúan en tiempo real según el plan de la empresa:

**Planes Contemplados:**
- **Básico**: Omnicanalidad básica, usuarios limitados
- **Profesional**: CRM completo, workflows básicos  
- **Enterprise**: Todas las funcionalidades, integraciones ERP

#### Row-Level Security Implementation
Todas las consultas incluyen automáticamente el filtro por company_id, garantizando aislamiento total de datos entre empresas.

---

## Dominio 2: OMNI MODULE (Comunicaciones)

### Responsabilidades Principales
- **Gestión unificada de canales** (WhatsApp, Instagram, Email, SMS)
- **Conversaciones en tiempo real** con WebSocket bidireccional
- **Landing pages con builder visual** y analytics integrados
- **Email marketing profesional** con automation básico
- **Lead capture automático** desde múltiples fuentes

### Funcionalidades Expandidas

#### Channel Management Avanzado
- **Health monitoring automático** de cada canal
- **Rate limiting inteligente** según límites de API
- **Fallback automático** a canales alternativos
- **Configuration wizard** para setup step-by-step

#### Unified Conversation Interface con WebSocket
- **Real-time messaging bidireccional** con Socket.io
- **Multi-tenant WebSocket namespaces** por empresa
- **Message delivery confirmations** en tiempo real
- **Typing indicators** para mejor UX
- **Connection status management** con reconnection automática
- **Customer identification** por teléfono, email o handle social
- **SLA tracking automático** con alertas proactivas en tiempo real
- **Assignment inteligente** basado en skills y carga de trabajo

#### Advanced Landing Page Builder
- **Drag & drop builder** con componentes pre-construidos
- **A/B testing automático** con significancia estadística
- **Mobile-first responsive** design automático
- **UTM tracking completo** para attribution modeling
- **Real-time analytics** con WebSocket updates

#### Email Marketing Professional
- **Visual email editor** con templates profesionales
- **Segmentation engine** con criterios comportamentales
- **Send-time optimization** por timezone y engagement history  
- **Deliverability optimization** con SendGrid enterprise
- **Automation sequences** con conditional logic

### WebSocket Architecture
- **Namespace isolation** por company_id para multi-tenancy
- **Authentication** con JWT tokens en WebSocket handshake
- **Room management** automático por conversación
- **Broadcasting selective** solo a usuarios autorizados
- **Error handling** robusto con reconnection strategies
- **Load balancing** preparado para múltiples instancias

### Referencias Soft a CRM
El módulo mantiene referencias lógicas a entidades CRM sin foreign keys:
- Conversations → Contact IDs del CRM
- Lead submissions → Lead IDs generados en CRM
- Email contacts → Contact IDs para unificación

---

## Dominio 3: CRM MODULE (Ventas)

### Responsabilidades Principales
Implementa exactamente el modelo definido en el Sprint 7 del documento adjunto, incluyendo:

- **Lead Management completo** con BANT qualification
- **Contact y Account Management** tipo SuiteCRM
- **Pipeline visual configurable** con forecasting automático
- **Opportunity tracking** con stage progression automation
- **Product catalog** y quote generation
- **Activity management** con calendar integration

### Arquitectura de Datos
La base CRM implementa el esquema completo especificado en el Sprint 7:

#### Entidades Principales
- **Reference Tables**: vat_conditions, industries, regions, cities, opportunity_types
- **Core Entities**: leads, accounts, contacts, opportunities  
- **Sales Pipeline**: sales_pipelines, sales_stages, opportunity_stage_history
- **Product Catalog**: products, price_lists, quotes, quote_line_items
- **Activity Tracking**: activities, activity_participants
- **Analytics**: interactions, lead_scoring_history, duplicates

#### Funcionalidades Específicas Argentinas
- **CUIT validation** automática con algoritmo oficial
- **Condición IVA** auto-assignment basado en revenue
- **Zona/Territory management** para assignment geográfico
- **Compliance fiscal** con campos específicos requeridos

### Integración con Omni Module
- **Lead enrichment** desde conversaciones y form submissions
- **Customer context** completo visible en conversations
- **Activity logging** automático desde interacciones multicanal
- **Pipeline triggers** para messaging automático

### Performance y Escalabilidad
- **Índices optimizados** para queries frecuentes (company_id, assigned users)
- **Full-text search** en entidades principales
- **JSONB custom fields** con indexación GIN
- **Soft deletes** para data retention compliance
- **Row-level security** para multi-tenancy automático

---

## Dominio 4: WORKFLOW MODULE (Automatización)

### Responsabilidades Principales
- **Visual workflow builder** no-code estilo Zapier
- **Cross-module orchestration** para procesos complejos
- **Event-driven execution** con triggers automáticos  
- **Template library** con workflows predefinidos por industria
- **Advanced scheduling** con cron expressions y delays

### Capacidades del Engine

#### Visual Designer
- **Drag & drop canvas** con nodos conectables
- **Node library extensible**: triggers, conditions, actions, integrations
- **Smart connection system** que valida compatibilidad
- **Real-time validation** de lógica y configuración
- **Version control** con rollback capability

#### Execution Engine
- **Parallel processing** para workflows complejos
- **Error handling avanzado** con retry logic y dead letter queues
- **Variable system** con transformaciones de datos
- **Conditional logic** multi-nivel con AND/OR operations
- **Audit trail completo** de todas las ejecuciones

#### Cross-Module Actions
El workflow engine puede ejecutar acciones en todos los módulos:

**Omni Actions:**
- Enviar mensaje multicanal
- Crear email campaign
- Actualizar landing page
- Asignar conversación

**CRM Actions:**  
- Crear/actualizar lead/contact/account
- Mover opportunity en pipeline
- Crear actividad o tarea
- Generar quote automático

**Integration Actions:**
- Sincronizar con ERP
- Validar datos externos
- Ejecutar webhook
- Transformar datos

### Templates por Industria
- **Lead nurturing sequences** con touchpoints automáticos
- **Customer onboarding** workflows personalizados
- **Sales process automation** basado en stage changes  
- **Customer service** escalation automática
- **Marketing attribution** cross-channel

---

## Dominio 5: ANALYTICS MODULE (Reporting & Business Intelligence)

### Responsabilidades Principales
- **Dashboards ejecutivos** con KPIs en tiempo real
- **Reportes visuales interactivos** con drill-down capabilities
- **Data aggregation** y ETL desde todos los módulos
- **Custom report builder** no-code para usuarios de negocio
- **Predictive analytics** básico para forecasting

### Arquitectura de Datos Analytics

#### Data Warehouse Approach
- **Analytics DB separada** optimizada para queries de reporting
- **ETL processes** automáticos desde operational databases
- **Materialized views** para performance de dashboards
- **Time-series optimization** para datos históricos
- **Data marts** especializados por dominio de negocio

#### Real-time Analytics
- **Streaming data processing** para KPIs en tiempo real
- **WebSocket integration** para dashboard updates live
- **Event-driven aggregation** desde operational modules
- **Cache layer inteligente** para queries frecuentes

### Funcionalidades Clave

#### Executive Dashboards
- **Revenue dashboard** con attribution multicanal
- **Sales performance** con forecasting y trends
- **Customer acquisition** metrics y conversion funnels
- **Operational efficiency** KPIs cross-modules
- **Marketing ROI** tracking y optimization insights

#### Module-Specific Analytics
- **Omnicanalidad Analytics**: Channel effectiveness, agent productivity, SLA compliance
- **CRM Analytics**: Pipeline performance, win/loss analysis, customer lifetime value
- **Workflow Analytics**: Automation performance, process bottlenecks, ROI measurement
- **Cross-module Analytics**: Customer journey mapping, attribution modeling

#### Custom Reporting Engine
- **Visual report builder** drag-and-drop interface
- **Advanced filtering** con conditional logic
- **Scheduled reports** automáticos por email/dashboard
- **Export capabilities** (PDF, Excel, CSV)
- **Sharing y permissions** granulares

#### Interactive Visualizations
- **Chart library robusta** (D3.js, Recharts, Chart.js)
- **Drill-down capabilities** desde high-level a detalles
- **Filter interactions** cross-chart en dashboards
- **Mobile-optimized** visualization components
- **Real-time updates** vía WebSocket para datos live

### Data Integration Strategy
- **Cross-database queries** optimizadas con proper indexing
- **Data consistency validation** automática
- **Historical data preservation** con retention policies
- **Data quality monitoring** y alerting
- **Privacy compliance** (GDPR, data anonymization)

---

## Integración ERP (Sin Microservicio Separado)

### Enfoque Simplificado
En lugar de un Integration Hub separado, las integraciones ERP se manejan como:

#### Service Layer en CRM Module
- **ERP Connectors** como services dentro del CRM Module
- **Sync jobs** que se ejecutan desde Workflow Module
- **Data transformation** en tiempo real durante sync
- **Conflict resolution** automática con reglas configurables

#### Soporte Inicial: Flexxus ERP
- **Conector nativo** para API de Flexxus
- **Business logic argentina** incorporada (CUIT, facturación)
- **Bidirectional sync** de customers, products, orders
- **Real-time webhooks** para cambios críticos

#### Arquitectura Extensible
- **Generic REST/SOAP** connectors para otros ERPs
- **Plugin system** para conectores personalizados
- **Mapping interface** visual para field transformations
- **Testing framework** para validar integraciones

---

## Ventajas de Esta Arquitectura

### Simplicidad Operacional
- **Single deployment** reduce complejidad DevOps
- **Unified logging** y monitoring más simple
- **Easier debugging** sin comunicación inter-service
- **Shared dependencies** reducen overhead

### Mantenimiento de Beneficios
- **Domain separation** mantiene boundaries claros
- **Independent evolution** de cada módulo
- **Specialized databases** optimizadas para cada uso
- **Testability** granular por módulo

### Performance Optimizada
- **No network latency** entre módulos
- **Shared connection pools** más eficientes
- **Cross-module queries** optimizadas
- **Single transaction context** cuando necesario

### Multi-Tenancy Robusto
- **Automatic data isolation** por company_id
- **Feature flags** dinámicos en tiempo real
- **Plan-based limits** enforcement automático
- **User context switching** sin friction

---

## Patrones de Implementación

### Repository Pattern
Cada módulo implementa repositories que encapsulan acceso a datos y exponen APIs limpias para otros módulos.

### Event-Driven Communication
Sistema de eventos interno para mantener consistency entre módulos sin coupling directo.

### Service Layer Architecture
Services manejan business logic y coordinan entre repositories y external APIs.

### Dependency Injection
IoC container maneja dependencies entre módulos y permite testing aislado.

### Configuration Management
Settings centralizados por empresa con override capabilities por módulo.

---

## Roadmap de Implementación

### Fase 1: Foundation (Semanas 1-8)
- Setup monolito modular con estructura básica
- Implementar Auth Module con multi-tenancy
- Database setup y migrations framework
- Basic frontend con routing modular
- **WebSocket server setup** con authentication y namespaces

### Fase 2: Omni Module (Semanas 9-20)  
- Refactorizar sistema actual manteniendo funcionalidad
- **Implementar WebSocket real-time messaging** con multi-tenancy
- Implementar referencias soft a CRM
- Event system básico
- Landing pages y email marketing upgraded
- **WebSocket optimization** y testing bajo carga

### Fase 3: CRM Module (Semanas 21-36)
- Implementar schema completo del Sprint 7
- Lead management y conversion flows
- Pipeline visual con forecasting  
- Product catalog y quote generation
- Integration con eventos WebSocket desde Omni

### Fase 4: Workflow Module (Semanas 37-48)
- Visual builder con node system
- Cross-module actions implementation
- Template library inicial
- Integration con todos los módulos
- WebSocket triggers para workflows en tiempo real

### Fase 5: Analytics Module (Semanas 49-56)
- Analytics database setup y ETL processes
- Executive dashboards con real-time KPIs
- Module-specific analytics y visualizations
- Custom report builder
- **Real-time analytics** vía WebSocket

### Fase 6: ERP Integration (Semanas 57-64)
- Flexxus connector implementation
- Sync engine con conflict resolution
- Monitoring y alerting
- Testing end-to-end completo

### Fase 7: Optimization & Launch (Semanas 65-72)
- Performance optimization
- Security audit completo
- User acceptance testing
- Documentation y training
- **WebSocket scaling** y production optimization

---

## Consideraciones de Escalabilidad

### Horizontal Scaling
- **Database sharding** por company_id cuando necesario
- **Read replicas** para queries de reporting
- **Caching layer** con Redis para data frecuente
- **CDN integration** para assets estáticos
- **WebSocket scaling** con Redis adapter para múltiples instancias

### Vertical Scaling
- **Connection pooling** optimizado por módulo  
- **Query optimization** con proper indexing
- **Background job processing** para tasks pesadas
- **Memory management** con garbage collection tuning
- **WebSocket connection management** optimizado

### Future Microservices Migration
La arquitectura modular permite migración gradual a microservicios cuando el volumen lo justifique, sin cambios en el frontend.

---

## Conclusión

Esta arquitectura simplificada mantiene toda la funcionalidad especificada en los documentos originales mientras reduce significativamente la complejidad operacional. Permite desarrollo ágil, testing eficiente y deployment simple, mientras preserva la flexibilidad para evolución futura.

El enfoque modular con bases de datos separadas ofrece los beneficios de separación de responsabilidades sin el overhead de microservicios distribuidos, siendo ideal para el tamaño y complejidad actual del proyecto.