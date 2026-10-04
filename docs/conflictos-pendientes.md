# Conflictos y pendientes por resolver

> Plan de resolución de las decisiones bloqueantes detectadas antes de cada
> fase. Cada ítem indica qué hay que decidir, opciones posibles, criterio para
> elegir y qué entrega desbloquea. Se decide antes de iniciar la fase que lo
> consuma.

## Fase 5 — Asincronía y resiliencia

| #    | Decisión pendiente                                                                                                          | Opciones                                                                              | Criterio de resolución                                                                                                                                                                  | Desbloquea                            |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| C-5a | Tamaño del pool de workers (concurrencia del consumer)                                                                      | Constante en código, configurable por env, autoconfigurable por señal de backpressure | Configurable: un logger reutilizable no puede asumir una carga fija; default documentado y ajustable por el host                                                                        | Worker de broker, backpressure        |
| C-5b | Tamaño máximo de mensaje al broker                                                                                          | Límite configurable con rechazo + DLQ                                                 | Rechazar y enrutar a DLQ antes de publicar; evita que un payload gigante bloquee cola/worker                                                                                            | `OutboxMessage`                       |
| C-5c | Tabla concreta de retry / DLQ / backpressure (delay inicial, multiplicador, máximos, intentos, buffer, schema del envelope) | —                                                                                     | Fijar números por defecto y acotados; cualquier desvío va a ADR                                                                                                                         | Tests de Fase 5 con resultado binario |
| C-5d | Origen de `IdempotencyKey`                                                                                                  | Derivada de `event_id` (hoy placeholder) vs. provista por el cliente                  | Una clave derivada de `event_id` no deduplica entre reintentos con nuevo id: **provista por el cliente de negocio** cuando el intento es "la misma operación". Documentar ambos caminos | Claim de idempotencia en el worker    |
| C-5e | Garantía de no-pérdida de `ERROR`/`FATAL`                                                                                   | Estricta (degradación: bloquear productor o forzar DLQ antes que perderlos)           | Ya decidida conceptualmente en `ROADMAP.md`; falta bajarla a política configurada de backpressure                                                                                       | Prueba de carga de la fase            |

## Fase 6 — Contexto y observabilidad

| #    | Decisión pendiente                                            | Opciones                               | Criterio de resolución                                                                                                                                                                                                     | Desbloquea             |
| ---- | ------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| C-6a | `trace_id`/`span_id` propios vs. depende del contexto externo | Generar propios si no hay tracer       | Depende 100% del contexto externo en el core (el host integra OTLP): un logger no inventa trazas; lo documentado es sufficiency para quien no tenga OTLP — documentar el fallback en `docs/architecture/observabilidad.md` | `OpenTelemetryAdapter` |
| C-6b | Control de cardinalidad de labels en métricas                 | Lista de labels permitidos por métrica | Lista blanca documentada en `observabilidad.md`; nunca `event_id` ni payloads como tags                                                                                                                                    | Export de métricas     |

## Fase 7 — Reporting Engine

| #    | Decisión pendiente                                                           | Opciones                     | Criterio de resolución                                                                                                                               | Desbloquea                       |
| ---- | ---------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| C-7a | CQRS + read model separado desde el día 1 o contrato desacoplado y migración | Contrato desacoplado (YAGNI) | `ReportQueryRepository` ya es el punto de inversión; construir infra de read model sin volumen real es sobre-ingeniería. Revisar cuando haya volumen | `ReadModelReportQueryRepository` |
| C-7b | PDF en el core o adapter opcional                                            | Adapter opcional             | PDF fuera de la dependencia base (`@modulo-logging/format-pdf`), mismo criterio que Express/Fastify/Nest como peers                                  | `PdfReportFormatStrategy`        |

## Fase 8 — Autorización de reportes

| #    | Decisión pendiente                      | Opciones                                                        | Criterio de resolución                                                                                                                                                                       | Desbloquea           |
| ---- | --------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| C-8a | Dónde se construye la query restringida | Objeto canónico en la capa de aplicación (`ReportQueryService`) | Decidido: la aplicación construye y cada adapter solo traduce a su dialecto — re-derivar el scope en N adapters abre N oportunidades de bug. Riesgo documentado en `contratos-interfaces.md` | `ReportQueryService` |

## Fase 9 — Auditoría

| #    | Decisión pendiente                                                                           | Opciones                                                    | Criterio de resolución                                                                                                                                                           | Desbloquea      |
| ---- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| C-9a | Store de auditoría: mismo store/retención que logs operativos o separado con retención larga | Separado por defecto si compliance lo exige; soportar ambos | El código admite ambos (`resource: "audit"` en `RetentionPolicy` o repositorio dedicado); la decisión es de despliegue — dejar el puerto agnóstico y documentar ambos topologías | `AuditReporter` |

## Fase 12 — Packaging y publicación

| #     | Decisión pendiente                        | Opciones                                    | Criterio de resolución                                                                                             | Desbloquea                |
| ----- | ----------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| C-12a | `.gitignore` ignora `.github/` completo   | Permitir `.github/workflows/`               | Corregir `.gitignore` para versionar workflows                                                                     | CI/CD de esta fase        |
| C-12b | Registro de publicación (privado/público) | —                                           | Por decidir; declararlo en `package.json` (`private`, `publishConfig`)                                             | `pnpm publish`            |
| C-12c | Estrategia ESM/CJS (dual o único)         | Único ESM (`"type": "module"` ya declarado) | Ya es ESM-only; si emerge necesidad CJS, se evalua dual build                                                      | `dist/`                   |
| C-12d | Split a pnpm workspaces                   | Monolítico vs. `packages/*`                 | Evaluar antes de congelar la estructura de carpetas de `src/` si se distribuirán adapters opcionales como paquetes | Estructura de publicación |

## Seguimiento

- Cada decisión resuelta se registra con fecha y responsable en este documento y,
  cuando corresponda, como nota en `ROADMAP.md` (en el ítem de la fase).
- No se inicia una fase con conflictos `C-` abiertos salvo que el roadmap indique
  explícitamente lo contrario.
