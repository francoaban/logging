import { TenantId } from "../../../src/domain/value-objects/TenantId.js";
import { type ExecutionContext } from "../../../src/domain/value-objects/ExecutionContext.js";
import { type ExecutionContextResolver } from "../../../src/application/services/ExecutionContextResolver.js";

export function fakeExecutionContext(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return { tenant_id: TenantId("tenant-test"), correlation_id: "corr-test", ...overrides };
}

/** Resolver fijo: devuelve siempre el mismo contexto, sin pasar por AsyncLocalStorage. */
export function fakeResolver(
  context: ExecutionContext = fakeExecutionContext(),
): ExecutionContextResolver {
  return { resolve: () => context } as ExecutionContextResolver;
}
