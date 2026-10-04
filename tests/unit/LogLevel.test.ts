import { describe, expect, it } from "vitest";
import { isCriticalLevel, meetsThreshold } from "../../src/domain/value-objects/LogLevel.js";

describe("isCriticalLevel", () => {
  it("es true solo para ERROR y FATAL", () => {
    expect(isCriticalLevel("ERROR")).toBe(true);
    expect(isCriticalLevel("FATAL")).toBe(true);
    expect(isCriticalLevel("WARN")).toBe(false);
    expect(isCriticalLevel("TRACE")).toBe(false);
  });
});

describe("meetsThreshold", () => {
  it("un nivel se cumple a sí mismo", () => {
    expect(meetsThreshold("INFO", "INFO")).toBe(true);
  });

  it("un nivel más severo cumple un umbral menos severo", () => {
    expect(meetsThreshold("ERROR", "INFO")).toBe(true);
  });

  it("un nivel menos severo NO cumple un umbral más severo", () => {
    expect(meetsThreshold("DEBUG", "WARN")).toBe(false);
  });

  it("TRACE solo cumple el umbral TRACE", () => {
    expect(meetsThreshold("TRACE", "TRACE")).toBe(true);
    expect(meetsThreshold("TRACE", "DEBUG")).toBe(false);
  });
});
