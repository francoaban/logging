# Módulo de Logging, Eventos, Mensajes y Reportes

Módulo de logging reutilizable, agnóstico de framework web y de motor de persistencia,
para aplicaciones Node.js. Registra logs técnicos y funcionales, eventos de negocio y
mensajes, soporta procesamiento síncrono y asíncrono, contexto distribuido, y genera
reportes (JSON, CSV, PDF) con autorización RBAC + scopes y masking de campos sensibles.

> **Estado actual:** Entregable 1 (Fases 1, 2 y 3) **cerrado y validado**.
> Suite verde: 165 tests / 32 archivos, cobertura ~94% statements, `pnpm run validate`
> sin errores. Fuente de verdad del plan: [`ROADMAP.md`](./ROADMAP.md).

---

## Stack y herramientas

| Herramienta    | Versión / Configuración                                                         | Propósito                                                                                           |
| -------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **pnpm**       | `pnpm@9.15.0` (fijado en `packageManager`)                                      | Gestor de paquetes del proyecto. Evita instalaciones con npm/yarn e instalaciones no reproducibles. |
| **Node.js**    | `>=20` (`engines.node`)                                                         | Runtime mínimo soportado (requerido por `AsyncLocalStorage` estable y APIs modernas).               |
| **TypeScript** | `^5.5.0`, `strict: true`, dos configs (`tsconfig.json` + `tsconfig.build.json`) | Tipado fuerte en todo el código fuente (ver [tipado fuerte](#tipado-fuerte)).                       |
| **Vitest**     | `4.1.11` (`vitest` + `@vitest/coverage-v8`)                                     | Test runner único para unitarios, integración y seguridad.                                          |
| **ESLint**     | `^10.11.0` + `typescript-eslint ^8.70.1`                                        | Linting con reglas type-aware.                                                                      |
| **Prettier**   | `^3.9.9`                                                                        | Formato de código consistente.                                                                      |

### Tipado fuerte

`tsconfig.json` habilita, además de `strict: true`:

- `noUncheckedIndexedAccess` — evita asumir que un acceso por índice/clave existe.
- `exactOptionalPropertyTypes` — una propiedad opcional no admite `undefined` implícito.
- `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.
- `noPropertyAccessFromIndexSignature` — obliga a un tipado explícito de objetos dinámicos.
- `useUnknownInCatchVariables` — los errores capturados son `unknown`, no `any`.
- `verbatimModuleSyntax` + `isolatedModules` — compilación predecible módulo a módulo.

| Archivo               | Incluye                                                             | `noEmit` | Uso                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsconfig.json`       | `src/**/*.ts` **y** `tests/**/*.ts`                                 | `true`   | Config base. La usan el editor, `pnpm run typecheck` y ESLint (type-aware). Los tests también quedan tipados estrictamente, pero nunca se compilan a `dist/`. |
| `tsconfig.build.json` | Solo `src/**/*.ts` (excluye `tests/**/*`, `*.spec.ts`, `*.test.ts`) | `false`  | Extiende `tsconfig.json` y la usa `pnpm run build`. Genera `dist/` con `.js`, `.d.ts` y source maps — únicamente el código de producción, nunca los tests.    |

### Scripts disponibles

```bash
pnpm install # instala dependencias (requiere pnpm)
pnpm run clean # elimina dist/
pnpm run build # clean + compila src/ (tsconfig.build.json) a dist/
pnpm run typecheck # valida tipos de src/ + tests/ (tsconfig.json), sin emitir
pnpm run test # corre toda la suite con Vitest
pnpm run test:unit # solo tests/unit
pnpm run test:integration
pnpm run test:security # suite SEC-01..SEC-17 (ver docs/architecture/seguridad-autorizacion.md)
pnpm run test:coverage # cobertura con @vitest/coverage-v8
pnpm run lint # ESLint sobre todo el repo
pnpm run format # Prettier --write
pnpm run format:check # Prettier --check (usado en CI)
pnpm run validate # typecheck + lint + format:check + coverage + build
```

### Criterio de aceptación del entregable base

1. `pnpm install` resuelve dependencias exclusivamente vía `pnpm` (sin lockfile de
   npm/yarn) y respeta `engines.node >= 20`.
2. `pnpm run typecheck` termina sin errores con `strict: true`.
3. `pnpm run lint` y `pnpm run format:check` pasan sin advertencias.
4. `pnpm run test` ejecuta correctamente con **Vitest 4.1.11**.
5. `pnpm run build` genera `dist/` con declaraciones de tipos (`dist/index.d.ts`)
   usando `tsconfig.build.json`, y `dist/` **no contiene** ningún archivo de
   `tests/` ni `*.spec.ts`/`*.test.ts`.
6. `pnpm run typecheck` (con `tsconfig.json`) tipa `src/` **y** `tests/` en modo
   estricto, de forma independiente del build.
7. `pnpm run validate` se ejecuta de punta a punta sin errores.
8. El paquete no declara dependencia directa de Express, Fastify, NestJS ni de un
   motor de persistencia concreto, y su campo `files` solo publica `dist/` y `README.md`.

---

## Estructura del proyecto

Estructura objetivo del paquete (se completa de forma incremental, fase a fase, según
el [roadmap](#roadmap-y-criterios-de-aceptación)).

```text
modulo-logging/
├── package.json
├── tsconfig.json # typecheck de src/ + tests/ (no emite)
├── tsconfig.build.json # build de producción, solo src/ (emite a dist/)
├── .prettierrc.json
├── .gitignore
├── README.md
├── ROADMAP.md # ✅ roadmap único vigente
│
├── src/
│ ├── domain/
│ │ ├── entities/
│ │ │ ├── Log.ts # ✅
│ │ │ ├── Event.ts # ✅
│ │ │ ├── Message.ts # ✅
│ │ │ └── index.ts # ✅
│ │ ├── value-objects/
│ │ │ ├── LogLevel.ts # ✅
│ │ │ ├── TenantId.ts # ✅
│ │ │ ├── SchemaVersion.ts # ✅
│ │ │ ├── EventId.ts # ✅
│ │ │ ├── TraceContext.ts # ✅
│ │ │ ├── ExecutionContext.ts # ✅
│ │ │ ├── Classification.ts # ✅
│ │ │ ├── IdempotencyKey.ts # ✅
│ │ │ ├── RetentionPolicy.ts # ✅
│ │ │ ├── SamplingPolicy.ts # ✅
│ │ │ ├── RateLimitPolicy.ts # ✅
│ │ │ └── index.ts # ✅
│ │ ├── services/
│ │ │ ├── SamplingDecision.ts # ✅ (shouldKeep, puro, random inyectable)
│ │ │ └── index.ts # ✅ — pendiente: — (EventClassifier ya existe, ver abajo)
│ │ └── index.ts # ✅
│ │
│ ├── application/
│ │ ├── use-cases/ #
│ │ ├── queries/ #
│ │ ├── ports/
│ │ │ ├── LogRepository.ts # ✅
│ │ │ ├── EventRepository.ts # ✅
│ │ │ ├── MessageRepository.ts # ✅
│ │ │ ├── ReportQueryRepository.ts # ✅
│ │ │ ├── EventIdGenerator.ts # ✅
│ │ │ ├── ContextManager.ts # ✅
│ │ │ ├── RateLimiter.ts # ✅
│ │ │ └── index.ts # ✅
│ │ └── services/ # ✅
│ │
│ ├── pipeline/ # ✅
│ │ └── steps/
│ │
│ ├── infrastructure/
│ │ ├── persistence/ #
│ │ │ ├── postgres/
│ │ │ ├── mongodb/
│ │ │ ├── read-model/
│ │ │ └── retention/
│ │ ├── authorization/ #
│ │ │ ├── rbac/
│ │ │ └── scopes/
│ │ ├── ratelimit/
│ │ │ └── FixedWindowRateLimiter.ts # ✅ implementación de referencia de RateLimiter
│ │ ├── transports/ # ✅
│ │ ├── queue/ #
│ │ ├── observability/
│ │ │ └── AsyncLocalStorageContextManager.ts # ✅
│ │ ├── format/ #
│ │ ├── audit/ #
│ │ ├── config/ # ✅ loggerConfigSchema (Zod) — pendiente: FeatureManagerImpl, EnvConfig
│ │ └── ids/
│ │ └── UlidEventIdGenerator.ts # ✅ implementación de referencia de EventIdGenerator
│ │
│ ├── interfaces/ # pendiente
│ │ ├── http/
│ │ └── dto/
│ │
│ ├── shared/
│ │ ├── errors/
│ │ │ ├── DomainError.ts # ✅
│ │ │ ├── MissingExecutionContextError.ts # ✅
│ │ │ ├── ConfigurationError.ts # ✅
│ │ │ └── index.ts # ✅ — pendiente: AuthorizationError.ts, ValidationError.ts
│ │ └── utils/
│ │ └── ulid.ts # ✅ algoritmo ULID puro, sin dependencias externas
│ │
│ └── index.ts # ✅ (dominio + puertos + shared/errors)
│
├── tests/
│ ├── unit/ # ✅
│ ├── integration/ # pendiente
│ ├── contract/ # pendiente
│ ├── e2e/ # pendiente
│ ├── security/ # pendiente
│ └── load/ # pendiente
│
└── docs/
 ├── architecture/
 │ ├── arquitectura-c4.md # ✅
 │ ├── diagramas-c4.puml # ✅
 │ ├── patrones-diseno.md # ✅
 │ ├── seguridad-autorizacion.md # ✅
 │ ├── observabilidad.md # ✅
 │ └── transports-y-configuracion.md # ✅
 ├── api/
 │ ├── contratos-interfaces.md # ✅
 │ └── eventos-auditoria.md # ✅
 ├── deployment/ # ✅
 └── development/ # ✅
```

### `src/domain/` — Núcleo de negocio (sin dependencias externas)

No importa nada de `infrastructure/`, brokers, ni motores de persistencia.

| Ruta             | Función                                                                                    | Archivos                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `entities/`      | Entidades inmutables con `event_id`, `tenant_id`, `schema_version`, timestamps y contexto. | ✅ `Log.ts`, `Event.ts`, `Message.ts`, `LoggableRecord.ts`, `index.ts` — pendiente: `Report.ts`                                                                                                                                                                                                                                                                                |
| `value-objects/` | Conceptos de dominio sin identidad propia.                                                 | ✅ `LogLevel.ts`, `TenantId.ts`, `SchemaVersion.ts`, `EventId.ts`, `TraceContext.ts`, `ExecutionContext.ts`, `Classification.ts`, `IdempotencyKey.ts`, `RetentionPolicy.ts`, `SamplingPolicy.ts`, `RateLimitPolicy.ts`, `TenantMode.ts`, `RedactionPolicy.ts`, `RotationPolicy.ts`, `LoggerConfig.ts`, `PipelineConfig.ts`, `index.ts` — pendiente: `AuthorizedReportScope.ts` |
| `services/`      | Lógica de dominio que no pertenece a una sola entidad.                                     | ✅ `EventClassifier.ts`, `SamplingDecision.ts`                                                                                                                                                                                                                                                                                                                                 |

### `src/application/` — Casos de uso y contratos (núcleo de aplicación)

Orquesta el dominio y define los **puertos** (interfaces) que implementará
`infrastructure/`. Los contratos pertenecen aquí, no a infraestructura
(`docs/api/contratos-interfaces.md`).

| Ruta         | Función                                                                        | Archivos                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `use-cases/` | Command: un caso de uso de escritura por archivo.                              | ✅ `CreateLog.ts`, `RegisterEvent.ts`, `RegisterMessage.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `queries/`   | Construcción de consultas de reporting (CQRS, lado lectura).                   | : `ReportQuery.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `ports/`     | Interfaces que la infraestructura implementa; nunca contienen lógica concreta. | ✅ `LogRepository.ts`, `EventRepository.ts`, `MessageRepository.ts`, `ReportQueryRepository.ts`, `EventIdGenerator.ts`, `ContextManager.ts`, `RateLimiter.ts`, `LoggingFacade.ts`, `ProcessingStep.ts`, `Pipeline.ts`, `Dispatcher.ts`, `LogFormatter.ts`, `LogTransport.ts`, `Redactor.ts`, `TransportFactory.ts`, `WriteResult.ts`, `TransportWriteResult.ts`, `WritableSink.ts`, `index.ts` — pendiente: `Broker.ts`, `IdempotencyStore.ts`, `OpenTelemetryAdapter.ts`, `AuthenticatedUser.ts`, `ReportRequest.ts`, `ReportAuthorizationService.ts`, `ReportQueryService.ts`, `DataMaskingService.ts`, `ReportFormatStrategy.ts`, `FeatureManager.ts` |
| `services/`  | Implementaciones de orquestación que solo dependen de `ports/` y `domain/`.    | ✅ `ExecutionContextResolver.ts` — pendiente: `ReportService.ts`, `ReportAuthorizationService.ts`, `DataMaskingService.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

### `src/pipeline/` — Pipeline de procesamiento (Chain of Responsibility)

Orden determinista y obligatorio: validación → normalización → redacción →
sampling → rate limiting. Son 5 pasos: la clasificación de eventos se
resuelve en `RegisterEvent`, no en el pipeline (`Event.classification` es
obligatorio en una entidad inmutable). Cada step declara su
política ante error (`onUnexpectedError: "drop" | "pass-through"`).

| Ruta                    | Función                                                       | Archivos                                                                                                     |
| ----------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ProcessingPipeline.ts` | Compone los `ProcessingStep` en el orden fijado por contrato. | ✅                                                                                                           |
| `steps/`                | Un `ProcessingStep` por responsabilidad.                      | ✅ `ValidationStep.ts`, `NormalizationStep.ts`, `RedactionStep.ts`, `SamplingStep.ts`, `RateLimitingStep.ts` |

### `src/infrastructure/` — Adapters (implementaciones concretas e intercambiables)

Todo lo que depende de una tecnología externa vive aquí, detrás de los puertos de
`application/ports/`.

| Ruta                                            | Función                                                                                      | Archivos previstos                                                                                                                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `persistence/postgres/`, `persistence/mongodb/` | Implementaciones de `LogRepository`, `EventRepository`, `MessageRepository` para cada motor. | `PostgresLogRepository.ts`, `MongoLogRepository.ts`, etc. (pendiente)                                                                                                      |
| `persistence/read-model/`                       | Implementación de `ReportQueryRepository` sobre el read model (ClickHouse/OpenSearch).       | `ReadModelReportQueryRepository.ts` (pendiente)                                                                                                                            |
| `persistence/retention/`                        | Job de purga según `RetentionPolicy`.                                                        | `RetentionPurgeJob.ts` (pendiente)                                                                                                                                         |
| `authorization/rbac/`, `authorization/scopes/`  | Adapter hacia el proveedor de identidad/roles y resolución de scopes.                        | `RbacAdapter.ts`, `ScopeResolver.ts` (pendiente)                                                                                                                           |
| `transports/`                                   | Salidas de logs (además de la persistencia principal).                                       | ✅ `ConsoleTransport.ts`, `FileTransport.ts`, `HttpTransport.ts`, `CompositeLogTransport.ts`, `DefaultTransportFactory.ts`, `JsonFormatter.ts` implícito en `formatters/`  |
| `queue/`                                        | Broker, worker asíncrono y resiliencia .                                                     | `BrokerAdapter.ts` (BullMQ/Kafka/Redis Streams), `AsyncWorker.ts`, `RetryPolicy.ts`, `DeadLetterQueue.ts`, `BackpressureController.ts`, `GracefulShutdown.ts` (pendientes) |
| `observability/`                                | Contexto distribuido y métricas.                                                             | ✅ `AsyncLocalStorageContextManager.ts` — pendiente: `OpenTelemetryAdapterImpl.ts`, `MetricsRecorder.ts`                                                                   |
| `format/`                                       | Estrategias de serialización de reportes.                                                    | `JsonReportFormatStrategy.ts`, `CsvReportFormatStrategy.ts`, `PdfReportFormatStrategy.ts` (pendientes)                                                                     |
| `audit/`                                        | Emisión de eventos de auditoría.                                                             | `AuditReporter.ts` (`REPORT_GENERATED`, `REPORT_ACCESS_DENIED`) (pendiente)                                                                                                |
| `config/`                                       | Feature toggles y configuración de entorno.                                                  | ✅ `loggerConfigSchema.ts` (Zod) — pendiente: `FeatureManagerImpl.ts`, `EnvConfig.ts`                                                                                      |
| `ids/`                                          | Implementación de referencia del puerto `EventIdGenerator`.                                  | ✅ `UlidEventIdGenerator.ts`                                                                                                                                               |

### `src/interfaces/` — Puntos de entrada externos (opcionales)

| Ruta    | Función                                                                                      | Archivos previstos                                              |
| ------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `http/` | Controladores si el módulo se expone vía HTTP (opcional; el core es agnóstico de framework). | `ReportController.ts`                                           |
| `dto/`  | Objetos de transferencia de entrada/salida, separados de las entidades de dominio.           | `CreateLogDto.ts`, `RegisterEventDto.ts`, `ReportRequestDto.ts` |

### `src/shared/` — Utilidades transversales

| Ruta      | Función                                        | Archivos                                                                                                                                               |
| --------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `errors/` | Jerarquía de errores propia del módulo.        | ✅ `DomainError.ts`, `MissingExecutionContextError.ts`, `ConfigurationError.ts`, `index.ts` — pendiente: `AuthorizationError.ts`, `ValidationError.ts` |
| `utils/`  | Helpers sin estado, sin dependencias externas. | ✅ `ulid.ts` (algoritmo ULID puro) — pendiente: `dateUtils.ts`                                                                                         |

### `src/index.ts`

Único punto de entrada público del paquete: expone `LoggingFacade` (`createLog`,
`registerEvent`, `registerMessage`, reporting) y los tipos públicos. Es el único
archivo que `dist/` publica como `main`/`types`.

### `tests/`

Un directorio por nivel de prueba, ejecutable de forma independiente (`pnpm run
test:unit`, `test:integration`, `test:security`, etc.):

| Ruta           | Función                                                                           |
| -------------- | --------------------------------------------------------------------------------- |
| `unit/`        | Reglas de dominio, pipeline, autorización y masking en aislamiento.               |
| `integration/` | `ReportQueryService`/repositorios contra Read Model o base real (Testcontainers). |
| `contract/`    | Verifica que cada adapter cumple su puerto (`LogRepository`, `Broker`, etc.).     |
| `e2e/`         | Flujo completo: autenticación → autorización → consulta → exportación.            |
| `security/`    | Suite SEC-01 a SEC-17 (`docs/architecture/seguridad-autorizacion.md`).            |
| `load/`        | Benchmarks de throughput/latencia.                                                |

### `docs/`

| Ruta            | Contenido                                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `architecture/` | `arquitectura-c4.md`, `diagramas-c4.puml`, `patrones-diseno.md`, `seguridad-autorizacion.md`, `observabilidad.md`, `transports-y-configuracion.md` |
| `api/`          | `contratos-interfaces.md`, `eventos-auditoria.md`                                                                                                  |
| `deployment/`   | Guías de despliegue (placeholder, a completar al final).                                                                                           |
| `development/`  | Guías de desarrollo/contribución (placeholder).                                                                                                    |

---

## Roadmap y criterios de aceptación

> **El roadmap vigente es [`ROADMAP.md`](./ROADMAP.md)**, en la raíz del repositorio.
> Es la única fuente de verdad para fases, criterios de salida y NFR de rendimiento.

## Documentación relacionada

- [`ROADMAP.md`](./ROADMAP.md) — **Roadmap único vigente**, fases y NFR.
- `docs/architecture/arquitectura-c4.md` + `diagramas-c4.puml` — C4 en prosa y PlantUML.
- `docs/api/contratos-interfaces.md` — Contratos de dominio, persistencia, reporting y
  asincronía (apunta al `.ts` real, no repite las interfaces).
- `docs/architecture/seguridad-autorizacion.md` — RBAC/scopes, masking, SEC-01 a SEC-17.
- `docs/api/eventos-auditoria.md` — Schema de `REPORT_GENERATED`/`REPORT_ACCESS_DENIED`.
- `docs/architecture/observabilidad.md` — AsyncLocalStorage, OpenTelemetry y métricas.
- `docs/architecture/patrones-diseno.md` — Patrones de diseño, separados núcleo/reporting.
- `docs/architecture/transports-y-configuracion.md` — Comportamiento y límites de
  transports, redacción, rotación y resiliencia.
- `docs/plan-entregable.md` — Checklist de cierre del entregable 1.
- `docs/plan-cobertura.md` — Plan y estado de cobertura por capa.
- `docs/informe-correcciones-documentacion.md` — Auditoría y modelo documental adoptado.

## Requisitos

- Node.js >= 20
- pnpm 9.15.0

## Licencia

UNLICENSED (uso privado del proyecto).
