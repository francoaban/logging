# Observabilidad y Contexto Distribuido

> Núcleo del logger — no es parte del reporting opcional.

## Tecnologías

- `AsyncLocalStorage` (nativo de Node.js)
- OpenTelemetry SDK

## Capacidades

- `correlation_id`, `request_id`, `trace_id`, `span_id` — ya definidos como
  `TraceContext` en `src/domain/value-objects/TraceContext.ts`.
- Métricas de volumen, errores, latencia, cola, drops, retries.
- Control de cardinalidad obligatorio: nunca usar `event_id` como
  label/tag de una métrica.
