import { type ExecutionContext } from "../../domain/value-objects/ExecutionContext.js";

/**
 * Adelantado de Fase 4 a Fase 2 (ADR-018): `CreateLog`/`RegisterEvent`/
 * `RegisterMessage` no pueden construir una entidad válida sin
 * `tenant_id`/`correlation_id`, y ese valor solo puede venir de acá.
 *
 * `run` es lo que llama el host una vez por unidad lógica de trabajo
 * (middleware HTTP, handler de job, consumer de un mensaje). `get` es lo que
 * llaman los casos de uso — puede devolver `undefined` si se invoca fuera de
 * un `run()` activo, y en ese caso el caso de uso debe fallar cerrado con
 * `MissingExecutionContextError`, nunca inventar un valor por default.
 *
 * La implementación de referencia (`AsyncLocalStorageContextManager`,
 * `infrastructure/observability/`) es intencionalmente mínima en Fase 2 —
 * solo propaga el contexto. La integración con OpenTelemetry (spans,
 * métricas) se agrega en Fase 4 extendiendo la misma implementación, sin
 * cambiar este contrato.
 */
export interface ContextManager {
  run<T>(context: ExecutionContext, callback: () => T): T;
  get(): ExecutionContext | undefined;
}
