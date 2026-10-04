import { AsyncLocalStorage } from "node:async_hooks";
import { type ContextManager } from "../../application/ports/ContextManager.js";
import { type ExecutionContext } from "../../domain/value-objects/ExecutionContext.js";

/**
 * Implementación de referencia de `ContextManager` (Fase 2, adelantada por
 * ADR-018). Solo envuelve `AsyncLocalStorage` nativo — cero dependencias
 * externas, igual criterio que `UlidEventIdGenerator`.
 *
 * Semántica de anidamiento: si se llama `run()` dentro de otro `run()` ya
 * activo, el contexto interno reemplaza completamente al externo durante la
 * duración de su callback (comportamiento estándar de
 * `AsyncLocalStorage.run`) — no se hace merge de campos entre ambos.
 *
 * En Fase 4 esta clase se extiende para además abrir spans de OpenTelemetry
 * dentro de `run()`; el contrato (`ContextManager`) no cambia.
 */
export class AsyncLocalStorageContextManager implements ContextManager {
  private readonly storage = new AsyncLocalStorage<ExecutionContext>();

  run<T>(context: ExecutionContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  get(): ExecutionContext | undefined {
    return this.storage.getStore();
  }
}
