import { describe, expect, it } from "vitest";
import { EventId } from "../../src/domain/value-objects/EventId.js";

const VALID = "01ARZ3NDEKTSV4RRFFQ69G5FAV";

describe("EventId", () => {
  it("acepta un ULID válido de 26 caracteres en Crockford Base32", () => {
    expect(EventId(VALID)).toBe(VALID);
  });

  it("rechaza cadenas cortas o largas", () => {
    expect(() => EventId("ABC")).toThrow(/ULID de 26/);
    expect(() => EventId(VALID + "A")).toThrow(/ULID de 26/);
  });

  it("rechaza caracteres fuera de Crockford Base32 (I, L, O, U) y minúsculas", () => {
    expect(() => EventId("01ARZ3NDEKTSV4RRFFQ69G5FAO")).toThrow(/ULID de 26/);
    expect(() => EventId(VALID.toLowerCase())).toThrow(/ULID de 26/);
  });

  it("rechaza UUIDv4 (formato explícitamente no soportado)", () => {
    expect(() => EventId("550e8400-e29b-41d4-a716-446655440000")).toThrow(/ULID de 26/);
  });
});
