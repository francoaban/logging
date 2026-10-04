# Plan de entregables

> Documento guía. Mantiene la prioridad del desarrollo a nivel de entregables
> alineada con `ROADMAP.md` y con los documentos de arquitectura en
> `docs/architecture/`. Se revisa al cierre de cada entregable.

## Entregable 1 — Núcleo de logging estable ✅ (cerrado)

| Aspecto                             | Detalle                                                                                                                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Objetivo                            | Logger plug-and-play: configuración validada, contexto de correlación, pipeline síncrono y transports.                                                                                                                                                                   |
| Arquitectura cubierta               | C4 Level 1/2 (dominio + application + pipeline), C4 Level 3 (Facade, Use Cases, Steps), patrones Facade / Repository / Chain of Responsibility / Command / Factory / Policy Object. Ver `docs/architecture/arquitectura-c4.md` y `docs/architecture/patrones-diseno.md`. |
| Evidencia                           | `src/domain`, `src/application`, `src/pipeline`, `src/infrastructure` con tests en `tests/unit/`. Suite verde + cobertura registrada en `docs/plan-cobertura.md`. Checklist de cierre en `docs/plan-entregable.md`.                                                      |
| Criterios de aceptación (cumplidos) | CRUD: dominio sin imports de infra, casos de uso leen tenant/correlación de `ContextManager`, pipeline de 5 steps con `onUnexpectedError` por step, transports que no lanzan, `pnpm run validate` en verde.                                                              |
| Pendientes no bloqueantes           | Spike de fsync en `FileTransport`, deuda de cobertura en `domain/value-objects`.                                                                                                                                                                                         |

## Entregable 2 — Middlewares de framework (Fase 4)

| Aspecto                 | Detalle                                                                                                                                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objetivo                | Correlation por request (`x-correlation-id` entrante o nuevo) envolviendo el resto del request en `contextManager.run`, con el mismo comportamiento observable en Express, Fastify y Nest.                     |
| Arquitectura cubierta   | C4 L2: `Public API / Facade` ↔ `Async Worker`/broker transparentes; correlación distribuida del Context (niveles C4).                                                                                          |
| Evidencia               | Middlewares como subpath exports (`modulo-logging/express`, etc.) con Express/Fastify/Nest como `peerDependencies`; una suite de contrato corre la misma batería contra los tres.                              |
| Criterios de aceptación | Nunca se inventa un `correlation_id` si ya existe; cada middleware envuelve el handler en `contextManager.run`; mismo comportamiento observable en los tres frameworks; el core sigue sin depender de ninguno. |
| Dependencias            | Facade y `ExecutionContextResolver` (listos del Entregable 1).                                                                                                                                                 |

## Entregable 3 — Asincronía y resiliencia (Fase 5)

| Aspecto                 | Detalle                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objetivo                | Broker, worker, retry exponencial acotado, DLQ, idempotencia, backpressure y graceful shutdown.                                                                                 |
| Arquitectura cubierta   | C4 L2: `Async Worker` consume de `Message Broker`; persistencia con idempotencia. Patrones Producer/Consumer, Observer.                                                         |
| Evidencia               | `IdempotencyStore`, `Broker`, `OutboxMessage` con contrato testeable; métricas de retries/drops/DLQ.                                                                            |
| Criterios de aceptación | `ERROR`/`FATAL` no se descartan por sampling ni backpressure — degradación antes que pérdida; idempotencia reclamada antes de persistir; números concretos de retry/DLQ/buffer. |
| Bloqueadores a decidir  | Tamaño del pool de workers, tamaño máximo de mensaje, números de retry/DLQ/backpressure, origen de `IdempotencyKey`.                                                            |

## Entregable 4 — Contexto y observabilidad (Fase 6)

| Aspecto                 | Detalle                                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Objetivo                | OpenTelemetry sobre el `ContextManager` existente, con spans, métricas de volumen/latencia/cola/errores/drops y control de cardinalidad. |
| Arquitectura cubierta   | Documentado en `docs/architecture/observabilidad.md`.                                                                                    |
| Criterios de aceptación | `correlation_id`/`request_id`/`trace_id`/`span_id` propagados; export a OTLP; nunca `event_id` como label/tag.                           |
| Bloqueadores            | Decidir si el módulo genera `trace_id`/`span_id` propios o depende 100% del contexto externo.                                            |

## Entregable 5 — Reporting Engine (Fase 7)

| Aspecto                 | Detalle                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Objetivo                | CQRS + Read Model (eventual) + formatos JSON/CSV, con PDF como adapter opcional.                                                      |
| Arquitectura cubierta   | C4 L2 `Reporting Engine`; patrones Strategy/CQRS/Specification.                                                                       |
| Criterios de aceptación | Read Model independiente de repos de escritura; `ReportQueryRepository` como contrato desacoplado desde el día 1; PDF fuera del core. |
| Bloqueador              | CQRS con Read Model separado desde el día 1 vs. contrato desacoplado con migración posterior (YAGNI hasta tener volumen).             |

## Entregable 6 — Autorización de reportes (Fase 8)

| Aspecto                 | Detalle                                                                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objetivo                | RBAC + scopes + masking, entregados juntos (no se puede separar: reportes autorizados sin campos enmascarados es un agujero de seguridad).                                  |
| Arquitectura cubierta   | Modelo en `docs/architecture/seguridad-autorizacion.md`; contratos en `docs/api/contratos-interfaces.md`.                                                                   |
| Criterios de aceptación | RBAC y scopes evaluados antes de construir la query; query restringida = intersección de filtros × alcance; resultado enmascarado por campo y formato; rechazo fail-closed. |
| Bloqueador              | La query restringida se construye como objeto canónico en la capa de aplicación; cada adapter de persistencia solo la traduce.                                              |

## Entregable 7 — Auditoría (Fase 9)

| Aspecto                 | Detalle                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Objetivo                | Emitir `REPORT_GENERATED` y `REPORT_ACCESS_DENIED` según el schema de `docs/api/eventos-auditoria.md`.              |
| Criterios de aceptación | Éxito y rechazo auditados; el rechazo no incluye filtros ni payloads sensibles; `AuditReporter` es el único emisor. |
| Bloqueador              | Store de auditoría separado (retención larga / compliance) vs. compartido con logs operativos.                      |

## Entregable 8 — Seguridad (Fase 10)

| Aspecto                 | Detalle                                                                                                                                                                                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objetivo                | Suite SEC-01 a SEC-17 completa y enlazada al CI.                                                                                                                                                                                   |
| Arquitectura cubierta   | Tabla SEC en `docs/architecture/seguridad-autorizacion.md`.                                                                                                                                                                        |
| Criterios de aceptación | SEC-01…SEC-14 (reportes) + SEC-15…SEC-17 (escritura) pasando; fail closed ante identidad, scope o feature toggle ausente — incluido `FeatureManager` caído ⇒ masking y autorización desactivados, nunca activos sin restricciones. |

## Entregable 9 — Performance (Fase 11)

| Aspecto                 | Detalle                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objetivo                | Benchmarks contra los NFR de `ROADMAP.md` en un ambiente de referencia reproducible.                                                                          |
| Criterios de aceptación | Métricas de throughput, p95 de `createLog`, overhead de pipeline, memoria adicional de worker y estabilidad de memoria a 30 min documentadas y reproducibles. |
| Bloqueador              | Ambiente de referencia reproducible documentado (hardware, Node, configuración del broker).                                                                   |

## Entregable 10 — Packaging y publicación (Fase 12)

| Aspecto                 | Detalle                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objetivo                | Paquete publicable con semantic-release, documentación de adapters, matriz de compatibilidad y ejemplo de integración.                                                |
| Criterios de aceptación | Sin dependencias de framework ni de motor de persistencia en el core; ESM/CJS declarado; registro declarado; `.github/workflows/` versionado (corregir `.gitignore`). |
| Bloqueador              | Decisión de registro, estrategia ESM/CJS y evaluación del split a pnpm workspaces.                                                                                    |
