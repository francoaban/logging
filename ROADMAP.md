# Roadmap único — Módulo de Logging, Eventos, Mensajes y Reportes

## Estado de este documento

Este es el **único roadmap vigente** del proyecto. Fuera de este archivo, cualquier
cambio de alcance, orden o criterio de salida debe registrarse acá.

| Fase | Objetivo                                        | Estado     | Evidencia / bloqueador siguiente                                                                |
| ---- | ----------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| 1    | Dominio y contratos                             | ✅ Cerrada | `src/domain/**`, contratos en `docs/api/contratos-interfaces.md`                                |
| 2    | Facade, use cases y pipeline                    | ✅ Cerrada | `src/application/use-cases/`, `src/pipeline/**`, tests en `tests/unit/`                         |
| 3    | Transports, configuración validada y rotación   | ✅ Cerrada | `src/infrastructure/**`                                                                         |
| 4    | Middlewares de framework (Express/Fastify/Nest) | Pendiente  | Depende de Facade (lista); criterios más abajo                                                  |
| 5    | Asincronía y resiliencia                        | Pendiente  | Bloqueadores: pool de workers, tamaño máximo de mensaje, números de retry/DLQ, `IdempotencyKey` |
| 6    | Contexto y observabilidad (OpenTelemetry)       | Pendiente  | Bloqueadores: `trace_id`/`span_id` propios y control de cardinalidad                            |
| 7    | Reporting Engine (CQRS + Read Model + formatos) | Pendiente  | Bloqueador: CQRS día 1 vs. contrato desacoplado (YAGNI); PDF fuera del core                     |
| 8    | Autorización de reportes (incl. masking)        | Pendiente  | Bloqueador: query restringida como objeto canónico en application                               |
| 9    | Auditoría                                       | Pendiente  | Bloqueador: store de auditoría separado vs. compartido                                          |
| 10   | Seguridad (lectura y escritura)                 | Pendiente  | Falta suite SEC-01..SEC-17 en `tests/security/`                                                 |
| 11   | Performance (NFR)                               | Pendiente  | Falta ambiente de referencia reproducible                                                       |
| 12   | Packaging y publicación                         | Pendiente  | Bloqueadores: `.gitignore` (`.github/`), registro de publicación, ESM/CJS, split workspaces     |

---

## Conflictos resueltos

### 1. Número de fases: 10, no 11

La diferencia entre las dos versiones era si "Protección de datos" (masking a nivel de
campo) es una fase propia (versión de 11) o parte de "Autorización de Reportes"
(versión de 10). **Se adopta la versión de 10 fases**: el contrato
`AuthorizedReportScope` define `allowedFields` y `maskedFields` como parte de un
mismo resultado de autorización. Separarlos abriría una ventana donde la Fase 8
podría declararse "terminada" sin masking — reportes autorizados pero sin campos
enmascarados. Autorización y masking se entregan juntos o no se entrega ninguna
de las dos.

> Nota: la antigua "Fase 2" del primer documento se descompuso después en tres
> entregables; la numeración actual las separa como Fases 2, 3 y 4 (total de la
> tabla de arriba: 12 entradas).

### 2. Objetivos de rendimiento (Fase 11)

Ninguno de los números originales estaba validado con un benchmark real. Se adopta:

| Métrica                                                                                                         | Valor comprometido (bloqueante para cerrar Fase 11)        | Valor aspiracional (no bloqueante)   |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------ |
| Throughput asíncrono por instancia                                                                              | 5.000 registros/s                                          | 10.000 registros/s tras optimización |
| P95 de `createLog` síncrono (incluye encolado/guardado local, excluye red de persistencia remota)               | < 50 ms                                                    | —                                    |
| P95 de overhead del pipeline síncrono en sí (validación → normalización → redacción → sampling → rate limiting) | ≤ 10 ms                                                    | —                                    |
| Memoria adicional del worker bajo carga nominal                                                                 | ≤ 128 MB                                                   | —                                    |
| Estabilidad de memoria                                                                                          | Sin crecimiento sostenido en prueba de carga de 30 minutos | —                                    |

`createLog` p95 y "overhead de pipeline" **son dos métricas distintas** — los
documentos originales las mezclaban. Ambas se miden y se reportan por separado.

---

## Entregable 1 — Núcleo de logging estable (Fases 1, 2 y 3) ✅

Cierra el primer entregable definido en `docs/plan-entregable.md`: API pública
mínima del logger, contexto de ejecución y correlación, configuración validada,
consola + archivo con rotación, sampling y rate limiting básicos, pruebas unitarias
y validación automatizada. El checklist por capa de ese documento quedó completo y
es el control de cierre de esta etapa. Excluido explícitamente de este entregable:
reportes analíticos, autorización avanzada de reportes, middleware de framework
como prioridad, persistencia de negocio o broker complejo, y optimizaciones sin
benchmark.

Lo que NO incluye, alineado con el criterio de salida de Fase 12: dependencia
directa de Express/Fastify/NestJS ni de un motor de persistencia concreto.

### Validación de cierre del entregable

- [x] `pnpm run typecheck` pasa sin errores
- [x] `pnpm run lint` pasa sin errores ni warnings
- [x] `pnpm run format:check` pasa sin errores
- [x] `pnpm run test` pasa sin errores (165 tests / 32 archivos)
- [x] `pnpm run test:coverage` ~94.3% statements / 95.4% líneas (restante
      deuda nominal: `LoggerConfig.ts` reporta 0% por ser solo tipos)
- [x] `pnpm run build` genera artefactos funcionales en `dist/`
- [x] README refleja el alcance real del entregable

---

## Fase 1 — Dominio y contratos ✅

**Objetivo:** Entidades, value objects y contratos de persistencia y autorización.

**Criterios de salida (cumplidos):**

- Entidades inmutables `Log`, `Event`, `Message`, con `event_id`, timestamps y contexto.
- Interfaces de persistencia definidas en `docs/api/contratos-interfaces.md`.
- Política de retención y clave de idempotencia especificadas.

**Pendientes resueltos antes de iniciar:**

- ✅ `tenant_id` agregado a las tres entidades (`TenantId`).
- ✅ Generador de `event_id` definido: ULID (Crockford Base32, 26 caracteres),
  contrato en `EventId.ts`, puerto `EventIdGenerator.ts`, implementación de
  referencia `UlidEventIdGenerator.ts` + `ulid.ts` puro sin dependencias.
- ✅ `schema_version` como campo real (`SchemaVersion.ts`, `CURRENT_SCHEMA_VERSION = 1`).

**Decisión diferida a Fase 2 (ya resuelta):** si `CreateLog`/`RegisterEvent`/
`RegisterMessage` generan siempre el `event_id` con `EventIdGenerator` o aceptan uno
del cliente. Ver Fase 5 para la política de forja de idempotencia (SEC-17).

## Fase 2 — Facade, Use Cases y Pipeline ✅

**Precondición adelantada de Fase 6:** `CreateLog`, `RegisterEvent` y
`RegisterMessage` requieren un `ExecutionContext` activo (`ContextManager.get`)
para `tenant_id` y `correlation_id` — sin esto no pueden construir una entidad
válida. Implementado: `ExecutionContext.ts`, `ContextManager.ts`,
`AsyncLocalStorageContextManager.ts`, `MissingExecutionContextError.ts`.

**Criterios de salida (cumplidos):**

- Pipeline ordenado: validación → normalización → redacción → sampling → rate
  limiting (la clasificación de eventos se resuelve en `RegisterEvent`, no en el
  pipeline — `Event.classification` es obligatorio en una entidad inmutable, ver
  ).
- `LoggingFacade`, `CreateLog`, `RegisterEvent` y `RegisterMessage` cubiertos por
  pruebas unitarias (`DefaultLoggingFacade.test.ts`, `CreateLog.test.ts`,
  `RegisterEvent.test.ts`, `RegisterMessage.test.ts`).
- Ningún adapter de persistencia o broker importado por el dominio.
- `CreateLog`/`RegisterEvent`/`RegisterMessage` leen `tenant_id`/`correlation_id`
  únicamente de `ContextManager.get` — nunca como parámetro explícito, y lanzan
  `MissingExecutionContextError` si no hay contexto activo (sin fallback silencioso).
- `RateLimitingStep` usa `RateLimiter.tryAcquire` con `key` = nivel (mínimo);
  `SamplingStep` usa `shouldKeep` — ambos con bypass explícito de `ERROR`/`FATAL`
  en el propio step (belt-and-suspenders, aplicado en `SamplingDecision`).

**Pendientes resueltos antes de iniciar:**

- ✅ `tenant_id` llega vía `ExecutionContext` + `AsyncLocalStorage`.
- ✅ Comportamiento ante excepción no controlada dentro de un `ProcessingStep`:
  **política por step** (`onUnexpectedError: "drop" | "pass-through"`), nunca un
  default global — `RedactionStep`/`ValidationStep` hacen `drop`,
  `NormalizationStep`/`SamplingStep`/`RateLimitingStep` hacen `pass-through`.

## Fase 3 — Transports, configuración validada y rotación ✅

| Pieza                                               | Archivo                                                |
| --------------------------------------------------- | ------------------------------------------------------ |
| Formato JSON, resiliente ante circulares/errores    | `infrastructure/formatters/JsonFormatter.ts`           |
| Salida a consola                                    | `infrastructure/transports/ConsoleTransport.ts`        |
| Salida a archivo + rotación                         | `infrastructure/transports/FileTransport.ts`           |
| Salida a servicio externo, retry + circuit breaker  | `infrastructure/transports/HttpTransport.ts`           |
| Fan-out + último recurso a `stderr`                 | `infrastructure/transports/CompositeLogTransport.ts`   |
| Factory extensible (Strategy + Factory)             | `infrastructure/transports/DefaultTransportFactory.ts` |
| Config centralizada y validada                      | `infrastructure/config/loggerConfigSchema.ts` (Zod)    |
| Resolución de tenant (multi-tenant / single-tenant) | `application/services/ExecutionContextResolver.ts`     |
| Rate limiter de ventana fija O(1) amortizado        | `infrastructure/ratelimit/FixedWindowRateLimiter.ts`   |
| Redacción de campos sensibles                       | `infrastructure/redaction/PinoRedactRedactor.ts`       |

Comportamiento y límites documentados en
`docs/architecture/transports-y-configuracion.md`.

**Pendientes (no bloqueantes):**

- Spike: verificar si `rotating-file-stream` expone el `fd` subyacente de forma
  segura para `fsync` manual en líneas `ERROR`/`FATAL`.
- `pino.destination` como posible optimización del transporte de bytes en
  `ConsoleTransport`/`FileTransport`, condicionado al benchmark de la Fase 11.

## Fase 4 — Middlewares de framework (Express / Fastify / Nest)

**Objetivo:** correlationId automático por request en los frameworks más usados,
sin que el core dependa de ninguno de ellos.

**Depende de:** `ContextManager`/`ExecutionContextResolver` (listos) y la Facade
(Fase 2, lista) para adjuntar un logger "hijo" al `request`.

**Criterios de salida (propuestos, no iniciados):**

- Cada middleware toma `x-correlation-id` del request entrante si viene, o genera
  uno nuevo si no — nunca lo inventa si ya existe.
- Cada middleware envuelve el resto del request en
  `contextManager.run(executionContext, next)`.
- Los tres (`Express`, `Fastify`, `Nest`) exponen el mismo comportamiento
  observable — un test de contrato corre la misma suite contra los tres.
- Se publican como _subpath exports_ (`modulo-logging/express`, etc.), con
  Express/Fastify/Nest como `peerDependencies`, nunca como `dependencies` del core.

## Fase 5 — Asincronía y Resiliencia

**Objetivo:** Broker, worker, retry, DLQ, idempotencia y backpressure.

**Criterios de salida:**

- Producer/consumer con retry exponencial acotado, DLQ, backpressure y graceful
  shutdown.
- Claim de idempotencia antes de persistir y métricas de retries, drops y mensajes
  en DLQ.
- Los registros `ERROR` y `FATAL` no se descartan por sampling **ni por
  backpressure** bajo ninguna condición — bajo saturación, la política debe
  degradar (bloquear al productor o forzar DLQ) antes que perder un `ERROR`/`FATAL`.

**Pendientes antes de iniciar:**

- Tamaño del **pool de workers** (concurrencia del consumer), configurable
  (viene del documento histórico, eliminado del repo:
  "Worker pool").
- Tamaño máximo de mensaje antes de publicar al broker (evita payloads gigantes
  que bloqueen la cola o el worker).
- Números concretos de retry/backpressure/DLQ (delay inicial, multiplicador, delay
  máximo, intentos máximos, tamaño máximo del buffer, schema del envelope de la
  DLQ) — nunca existieron en los documentos originales; bloquean escribir tests de
  Fase 5 con resultado binario claro.
- Definir si `IdempotencyKey` (`domain/value-objects/IdempotencyKey.ts`) sigue
  derivándose de `EventId`, o si necesita ser provista por el cliente: si un
  reintento del broker genera un `event_id` nuevo por intento, una clave derivada
  de `event_id` no deduplica nada — hay que decidir qué identifica la operación de
  negocio de forma estable entre reintentos.

## Fase 6 — Contexto y Observabilidad

**Objetivo:** Extender `ContextManager` (ya con AsyncLocalStorage) con OpenTelemetry.

**Criterios de salida:**

- `AsyncLocalStorage` propaga `correlation_id`, `request_id`, `trace_id` y
  `span_id` — la propagación ya está resuelta; esta fase agrega la integración con
  OpenTelemetry sobre el mismo `ContextManager`.
- OpenTelemetry exporta spans, métricas de volumen, latencia, cola, errores y drops.

**Pendientes antes de iniciar:**

- Decidir si el módulo genera `trace_id`/`span_id` propios cuando no hay tracer
  activo en el host, o si depende 100% del contexto externo.
- Definir control de cardinalidad en las métricas (nunca usar `event_id` como
  label/tag).

## Fase 7 — Reporting Engine

**Objetivo:** CQRS + Read Model + formatos JSON/CSV/PDF.

**Criterios de salida:**

- Read Model independiente de los repositorios de escritura.
- Estrategias intercambiables para JSON, CSV y PDF, con límites de tamaño y tiempo.

**Pendientes antes de iniciar:**

- Decidir si CQRS + Read Model separado se implementa desde el día 1 o si se
  arranca sobre el mismo store con el contrato ya desacoplado
  (`ReportQueryRepository`) y se migra cuando el volumen lo justifique (YAGNI).
- Sacar la generación de PDF del core del paquete: adapter opcional
  (`infrastructure/format/`), no dependencia obligatoria.

## Fase 8 — Autorización de Reportes (incluye protección de datos)

**Objetivo:** RBAC + scopes + masking, entregados juntos (ver conflicto resuelto #1).

**Criterios de salida:**

- RBAC y scopes se evalúan antes de construir o ejecutar cualquier query.
- La query efectiva aplica la intersección de filtros solicitados y alcance
  autorizado.
- El resultado se enmascara por campo y formato antes de entregarse al consumidor.

**Pendientes antes de iniciar:**

- La query restringida se construye como un objeto canónico en la capa de
  aplicación (`ReportQueryService`); cada adapter de persistencia solo la traduce
  a su dialecto, nunca re-deriva el scope por su cuenta.

**Pendiente resuelto:**

- ✅ Scope vacío → `allowed: false` + `reason` explícito: `ReportQueryService`
  corta ahí antes de construir la query, no ejecuta una query que devuelve cero
  filas por accidente de filtros vacíos.

## Fase 9 — Auditoría

**Objetivo:** Registrar `REPORT_GENERATED` y `REPORT_ACCESS_DENIED`.

**Criterios de salida:**

- `REPORT_GENERATED` con sujeto, scope efectivo, formato y resultado.
- `REPORT_ACCESS_DENIED` sin incluir filtros o payloads sensibles.

**Pendiente antes de iniciar:**

- Decidir si la auditoría usa el mismo store/retención que los logs operativos o
  uno separado con retención más larga (requisito típico de compliance).

## Fase 10 — Seguridad

**Objetivo:** Suite SEC-01 a SEC-17 (lado de lectura/reportes + lado de escritura).

**Criterios de salida:**

- SEC-01 a SEC-14 cubren IDOR, manipulación de filtros, escalación, exposición de
  campos y scope bypass — tabla completa en
  `docs/architecture/seguridad-autorizacion.md`.
- **SEC-15 a SEC-17, cobertura obligatoria del lado de escritura**: inyección en
  payloads de log (control chars, ANSI, CRLF), flood/DoS por emisor individual, y
  forja de `trace_id`/`event_id` para romper idempotencia o contaminar trazas
  ajenas.
- Fail closed ante identidad, scope o feature toggle ausente — incluyendo: si el
  `FeatureManager` falla, `field_masking` y `report_authorization` caen a
  "desactivado = sin acceso", nunca a "activo sin restricciones".

## Fase 11 — Performance

**Objetivo:** Benchmarks, carga, resiliencia — contra los NFR ya resueltos arriba.

**Criterios de salida:** tabla de NFR en "Conflictos resueltos #2". No se declara
esta fase cerrada sin un ambiente de referencia reproducible documentado
(hardware/instancia, versión de Node, configuración del broker).

## Fase 12 — Packaging y Publicación

**Objetivo:** semantic-release + documentación completa.

**Criterios de salida:**

- Paquete sin dependencia de Express, Fastify, NestJS o un motor de persistencia
  concreto.
- Semantic-release, documentación de adapters, matriz de compatibilidad y ejemplo
  de integración.

**Pendientes antes de iniciar:**

- Corregir `.gitignore`: hoy ignora `.github/` completo, lo que impide versionar
  `.github/workflows/` — necesario para el CI/CD de esta fase.
- Decidir registro de publicación (privado/público) y declararlo en `package.json`.
- Decidir estrategia de salida ESM/CJS (dual o único) y declarar `"type"` en
  `package.json` en consecuencia.
- Evaluar el split a pnpm workspaces (`packages/core`, `packages/adapter-postgres`,
  `packages/adapter-kafka`, `packages/format-pdf`, etc.) **antes** de congelar la
  estructura de carpetas de `src/`.
