import { describe, expect, it } from "vitest";
import { JsonFormatter } from "../../src/infrastructure/formatters/JsonFormatter.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { CURRENT_SCHEMA_VERSION } from "../../src/domain/value-objects/SchemaVersion.js";
import { type Log } from "../../src/domain/entities/Log.js";

function baseLog(overrides: Partial<Log> = {}): Log {
  return {
    event_id: EventId("01ARZ3NDEKTSV4RRFFQ69G5FAV"),
    schema_version: CURRENT_SCHEMA_VERSION,
    tenant_id: TenantId("acme"),
    level: "INFO",
    message: "hola",
    timestamp: "2026-01-01T00:00:00.000Z",
    context: { correlation_id: "corr-1" },
    ...overrides,
  };
}

describe("JsonFormatter", () => {
  const formatter = new JsonFormatter();

  it("serializa un Log a una línea JSON válida con record_type", () => {
    const line = formatter.format(baseLog());
    const parsed = JSON.parse(line);
    expect(parsed.record_type).toBe("log");
    expect(parsed.message).toBe("hola");
    expect(parsed.tenant_id).toBe("acme");
  });

  it("una referencia circular en metadata se sustituye en el lugar, sin degradar el resto del registro", () => {
    const circular: Record<string, unknown> = { a: 1 };
    circular["self"] = circular;
    const line = formatter.format(baseLog({ metadata: circular }));
    const parsed = JSON.parse(line);
    // El ciclo se resuelve in situ (safeStringify) — no hace falta perder
    // "message" ni el resto del registro para evitar que JSON.stringify lance.
    expect(parsed.message).toBe("hola");
    expect(parsed.metadata.a).toBe(1);
    expect(parsed.metadata.self).toBe("[Circular]");
  });

  it("si el registro es genuinamente imposible de serializar, cae al fallback mínimo (sin 'message')", () => {
    const poison = {
      get boom(): never {
        throw new Error("getter que explota al leerlo");
      },
    };
    const line = formatter.format(baseLog({ metadata: poison }));
    const parsed = JSON.parse(line);
    // Acá sí se tomó el catch: un getter que lanza no es algo que safeStringify
    // pueda resolver en el lugar (a diferencia de un ciclo), así que el
    // fallback degrada a identidad + motivo, sin "message".
    expect(parsed.message).toBeUndefined();
    expect(parsed.event_id).toBe("01ARZ3NDEKTSV4RRFFQ69G5FAV");
    expect(parsed.formatter_error).toBe("getter que explota al leerlo");
  });

  it("no confunde una referencia repetida (no cíclica) con un ciclo real", () => {
    const shared = { x: 1 };
    const line = formatter.format(baseLog({ metadata: { a: shared, b: shared } }));
    const parsed = JSON.parse(line);
    expect(parsed.metadata.a).toEqual({ x: 1 });
    expect(parsed.metadata.b).toEqual({ x: 1 });
  });

  it("serializa BigInt como string en vez de lanzar", () => {
    const line = formatter.format(baseLog({ metadata: { big: 10n } }));
    expect(JSON.parse(line).metadata.big).toBe("10");
  });

  it("serializa un Error dentro de metadata con name/message/stack", () => {
    const line = formatter.format(baseLog({ metadata: { err: new Error("boom") } }));
    const parsed = JSON.parse(line);
    expect(parsed.metadata.err.message).toBe("boom");
    expect(parsed.metadata.err.name).toBe("Error");
  });
});
