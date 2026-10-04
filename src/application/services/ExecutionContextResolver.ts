import { type ContextManager } from "../ports/ContextManager.js";
import { type ExecutionContext } from "../../domain/value-objects/ExecutionContext.js";
import { type TenantMode } from "../../domain/value-objects/TenantMode.js";
import { MissingExecutionContextError } from "../../shared/errors/MissingExecutionContextError.js";

export interface ExecutionContextResolverOptions {
  readonly contextManager: ContextManager;
  readonly tenant: TenantMode;
  /** Se usa solo cuando no hay contexto activo (script, cron, CLI: no hay "request"). */
  readonly generateCorrelationId: () => string;
}

/**
 * Único lugar donde se resuelve el `ExecutionContext` (ADR-018 + ADR-020).
 * Orden: (1) contexto activo, siempre gana; (2) `tenant.mode === "fixed"`, con
 * un `correlation_id` nuevo por llamada; (3) fail-closed.
 *
 * `correlation_id` no tiene modo "fijo" a propósito: si registros no
 * relacionados compartieran un ID fijo, la correlación dejaría de servir.
 */
export class ExecutionContextResolver {
  constructor(private readonly options: ExecutionContextResolverOptions) {}

  resolve(): ExecutionContext {
    const active = this.options.contextManager.get();
    if (active !== undefined) return active;

    const { tenant } = this.options;
    if (tenant.mode === "fixed") {
      return { tenant_id: tenant.tenantId, correlation_id: this.options.generateCorrelationId() };
    }
    throw new MissingExecutionContextError();
  }
}
