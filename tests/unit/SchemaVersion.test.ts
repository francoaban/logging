import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  SchemaVersion,
} from "../../src/domain/value-objects/SchemaVersion.js";

describe("SchemaVersion", () => {
  it("acepta un entero mayor o igual a 1", () => {
    expect(SchemaVersion(1)).toBe(1);
    expect(SchemaVersion(2)).toBe(2);
    expect(SchemaVersion(42)).toBe(42);
  });

  it("rechaza 0, negativos y fracciones", () => {
    expect(() => SchemaVersion(0)).toThrow(/entero >= 1/);
    expect(() => SchemaVersion(-1)).toThrow(/entero >= 1/);
    expect(() => SchemaVersion(1.5)).toThrow(/entero >= 1/);
  });

  it("rechaza NaN", () => {
    expect(() => SchemaVersion(Number.NaN)).toThrow(/entero >= 1/);
  });

  it("CURRENT_SCHEMA_VERSION es la versión vigente del módulo", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
  });
});
