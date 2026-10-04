# Arquitectura C4 — Módulo de Logging

## Nivel 1 — Context

- Developer (Person): diagnostica y configura el módulo.
- Analyst/Support (Person): solicita reportes dentro de su alcance
  _(solo si `reporting` está habilitado)_.
- Node.js Host Application: integra la fachada y aporta el contexto de ejecución.
- Logging Module: registra, procesa, persiste y consulta logs, eventos y mensajes.
- Identity Provider: entrega identidad, roles y scopes verificables
  _(solo relevante si `reporting` + `report_authorization` están habilitados)_.
- Message Broker: transporta registros asíncronos y reintentos.
- Storage / Read Model: conserva escrituras y proyecciones optimizadas para reporting.
- OpenTelemetry Backend: recibe trazas y métricas.
- External Report Consumer: recibe reportes serializados autorizados
  _(opcional)_.

## Nivel 2 — Container

- Public API / Facade: expone `trace`…`fatal`, `event`, `message` y `close`; los casos de uso internos son `CreateLog`, `RegisterEvent`, `RegisterMessage`.
- Application Core: coordina casos de uso, políticas, transacciones y auditoría.
- Domain: contiene entidades, value objects, reglas y puertos sin dependencias externas.
- Processing Pipeline: valida, normaliza, redacta, samplea y limita tasa.
- Async Worker: consume del broker, aplica idempotencia, retry, DLQ y shutdown ordenado.
- Reporting Engine _(opcional)_: autoriza,
  consulta el read model, enmascara y serializa.
- Infrastructure Adapters: implementa repositorios, broker, identidad, formatos y telemetría.

Relaciones principales:

```text
Host Application -> Public API / Facade -> Application Core -> Domain
Application Core -> Processing Pipeline -> Storage / Read Model
Application Core -> Async Worker -> Message Broker
Reporting Engine -> Identity Provider
Reporting Engine -> Storage / Read Model
Reporting Engine -> External Report Consumer
Todos los containers -> OpenTelemetry Backend
```

## Nivel 3 — Component

- LoggingFacade: fachada estable y agnóstica del framework.
- CreateLog / RegisterEvent / RegisterMessage: casos de uso de escritura.
- EventClassifier: asigna tipo, severidad y clasificación funcional.
- FeatureManager: habilita capacidades opcionales por configuración o tenant.
- ContextManager: propaga IDs con `AsyncLocalStorage`.
- ProcessingPipeline: compone los `ProcessingStep` en orden determinista.
- Dispatcher: selecciona procesamiento síncrono o publicación asíncrona.
- ReportService _(opcional)_: coordina el ciclo completo de generación.
- ReportAuthorizationService _(opcional)_: evalúa RBAC, scopes y campos permitidos.
- ReportQueryService _(opcional)_: intersecta filtros autorizados y consulta el read model.
- DataMaskingService _(opcional)_: elimina o enmascara campos sensibles.
- ReportFormatStrategy _(opcional)_: serializa a JSON, CSV o PDF (PDF como adapter separado).

Regla de seguridad: `ReportAuthorizationService` debe
completarse antes de que `ReportQueryService` construya o ejecute una
consulta. `DataMaskingService` se ejecuta antes de `ReportFormatStrategy`; los
eventos de auditoría se emiten para éxito y denegación (ver
`docs/api/eventos-auditoria.md`).
