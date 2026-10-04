# Patrones de Diseño Utilizados

> Reemplaza a `patrones_diseno.md` (raíz del repo). Sin cambios de contenido —
> se agrega solo la nota de alcance (núcleo vs. reporting opcional) para que
> quede claro qué patrones existen aunque un consumidor no use reportes.

## Núcleo (logger)

- **Facade** → API pública simple (`LoggingFacade`).
- **Repository** → Persistencia desacoplada (`LogRepository`, `EventRepository`, `MessageRepository`).
- **Adapter** → Integración con DB, colas y observabilidad.
- **Chain of Responsibility** → Pipeline de filtros (validación → ... → rate limiting).
- **Command** → Casos de uso (`CreateLog`, `RegisterEvent`, `RegisterMessage`).
- **Observer** → Notificación a múltiples destinos (transports).
- **Decorator** → Enriquecimiento y métricas.
- **Factory** → Construcción de adapters.
- **Producer/Consumer** → Asincronía (broker/worker).
- **Policy Object** → Retención configurable (`RetentionPolicy`).

## Reporting (opcional)

- **Strategy** → Formatos de reporte (JSON/CSV/PDF), clasificación de eventos.
- **Specification** → Reglas de autorización y filtros.
- **CQRS** → Separación write/read para reportes.
- **Adapter** (autorización) → Integración con proveedor de identidad.
- **Policy Object** → Autorización configurable.
