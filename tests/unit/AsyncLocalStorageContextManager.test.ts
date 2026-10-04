import { describe, expect, it } from "vitest";
import { AsyncLocalStorageContextManager } from "../../src/infrastructure/observability/AsyncLocalStorageContextManager.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { type ExecutionContext } from "../../src/domain/value-objects/ExecutionContext.js";

function context(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    correlation_id: "corr-1",
    tenant_id: TenantId("tenant-a"),
    ...overrides,
  };
}

describe("AsyncLocalStorageContextManager", () => {
  it("devuelve undefined fuera de cualquier run()", () => {
    const manager = new AsyncLocalStorageContextManager();
    expect(manager.get()).toBeUndefined();
  });

  it("expone el contexto dentro de run()", () => {
    const manager = new AsyncLocalStorageContextManager();
    const result = manager.run(context(), () => manager.get());
    expect(result?.tenant_id).toBe("tenant-a");
    expect(result?.correlation_id).toBe("corr-1");
  });

  it("propaga el contexto a través de fronteras async dentro de run()", async () => {
    const manager = new AsyncLocalStorageContextManager();
    const result = await manager.run(context({ tenant_id: TenantId("tenant-b") }), async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return manager.get();
    });
    expect(result?.tenant_id).toBe("tenant-b");
  });

  it("un run() anidado reemplaza completamente al externo durante su callback", () => {
    const manager = new AsyncLocalStorageContextManager();
    const outerTenant = manager.run(context({ tenant_id: TenantId("outer") }), () => {
      const innerTenant = manager.run(
        context({ tenant_id: TenantId("inner") }),
        () => manager.get()?.tenant_id,
      );
      const afterInner = manager.get()?.tenant_id;
      return { innerTenant, afterInner };
    });
    expect(outerTenant.innerTenant).toBe("inner");
    // Al salir del run() interno, se restaura el contexto externo, no se pierde.
    expect(outerTenant.afterInner).toBe("outer");
  });

  it("dos ejecuciones concurrentes no se pisan entre sí", async () => {
    const manager = new AsyncLocalStorageContextManager();

    const runFor = (tenant: string) =>
      manager.run(context({ tenant_id: TenantId(tenant) }), async () => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 5));
        return manager.get()?.tenant_id;
      });

    const [a, b] = await Promise.all([runFor("concurrent-a"), runFor("concurrent-b")]);
    expect(a).toBe("concurrent-a");
    expect(b).toBe("concurrent-b");
  });
});
