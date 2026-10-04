# Seguridad y Autorización RBAC + Scopes

## Principios

- Mínimo privilegio.
- Autorización previa a la consulta.
- Intersección de filtros.
- Masking de campos sensibles.
- Auditoría completa.
- Fail closed ante autenticación, scope o feature toggle ausente.

## Modelo RBAC + Scopes

RBAC determina **qué operaciones** puede realizar un usuario; los scopes
determinan **sobre qué subconjunto de información** puede realizarlas. La
jerarquía de scope es, de más amplio a más específico:

```
tenant
 └── organización (opcional — ausencia = todo el tenant)
 └── equipo (opcional — ausencia = toda la organización)
 └── usuario (opcional — ausencia = todo el equipo)
```

| Dimensión          | Ejemplos                                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------------------- |
| Permission         | `REPORT:GENERATE`, `REPORT:GENERATE:EVENTS`, `REPORT:GENERATE:AUDIT`, `LOG:READ`, `EVENT:READ`, `MESSAGE:READ` |
| Resource           | `logs`, `events`, `messages`, `audit`                                                                          |
| Scope tenant       | Límite exterior, siempre presente — ver `TenantId`.                                                            |
| Scope organización | `organizationId = 10`                                                                                          |
| Scope equipo       | `teamId = 25`                                                                                                  |
| Scope usuario      | `userId = 123`                                                                                                 |
| Fields             | `timestamp`, `event_type`, `severity`, `team_id`                                                               |
| Masked fields      | `email`, `phone`, `IP`, `payload` sensible                                                                     |

La forma exacta del tipo `AuthorizedReportScope` que implementa este modelo está
en `docs/api/contratos-interfaces.md`, que es la fuente de verdad del contrato;
este documento explica el modelo conceptual detrás.

### Ejemplo — autorización por equipo

```
Usuario:
 permissions: [REPORT:GENERATE:EVENTS, EVENT:READ]
 scope: teamIds = [25]

Solicitud: type=EVENTS, filters.teamId=25 → autorizado
Solicitud manipulada: type=EVENTS, filters.teamId=99 → denegado (scope vacío tras
 intersección)

Consulta final: WHERE team_id IN (25) AND <filtros permitidos>
```

## Campos sensibles y Data Masking

El scope define qué registros son visibles y qué campos están disponibles —
esto separa permisos de lectura de permisos sobre información sensible.

| Campo            | Usuario estándar              | Usuario privilegiado     |
| ---------------- | ----------------------------- | ------------------------ |
| `timestamp`      | Visible                       | Visible                  |
| `event_type`     | Visible                       | Visible                  |
| `severity`       | Visible                       | Visible                  |
| `team_id`        | Visible si pertenece al scope | Visible                  |
| `email`          | Enmascarado                   | Visible si posee permiso |
| `phone`          | Enmascarado                   | Visible si posee permiso |
| `IP`             | Según política                | Según permiso            |
| payload sensible | No disponible / enmascarado   | Según permiso explícito  |

## Seguridad contra manipulación de filtros

- Nunca confiar en `organizationId`, `teamId` o `userId` enviados por el cliente.
- Intersectar filtros del cliente con el scope autorizado.
- Si el cliente solicita un ámbito superior al permitido, rechazarlo o reducirlo
  según una política explícita — nunca ampliarlo silenciosamente.
- **Aplicar autorización en cada consulta, incluyendo paginación, exportación y
  reintentos** — no solo en la primera página o la primera llamada.
- No permitir que cambiar el formato (JSON/CSV/PDF) modifique el alcance de datos.
- No permitir que ordenar, agrupar o buscar permita inferir información fuera
  del scope (por ejemplo, un `COUNT` agregado sobre datos restringidos que
  revele algo del conjunto excluido).
- Controlar reportes agregados para evitar exposición indirecta de información
  sensible.
- Auditar denegaciones y accesos exitosos.
- Usar consultas parametrizadas y evitar interpolación directa de filtros.

## Auditoría de reportes

Todo `REPORT_GENERATED`/`REPORT_ACCESS_DENIED` sigue el schema definido en
`docs/api/eventos-auditoria.md`.

## Pruebas de seguridad — SEC-01 a SEC-14

> Esta tabla antes solo existía en el v3 (sección 15).
> El roadmap la exige completa.

| ID     | Prueba                                                | Resultado esperado                                                              |
| ------ | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| SEC-01 | Usuario sin `REPORT:GENERATE` solicita reporte.       | 403 / acceso denegado.                                                          |
| SEC-02 | Usuario con permiso de reporte pero sin `EVENT:READ`. | Acceso denegado.                                                                |
| SEC-03 | Usuario autorizado para `team 25` solicita `team 99`. | No obtiene datos de `team 99`.                                                  |
| SEC-04 | Manipulación de `organizationId`.                     | No amplía el scope.                                                             |
| SEC-05 | Manipulación de `userId`.                             | No permite acceso a otro usuario.                                               |
| SEC-06 | Cambio de formato JSON a CSV/PDF.                     | Mismo scope de datos.                                                           |
| SEC-07 | Paginación intenta saltar fuera del scope.            | No devuelve datos no autorizados.                                               |
| SEC-08 | Exportación masiva.                                   | Mantiene las mismas restricciones.                                              |
| SEC-09 | Campo sensible sin permiso.                           | Ausente o enmascarado.                                                          |
| SEC-10 | Usuario revocado intenta generar reporte.             | Acceso denegado.                                                                |
| SEC-11 | Replay de una solicitud.                              | No permite ampliar privilegios.                                                 |
| SEC-12 | Scope vacío.                                          | No devuelve información.                                                        |
| SEC-13 | Agregación sobre datos restringidos.                  | La consulta respeta el scope antes de agregar.                                  |
| SEC-14 | Cambio de permisos durante consulta concurrente.      | Comportamiento definido por la política de consistencia y cubierto por pruebas. |

### Suite adicional del lado de escritura

Ausente de la tabla original (que solo cubre reportes) — agregada al roadmap:

| ID     | Prueba                                                                              | Resultado esperado                                                     |
| ------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| SEC-15 | Inyección en payload de log (control chars, ANSI, CRLF).                            | Sanitizado antes de persistir/mostrar.                                 |
| SEC-16 | Flood/DoS por un solo emisor.                                                       | Rate limiting corta antes de saturar el pipeline.                      |
| SEC-17 | Forja de `trace_id`/`event_id` para romper idempotencia o contaminar trazas ajenas. | Rechazado o revalidado (ver política de IDs provistos por el cliente). |

## Pruebas por niveles

- **Unitarias:** roles, permissions, scopes, intersección de filtros y masking.
- **Integración:** `ReportQueryService` contra Read Model real.
- **Contract tests:** adapter de autorización e identidad.
- **E2E:** autenticación → autorización → consulta → exportación.
- **Security tests:** IDOR, privilege escalation, filter tampering, field
  exposure y scope bypass (más la suite de escritura de arriba).
- **Load tests:** reportes concurrentes sin degradar las restricciones de
  seguridad.
- **Regression tests:** cada nuevo tipo de reporte debe incluir una matriz de
  permisos/scopes.
