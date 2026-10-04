# Eventos de auditoría de reportes

Toda operación de generación de reportes deja evidencia auditable: metadatos
suficientes para reconstruir quién solicitó qué, sobre qué alcance y con qué
resultado — sin almacenar datos sensibles innecesarios (ver
`docs/architecture/seguridad-autorizacion.md`).

## `REPORT_GENERATED`

```json
{
  "user_id": "string",
  "report_type": "string",
  "format": "json | csv | pdf",
  "scope": "AuthorizedReportScope",
  "filters": "Record<string, unknown>",
  "result_count": "number",
  "correlation_id": "string",
  "trace_id": "string",
  "timestamp": "string (ISO 8601 UTC)"
}
```

## `REPORT_ACCESS_DENIED`

```json
{
  "user_id": "string",
  "report_type": "string",
  "requested_scope": "Record<string, unknown>",
  "reason": "string",
  "correlation_id": "string",
  "trace_id": "string",
  "timestamp": "string (ISO 8601 UTC)"
}
```

**Regla explícita:** `REPORT_ACCESS_DENIED` nunca incluye los filtros
completos que el cliente envió ni ningún payload — solo `requested_scope` (el
scope que se pidió, no los datos) y `reason` en texto libre no sensible.

## Dónde se implementa (pendiente)

El subsistema de auditoría todavía **no tiene implementación** en `src/`:
`AuditReporter` (futuro `infrastructure/audit/AuditReporter.ts`) será el único
componente que emita estos dos eventos. `ReportService` lo invocará al final del
flujo de generación (éxito) y `ReportAuthorizationService` lo invocará en el
punto de rechazo (denegación) — nunca al revés, para que un rechazo no dependa
de que la generación haya llegado a ejecutarse.

Estos schemas son el contrato de emisión, no evidencia de código existente.
