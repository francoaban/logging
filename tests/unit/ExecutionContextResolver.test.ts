import { describe, expect, it, vi } from "vitest";
import { ExecutionContextResolver } from "../../src/application/services/ExecutionContextResolver.js";
import { AsyncLocalStorageContextManager } from "../../src/infrastructure/observability/AsyncLocalStorageContextManager.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { MissingExecutionContextError } from "../../src/shared/errors/MissingExecutionContextError.js";
import { type ExecutionContext } from "../../src/domain/value-objects/ExecutionContext.js";

describe("ExecutionContextResolver", () => {
  it("usa el ExecutionContext activo cuando existe, aunque tenant sea 'fixed'", () => {
    const contextManager = new AsyncLocalStorageContextManager();
    const resolver = new ExecutionContextResolver({
      contextManager,
      tenant: { mode: "fixed", tenantId: TenantId("default") },
      generateCorrelationId: () => "no-debería-usarse",
    });

    const active: ExecutionContext = { tenant_id: TenantId("acme"), correlation_id: "corr-activo" };
    const resolved = contextManager.run(active, () => resolver.resolve());

    expect(resolved).toEqual(active);
  });

  it("sin contexto activo y tenant 'fixed', arma uno con el tenant fijo y un correlation_id nuevo", () => {
    const contextManager = new AsyncLocalStorageContextManager();
    const generateCorrelationId = vi.fn(() => "corr-generado");
    const resolver = new ExecutionContextResolver({
      contextManager,
      tenant: { mode: "fixed", tenantId: TenantId("default") },
      generateCorrelationId,
    });

    const resolved = resolver.resolve();

    expect(resolved).toEqual({ tenant_id: "default", correlation_id: "corr-generado" });
    expect(generateCorrelationId).toHaveBeenCalledTimes(1);
  });

  it("genera un correlation_id distinto en cada llamada sin contexto activo (nunca uno fijo)", () => {
    const contextManager = new AsyncLocalStorageContextManager();
    let counter = 0;
    const resolver = new ExecutionContextResolver({
      contextManager,
      tenant: { mode: "fixed", tenantId: TenantId("default") },
      generateCorrelationId: () => `corr-${++counter}`,
    });

    const first = resolver.resolve();
    const second = resolver.resolve();

    expect(first.correlation_id).not.toBe(second.correlation_id);
  });

  it("sin contexto activo y tenant 'required', falla cerrado con MissingExecutionContextError", () => {
    const contextManager = new AsyncLocalStorageContextManager();
    const resolver = new ExecutionContextResolver({
      contextManager,
      tenant: { mode: "required" },
      generateCorrelationId: () => "no-debería-usarse",
    });

    expect(() => resolver.resolve()).toThrow(MissingExecutionContextError);
  });
});
