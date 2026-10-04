# Contratos e Interfaces del Módulo

> Fuente de verdad de los contratos: el código `.ts` en `src/`. Este documento
> indexa dónde vive cada contrato y resume su intención — no repetir la forma
> exacta de un contrato que ya está versionado.

## Entrada pública y procesamiento — implementado

| Contrato / Clase           | Archivo                                                | Notas                                                                                                                                                                     |
| -------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LoggingFacade`            | `src/application/ports/LoggingFacade.ts`               | API pública: `trace`…`fatal`, `event(input)`, `message(input)`, `close()`. Fire-and-forget (nunca obliga `await` salvo `close()`).                                        |
| `CreateLogInput`           | `src/application/use-cases/CreateLog.ts`               | `level`, `message`, `metadata?`.                                                                                                                                          |
| `CreateLog`                | `src/application/use-cases/CreateLog.ts`               | `execute(input): Promise<DispatchResult>`. Resuelve contexto, genera `event_id`, corre el pipeline y despacha.                                                            |
| `RegisterEventInput`       | `src/application/ports/LoggingFacade.ts`               | `type`, `source`, `payload`, `classification?` (si falta, la resuelve `EventClassifier`).                                                                                 |
| `RegisterEvent`            | `src/application/use-cases/RegisterEvent.ts`           | Clasifica antes de construir la entidad.                                                                                                                                  |
| `RegisterMessageInput`     | `src/application/ports/LoggingFacade.ts`               | `status`, `payload`.                                                                                                                                                      |
| `RegisterMessage`          | `src/application/use-cases/RegisterMessage.ts`         | `idempotency_key` derivada de `event_id` (placeholder, ver decisión pendiente en `ROADMAP.md`).                                                                           |
| `EventClassifier`          | `src/domain/services/EventClassifier.ts`               | Strategy de clasificación de eventos.                                                                                                                                     |
| `LoggableRecord`           | `src/domain/entities/LoggableRecord.ts`                | `Log \| Event \| Message`; `getRecordType`, `getRecordLevel` (un `Message` `failed` cuenta como `ERROR`).                                                                 |
| `Pipeline`                 | `src/application/ports/Pipeline.ts`                    | Puerto de la pipeline: `run(record, context): Promise<ProcessingOutcome>`. Los casos de uso dependen de este puerto, no de la clase concreta.                             |
| `ProcessingPipeline`       | `src/pipeline/ProcessingPipeline.ts`                   | Chain of Responsibility de referencia: validación → normalización → redacción → sampling → rate limiting.                                                                 |
| `ProcessingStep`           | `src/application/ports/ProcessingStep.ts`              | `name`, `onUnexpectedError: "drop" \| "pass-through"` (obligatorio, sin default), `execute(record, context): Promise<ProcessingOutcome>`.                                 |
| `ProcessingContext`        | `src/application/ports/ProcessingStep.ts`              | Lleva el `ExecutionContext`.                                                                                                                                              |
| `ProcessingOutcome`        | `src/application/ports/ProcessingStep.ts`              | `continue` con el registro, o `drop` con `stepName` y `reason` **no sensible** (nunca el payload).                                                                        |
| `steps/`                   | `src/pipeline/steps/`                                  | `ValidationStep`, `NormalizationStep`, `RedactionStep`, `SamplingStep`, `RateLimitingStep` — 5 steps; la clasificación se resuelve en `RegisterEvent`, no en el pipeline. |
| `Dispatcher`               | `src/application/ports/Dispatcher.ts`                  | `dispatch(record, mode?): Promise<DispatchResult>`. `ProcessingMode` por ahora es solo `"sync"`.                                                                          |
| `DefaultDispatcher`        | `src/infrastructure/dispatch/DefaultDispatcher.ts`     | Implementación de referencia.                                                                                                                                             |
| `DefaultLoggingFacade`     | `src/infrastructure/facade/DefaultLoggingFacade.ts`    | Implementación de referencia de `LoggingFacade`.                                                                                                                          |
| `ExecutionContextResolver` | `src/application/services/ExecutionContextResolver.ts` | Único lugar donde se resuelve el contexto: activo, luego tenant fijo, luego fail-closed.                                                                                  |
| `ContextManager`           | `src/application/ports/ContextManager.ts`              | `run(context, callback)` y `get()`; sin contexto activo, los casos de uso fallan cerrado con `MissingExecutionContextError`.                                              |
| `RateLimiter`              | `src/application/ports/RateLimiter.ts`                 | Genérico sobre `key`: `tryAcquire(key): boolean`. El bypass de `ERROR`/`FATAL` es responsabilidad del caller.                                                             |

## Persistencia — puertos definidos, adapters pendientes

| Contrato                | Archivo                                          | Notas                                                                                                                                                                                         |
| ----------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LogRepository`         | `src/application/ports/LogRepository.ts`         | `save` idempotente por `event_id`; `find` exige `tenant_id`; `purge(policy)`. **Filtros por tenant son obligatorios**: el aislamiento se resuelve en origen.                                  |
| `EventRepository`       | `src/application/ports/EventRepository.ts`       | Igual criterio que `LogRepository`.                                                                                                                                                           |
| `MessageRepository`     | `src/application/ports/MessageRepository.ts`     | Igual criterio; además filtra por `MessageStatus`. Sin `updateStatus` (identidad estable del mensaje).                                                                                        |
| `ReportQueryRepository` | `src/application/ports/ReportQueryRepository.ts` | Contrato mínimo: `aggregate(query): Promise<ReportResult>`. La forma de `ReportQuery` se refina al implementar Reporting. Un filtro de cliente nunca puede ampliar tenants, campos o periodo. |
| `EventIdGenerator`      | `src/application/ports/EventIdGenerator.ts`      | `generate(): EventId` (ULID). Implementación de referencia `infrastructure/ids/UlidEventIdGenerator.ts`.                                                                                      |

## Transports y configuración — implementado

| Contrato                                                                                                                                                                                                                                  | Archivo                                                               | Notas                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LogFormatter`                                                                                                                                                                                                                            | `src/application/ports/LogFormatter.ts`                               | Strategy de serialización a una línea. Implementación: `infrastructure/formatters/JsonFormatter.ts` (nunca lanza).                                                                                                                           |
| `LogTransport`                                                                                                                                                                                                                            | `src/application/ports/LogTransport.ts`                               | Strategy de salida. Un transport **no lanza**: convierte sus fallas en `TransportWriteResult`.                                                                                                                                               |
| `TransportWriteResult`                                                                                                                                                                                                                    | `src/application/ports/TransportWriteResult.ts`                       | Resultado de **un** transport dentro del composite. No se llama `WriteResult` a secas (ese nombre pertenece al puerto de persistencia).                                                                                                      |
| `WriteResult`                                                                                                                                                                                                                             | `src/application/ports/WriteResult.ts`                                | Reservado para el puerto que exponga la escritura a persistencia (sin definir todavía).                                                                                                                                                      |
| `TransportFactory`                                                                                                                                                                                                                        | `src/application/ports/TransportFactory.ts`                           | `create(config)` y `createAll(config)`. Extensible con registro de transports custom.                                                                                                                                                        |
| `WritableSink`                                                                                                                                                                                                                            | `src/application/ports/WritableSink.ts`                               | Subconjunto mínimo de `WritableStream` para transports (ISP).                                                                                                                                                                                |
| `DispatchResult`                                                                                                                                                                                                                          | `src/application/ports/Dispatcher.ts`                                 | Resultado del caso de uso: `dispatched`, `reason?`, `writeResult?`.                                                                                                                                                                          |
| `Dispatcher`                                                                                                                                                                                                                              | `src/application/ports/Dispatcher.ts`                                 | Puerto de despacho al transport.                                                                                                                                                                                                             |
| `loggerConfigSchema` / `parseLoggerConfig`                                                                                                                                                                                                | `src/infrastructure/config/loggerConfigSchema.ts`                     | Validación con Zod (`strictObject`: una clave mal escrita es un error).                                                                                                                                                                      |
| `LoggerConfig`, `RotationPolicy`, `RedactionPolicy`, `RateLimitPolicy`, `SamplingPolicy`, `RetentionPolicy`, `IdempotencyKey`, `Classification`, `TenantMode`, `TenantId`, `TraceContext`, `ExecutionContext`, `SchemaVersion`, `EventId` | `src/domain/value-objects/`                                           | Datos puros, sin dependencias externas.                                                                                                                                                                                                      |
| Transports y formatters                                                                                                                                                                                                                   | `src/infrastructure/transports/`, `src/infrastructure/formatters/`    | `ConsoleTransport`, `FileTransport` (rotación), `HttpTransport` (retry + circuit breaker), `CompositeLogTransport`, `DefaultTransportFactory`, `JsonFormatter`. Comportamiento y límites: `docs/architecture/transports-y-configuracion.md`. |
| `Redactor`                                                                                                                                                                                                                                | `src/application/ports/Redactor.ts`                                   | Puerto de redacción de campos sensibles sin exponer la librería detrás del adapter. Implementación: `infrastructure/redaction/PinoRedactRedactor.ts`.                                                                                        |
| `FixedWindowRateLimiter`                                                                                                                                                                                                                  | `src/infrastructure/ratelimit/FixedWindowRateLimiter.ts`              | Ventana fija en memoria, acotado por `maxTrackedKeys`.                                                                                                                                                                                       |
| `AsyncLocalStorageContextManager`                                                                                                                                                                                                         | `src/infrastructure/observability/AsyncLocalStorageContextManager.ts` | Implementación nativa de `ContextManager`.                                                                                                                                                                                                   |
| `createResilientExecutor`                                                                                                                                                                                                                 | `src/shared/resilience/createResilientExecutor.ts`                    | Retry + circuit breaker genérico para adapters.                                                                                                                                                                                              |

> Nota semántica: `DispatchResult` (caso de uso completo) ≠ `TransportWriteResult`
> (un solo transport). Dos conceptos de niveles distintos que casi terminan
> compartiendo nombre — deliberadamente no se llaman igual.

## Autorización y reporting — opcional, no implementado

> Esta sección solo aplica si el consumidor habilita `reporting`.

| Contrato                     | Estado    | Notas                                                                                                                |
| ---------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------- |
| `AuthenticatedUser`          | pendiente | `subject`, `roles`, `scopes`/`permissions` — forma exacta a definir junto con `AuthorizedReportScope`.               |
| `ReportRequest`              | pendiente | `query` + `format`.                                                                                                  |
| `AuthorizedReportScope`      | pendiente | Forma ya conceptualizada; no redefinir acá.                                                                          |
| `ReportAuthorizationService` | pendiente | `authorize(user, request): Promise<AuthorizedReportScope>`. Evalúa RBAC + scopes antes de construir cualquier query. |
| `ReportQueryService`         | pendiente | Construye la query restringida (intersección filtros × scope) como objeto canónico en la capa de aplicación.         |
| `DataMaskingService`         | pendiente | `mask(result, fields): ReportResult`.                                                                                |
| `ReportFormatStrategy`       | pendiente | `serialize(result): Promise<Uint8Array \| string>`. PDF es un adapter opcional, no dependencia del core.             |

La consulta efectiva es la intersección entre los filtros del usuario y
`AuthorizedReportScope` — un filtro del cliente nunca puede ampliar tenants,
organizaciones, equipos, usuarios, campos, tipos de evento o periodo. Los
rechazos y las generaciones autorizadas se emiten como eventos de auditoría
(`docs/api/eventos-auditoria.md`).

## Asincronía — puertos y formas pendientes

| Contrato               | Estado    | Forma provisoria                                                                                   |
| ---------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| `Broker`               | pendiente | `publish(message: OutboxMessage): Promise<void>`; `consume(handler): Promise<void>`.               |
| `IdempotencyStore`     | pendiente | `claim(key: string, ttlMs: number): Promise<boolean>`, reclamado antes de persistir en el worker.  |
| `FeatureManager`       | pendiente | `isEnabled(feature: FeatureName, context?: TraceContext): boolean`. Criterio fail-closed si falla. |
| `OpenTelemetryAdapter` | pendiente | `record(name: string, attributes?: Record<string, string \| number \| boolean>): void`.            |

Los fallos agotados en el worker se envían a la DLQ. `ProcessingMode = "async"`
se agrega con el broker; hoy solo existe `"sync"`.

### Decisiones de migración (históricas, a propósito)

- **`LogRecord` → `LoggableRecord`** — el documento original usaba `LogRecord` sin definirlo;
  `LoggableRecord` (`Log | Event | Message`, `domain/entities/`) cubre el mismo rol.
- **`WriteResult` → nombre separado por nivel** — el resultado de un transport se llama
  `TransportWriteResult` y el resultado del caso de uso completo es `DispatchResult`;
  `WriteResult` queda reservado para persistencia.
- **`ContextManager` evolucionó** — trabaja con `ExecutionContext` (que extiende
  `TraceContext` con `tenant_id`), no con `TraceContext` a secas.
- **`MessageRepository` sin `updateStatus`** — el estado de un mensaje es estable por
  contrato; es de escritura.
