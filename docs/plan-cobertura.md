# Plan de cobertura de pruebas

## Objetivo

Este documento define el plan de cobertura para mantener la calidad del proyecto, priorizando
la validación del comportamiento crítico del módulo de logging y evitando que la cobertura se
use como métrica aislada sin sentido funcional.

La cobertura debe entenderse como una herramienta de riesgo, no como un número decorativo.
La prioridad es validar:

- comportamiento de dominio,
- gestión de contexto,
- sampling y rate limiting,
- validación de configuración,
- transportes críticos,
- resiliencia ante fallos.

---

## Principios

1. La cobertura no sustituye la calidad del test.
2. Un test útil debe verificar comportamiento real y observable.
3. Los casos críticos deben cubrirse antes que los casos marginales.
4. La cobertura debe medirse por capa, no solo globalmente.
5. El objetivo del plan es reducir riesgo funcional y regresiones.

---

## Alcance por capa

### 1) Dominio

Objetivo: asegurar que la lógica de negocio se mantiene determinista y verificable.

Criterios prioritarios:

- `ExecutionContext` y sus invariantes
- `LogLevel` y niveles críticos
- `SamplingPolicy` y `SamplingDecision`
- `RateLimitPolicy` y rate limiting
- validación de `TenantId`, `EventId` y `SchemaVersion`

Umbral recomendado:

- Statements: >= 90%
- Branches: >= 80%
- Functions: >= 90%
- Lines: >= 90%

Archivos clave:

- `src/domain/entities/**`
- `src/domain/value-objects/**`
- `src/domain/services/**`

---

### 2) Aplicación

Objetivo: verificar que los contratos y la orquestación del sistema no rompen la lógica del
núcleo.

Criterios prioritarios:

- gestión de contexto
- resolución de tenant/context
- fallos de contexto no permitido
- orquestación de casos de uso básicos

Umbral recomendado:

- Statements: >= 85%
- Branches: >= 75%
- Functions: >= 85%
- Lines: >= 85%

Archivos clave:

- `src/application/ports/**`
- `src/application/services/**`

---

### 3) Infraestructura crítica

Objetivo: validar comportamiento real de adaptadores y salida.

Criterios prioritarios:

- `AsyncLocalStorageContextManager`
- `ConsoleTransport`
- `FileTransport`
- `HttpTransport`
- `DefaultTransportFactory`
- `loggerConfigSchema`
- `FixedWindowRateLimiter`

Umbral recomendado:

- Statements: >= 85%
- Branches: >= 75%
- Functions: >= 85%
- Lines: >= 85%

Archivos clave:

- `src/infrastructure/**`

---

### 4) Shared / cross-cutting

Objetivo: mantener seguridad y reutilización en utilidades compartidas.

Criterios prioritarios:

- errores críticos
- utilidades de ULID
- wrapper de resiliencia

Umbral recomendado:

- Statements: >= 80%
- Branches: >= 70%
- Functions: >= 80%
- Lines: >= 80%

Archivos clave:

- `src/shared/**`

---

## Cobertura objetivo del proyecto

La meta del proyecto es mantener estos objetivos globales:

- Statements: >= 88%
- Branches: >= 80%
- Functions: >= 90%
- Lines: >= 90%

El proyecto actual ya está muy cerca de esta línea, pero se debe mantener bajo la disciplina de
la revisión por capa y no únicamente por la suma global.

### Estado actual (medido 2026-10-03)

| Área                                | Statements | Branches | Functions | Lines  | Estado vs. objetivo                                        |
| ----------------------------------- | ---------- | -------- | --------- | ------ | ---------------------------------------------------------- |
| Global                              | 94.26%     | 90.43%   | 92%       | 95.45% | ✅ cumple umbral global                                    |
| `domain/entities`                   | 100%       | 90%      | 100%      | 100%   | ✅                                                         |
| `domain/value-objects`              | 89.47%     | 100%     | 71.42%    | 89.47% | ⚠️ nominal: `LoggerConfig.ts` 0% (solo tipos, sin runtime) |
| `domain/services` + pipeline        | 100%       | 83.33%   | 100%      | 100%   | ✅                                                         |
| `application` (use-cases, services) | 93.93%     | 80%      | 100%      | 93.93% | ✅                                                         |
| `infrastructure`                    | 88.3%      | 84.1%    | 91%       | 91.9%  | ✅ (huecos en `FileTransport`)                             |
| `shared` (resilience, errors)       | 80%        | 70%      | 100%      | 75%    | ⚠️ `createResilientExecutor.ts` 80%                        |

Deuda saldada el 2026-10-03: `SchemaVersion`, `EventId`, `TenantId`,
`RedactionPolicy` y `LoggerConfig` ya tienen cobertura en `tests/unit/`.
Resta: `createResilientExecutor` y los huecos en `FileTransport`/`HttpTransport`.

---

## Cobertura mínima por tipo de riesgo

### Riesgo alto

Se consideran de riesgo alto estas áreas:

- configuración
- contexto de ejecución
- sampling
- rate limiting
- transporte de salida
- errores de validación

Cobertura mínima esperada: 90% en statements y branches.

### Riesgo medio

- utilidades compartidas
- adaptadores secundarios
- serialización y fallback

Cobertura mínima esperada: 80% en statements y branches.

### Riesgo bajo

- pequeñas utilidades no críticas
- documentación técnica de referencia
- archivos de exportación o barrel

Cobertura mínima esperada: no imponer un número artificial si no aportan valor funcional.

---

## Revisión del plan

### Frecuencia

- cada pull request,
- cada cierre de sprint,
- y antes de cada release.

### Revisión obligatoria

Se debe revisar si:

- una funcionalidad crítica tiene baja cobertura,
- una rama o condición no está cubierta,
- una regresión potencial no tiene test equivalente,
- una clase de infraestructura clave no tiene pruebas de fallback,
- la cobertura global mejora pero la cobertura por capa cae.

---

## Criterios de aceptación para un PR

Un PR se considera válido si:

- no reduce la cobertura media del proyecto,
- no reduce la cobertura de áreas críticas,
- añade tests para comportamiento nuevo,
- no deja ramas sin cubrir en lógica compleja,
- cubre casos de error y no únicamente happy paths.

---

## Sugerencia de seguimiento operativo

Se recomienda mantener una pequeña tabla de seguimiento en cada sprint:

| Área           | Cobertura actual | Objetivo | Estado       | Acción |
| -------------- | ---------------- | -------- | ------------ | ------ |
| Dominio        | 90%+             | >= 90%   | OK / revisar | —      |
| Application    | 85%+             | >= 85%   | OK / revisar | —      |
| Infrastructure | 85%+             | >= 85%   | OK / revisar | —      |
| Shared         | 80%+             | >= 80%   | OK / revisar | —      |

La prioridad no es llegar a un número absoluto bonito, sino cubrir los riesgos reales del
sistema antes de ampliar funcionalidades de negocio o de infraestructura.

---

## Observación final

La cobertura debe ser una herramienta para decidir si el proyecto está listo para seguir
avanzando. Si un cambio afecta `sampling`, `rate limiting`, `contexto` o `configuración`, debe
estar acompañado por pruebas que cubran:

- comportamiento esperado,
- caso de error,
- caso de borde,
- caso de regresión.

A partir de ese criterio, la cobertura se convierte en un mecanismo de prevención, no en un
simple requisito de reportes.
