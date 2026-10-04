# Checklist de implementación del primer entregable

## Objetivo

Este documento sirve como plan de seguimiento para el primer entregable del proyecto: un núcleo de logging estable, reutilizable y verificable, sin mezclar alcance avanzado de reportes, middleware de framework ni infraestructura de negocio.

La referencia operativa del desarrollo sigue siendo [../ROADMAP.md](../ROADMAP.md). Este documento no sustituye el roadmap, sino que lo descompone en criterios de entrega por capa y por fase.

---

## Alcance del primer entregable

### Incluido

- API pública mínima del logger
- contexto de ejecución y correlación
- configuración validada
- consola + archivo con rotación
- sampling y rate limiting básicos
- pruebas unitarias y de integración clave
- build, lint, typecheck y validación automatizada

### Excluido

- reportes analíticos complejos
- autorización avanzada de reportes
- middleware framework-specific como prioridad
- persistencia de negocio o broker complejo
- optimizaciones prematuras sin benchmark

---

## Seguimiento por capas

### 1) Capa de dominio

Objetivo: modelar la lógica propia del logging sin depender de infrastructure ni de frameworks.

Checklist:

- [ ] Definir la estructura de `Log`, `Event` y `Message`
- [ ] Asegurar que cada entidad incluye `tenant_id`, `correlation_id`, `timestamp` y `schema_version`
- [ ] Validar el modelo de `LogLevel`
- [ ] Implementar `ExecutionContext` con su validación
- [ ] Modelar `SamplingPolicy` con política explícita para niveles críticos
- [ ] Modelar `RateLimitPolicy` con límites de memoria y ventana
- [ ] Definir `TenantId`, `TraceContext` y `IdempotencyKey` como value objects
- [ ] Mantener el dominio libre de imports de framework o infraestructura
- [ ] Verificar invariantes de negocio en pruebas unitarias

Criterios de aceptación:

- El dominio no depende de Express, Fastify, NestJS ni de un motor de persistencia.
- Las entidades son consistentes y verificables por tipo.
- Las policies de sampling y rate limiting están descritas e implementadas de forma determinista.

---

### 2) Capa de aplicación

Objetivo: definir casos de uso y puertos que permitan la implementación técnica sin acoplar el dominio a la infraestructura.

Checklist:

- [ ] Definir puertos para `LogRepository`, `EventRepository` y `MessageRepository`
- [ ] Definir puerto para `ContextManager`
- [ ] Definir puerto para `EventIdGenerator`
- [ ] Definir puerto para `RateLimiter`
- [ ] Definir resolución de contexto de ejecución con `ExecutionContextResolver`
- [ ] Definir la política de fallo si no existe contexto activo
- [ ] Definir la política de fallo si un transporte falla
- [ ] Definir los casosos de uso básicos: creación, registro y publicación
- [ ] Asegurar que los ports definan contratos claros y no dependan de implementaciones

Criterios de aceptación:

- La capa de aplicación puede ejecutarse sobre cualquier implementación de infraestructura.
- Un contexto ausente se maneja con un error explícito y no con un fallback silencioso.
- Las decisiones de resiliencia quedan en la aplicación, no en el dominio.

---

### 3) Capa de infraestructura

Objetivo: implementar la dependencia real del sistema sin contaminar el dominio.

Checklist:

- [ ] Validar y cargar la configuración centralizada
- [ ] Implementar `JsonFormatter` para serialización segura
- [ ] Implementar `ConsoleTransport`
- [ ] Implementar `FileTransport` con rotación
- [ ] Implementar `HttpTransport` con retry y resiliencia básica
- [ ] Implementar `CompositeLogTransport`
- [ ] Implementar `DefaultTransportFactory`
- [ ] Implementar `AsyncLocalStorageContextManager`
- [ ] Implementar `FixedWindowRateLimiter`
- [ ] Implementar `UlidEventIdGenerator`
- [ ] Separar claramente la configuración de runtime y la configuración de transporte

Criterios de aceptación:

- La infraestructura implementa los puertos de aplicación sin cambiar el contrato.
- Los transportes manejan fallos sin romper la ejecución principal.
- El logger funciona con consola y archivo sin requerir frameworks.
- La rotación de archivos y el retry de HTTP están documentados.

---

### 4) Capa compartida / cross-cutting

Objetivo: centralizar utilidades, errores y reutilización transversal.

Checklist:

- [ ] Definir errores de dominio y de contexto
- [ ] Definir `MissingExecutionContextError`
- [ ] Centralizar utilidades de ULID y helpers reutilizables
- [ ] Crear wrapper de resiliencia para ejecuciones con cancelación o reintento
- [ ] Mantener estas piezas sin acoplarse al dominio ni a transports concretos

Criterios de aceptación:

- Los errores tienen semántica clara y son reutilizables.
- Los helpers no introducen dependencias de negocio ni de framework.
- La infraestructura y la aplicación usan los mismos estándares de error.

---

### 5) API pública

Objetivo: exponer una entrada ordenada, pequeña y consistente.

Checklist:

- [ ] Exportar la API pública desde `src/index.ts`
- [ ] Exponer tipos de configuración y de contexto
- [ ] Exponer el logger y la fábrica de transportes
- [ ] Mantener la API de alto nivel mínima y estable
- [ ] Evitar exponer internals no requeridos por el consumidor

Criterios de aceptación:

- El consumidor puede inicializar el módulo con una configuración clara.
- La API pública es pequeña, legible y estable.
- El usuario no necesita conocer detalles de infraestructura para usar el módulo.

---

## Validación global del entregable

Checklist de cierre:

- [ ] `pnpm run typecheck` pasa sin errores
- [ ] `pnpm run lint` pasa sin errores
- [ ] `pnpm run format:check` pasa sin errores
- [ ] `pnpm run test` pasa sin errores
- [ ] `pnpm run test:coverage` alcanza el nivel esperado para el MVP
- [ ] `pnpm run build` genera artefactos funcionales en `dist/`
- [ ] El README refleja el alcance real del entregable
- [ ] El roadmap mantiene la prioridad del desarrollo a nivel de fases

Criterios de aceptación finales:

- El entregable es utilizable en un entorno real sin depender de un framework específico.
- La base del proyecto cumple la arquitectura definida por el dominio y la aplicación.
- El siguiente bloque de trabajo no depende de decisiones ambiguas ni de scope no acotado.

---

## Recomendación de seguimiento

Este documento debe revisarse al final de cada sprint y al cierre de cada fase del roadmap. El estado de cada checkbox debe reflejar si la pieza está:

- pendiente,
- en progreso,
- validada,
- bloqueada,
- o no aplicable en este entregable.

La idea es que este checklist sirva como control real del estado del proyecto y no solo como documento técnico estático.
