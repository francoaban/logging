import { describe, expect, it } from "vitest";
import { RedactionPolicy } from "../../src/domain/value-objects/RedactionPolicy.js";

describe("RedactionPolicy", () => {
  it("usa '[REDACTED]' como censor por defecto", () => {
    const policy = RedactionPolicy({ enabled: false, paths: [] });
    expect(policy.censor).toBe("[REDACTED]");
  });

  it("permite censor personalizado", () => {
    const policy = RedactionPolicy({ enabled: true, paths: ["password"], censor: "***" });
    expect(policy.censor).toBe("***");
  });

  it("enabled=true requiere al menos un path", () => {
    expect(() => RedactionPolicy({ enabled: true, paths: [] })).toThrow(/al menos un path/);
  });

  it("enabled=false admite paths vacíos", () => {
    expect(() => RedactionPolicy({ enabled: false, paths: [] })).not.toThrow();
  });
});
