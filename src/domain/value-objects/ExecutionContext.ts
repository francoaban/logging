import { type TraceContext } from "./TraceContext.js";
import { type TenantId } from "./TenantId.js";

/**
 * Lo único que viaja por `AsyncLocalStorage` (ver `ContextManager` y
 * ADR-018). Extiende `TraceContext` en vez de reemplazarlo: un
 * `ExecutionContext` completo incluye `correlation_id` + `tenant_id`, y
 * opcionalmente `request_id`/`trace_id`/`span_id`.
 *
 * `CreateLog`/`RegisterEvent`/`RegisterMessage` (Fase 2) separan `tenant_id`
 * (va al campo raíz de la entidad) del resto (va a `context: TraceContext`)
 * al construir cada entidad.
 */
export interface ExecutionContext extends TraceContext {
  readonly tenant_id: TenantId;
}

/**
 * Separa la parte de traza (`TraceContext`) de `tenant_id`, para que
 * `Log.context`/`Event.context`/`Message.context` solo lleven lo que
 * `TraceContext` define (ADR-018) y no dupliquen `tenant_id` dentro.
 */
export function toTraceContext(context: ExecutionContext): TraceContext {
  const { tenant_id: _tenantId, ...trace } = context;
  return trace;
}
