import { describe, expect, it } from "vitest";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";

describe("TenantId", () => {
  it("acepta cualquier cadena no vacía", () => {
    expect(TenantId("acme")).toBe("acme");
    expect(TenantId("tenant-001")).toBe("tenant-001");
  });

  it("rechaza la cadena vacía", () => {
    expect(() => TenantId("")).toThrow(/vacía/);
  });

  it("rechaza cadenas de solo espacios", () => {
    expect(() => TenantId("   ")).toThrow(/vacía/);
  });
});
