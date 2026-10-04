import { DomainError } from "./DomainError.js";

/**
 * Se lanza cuando un caso de uso (`CreateLog`, `RegisterEvent`,
 * `RegisterMessage`, Fase 2) necesita un `ExecutionContext` activo y
 * `ContextManager.get()` devuelve `undefined`.
 *
 * Fail-closed a propósito (ADR-018): la alternativa sería inventar un
 * `tenant_id` por default, lo que rompería el aislamiento multi-tenant en el
 * primer registro que se cuele sin pasar por `contextManager.run(...)`.
 */
export class MissingExecutionContextError extends DomainError {
  constructor() {
    super(
      "No hay un ExecutionContext activo. ¿Falta envolver esta llamada en " +
        "contextManager.run(executionContext, callback)? Ver ADR-018.",
    );
  }
}
