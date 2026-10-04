import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { CompositeLogTransport } from "../../src/infrastructure/transports/CompositeLogTransport.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { CURRENT_SCHEMA_VERSION } from "../../src/domain/value-objects/SchemaVersion.js";
import { type Log } from "../../src/domain/entities/Log.js";
import { type LogTransport } from "../../src/application/ports/LogTransport.js";
import { type WritableSink } from "../../src/application/ports/WritableSink.js";

function log(level: Log["level"]): Log {
  return {
    event_id: EventId("01ARZ3NDEKTSV4RRFFQ69G5FAV"),
    schema_version: CURRENT_SCHEMA_VERSION,
    tenant_id: TenantId("acme"),
    level,
    message: "hola",
    timestamp: "2026-01-01T00:00:00.000Z",
    context: { correlation_id: "corr-1" },
  };
}

function fakeTransport(name: string, result: { durable: boolean; error?: unknown }): LogTransport {
  return {
    name,
    write: vi.fn().mockResolvedValue(result),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

class FakeStderr extends EventEmitter implements WritableSink {
  public written: string[] = [];
  write(chunk: string): boolean {
    this.written.push(chunk);
    return true;
  }
}

describe("CompositeLogTransport", () => {
  it("filtra por minLevel: un transport con umbral ERROR no recibe un INFO", async () => {
    const infoOnly = fakeTransport("console", { durable: true });
    const errorOnly = fakeTransport("http", { durable: true });
    const composite = new CompositeLogTransport([
      { transport: infoOnly, minLevel: "INFO" },
      { transport: errorOnly, minLevel: "ERROR" },
    ]);

    await composite.write("línea", log("INFO"));
    expect(infoOnly.write).toHaveBeenCalledOnce();
    expect(errorOnly.write).not.toHaveBeenCalled();
  });

  it("durable: true si al menos un transport aplicable confirma, aunque otro falle", async () => {
    const ok = fakeTransport("console", { durable: true });
    const fails = fakeTransport("http", { durable: false, error: new Error("caído") });
    const composite = new CompositeLogTransport([
      { transport: ok, minLevel: "INFO" },
      { transport: fails, minLevel: "INFO" },
    ]);

    const result = await composite.write("línea", log("INFO"));
    expect(result.durable).toBe(true);
    expect(result.error).toBeInstanceOf(Error); // se conserva el diagnóstico igual
  });

  it("sin transports aplicables (todos filtrados por nivel) no es una falla", async () => {
    const errorOnly = fakeTransport("http", { durable: true });
    const composite = new CompositeLogTransport([{ transport: errorOnly, minLevel: "ERROR" }]);
    const result = await composite.write("línea", log("DEBUG"));
    expect(result).toEqual({ durable: true });
  });

  it("ERROR/FATAL sin ningún transport durable: escribe a stderr como último recurso", async () => {
    const fails = fakeTransport("http", { durable: false, error: new Error("caído") });
    const stderr = new FakeStderr();
    const composite = new CompositeLogTransport([{ transport: fails, minLevel: "INFO" }], {
      stderr,
    });

    const result = await composite.write("línea crítica", log("FATAL"));
    expect(result.durable).toBe(false);
    expect(stderr.written).toEqual(["línea crítica\n"]);
  });

  it("un nivel no crítico sin ningún transport durable NO escribe a stderr (se pierde, documentado)", async () => {
    const fails = fakeTransport("http", { durable: false, error: new Error("caído") });
    const stderr = new FakeStderr();
    const composite = new CompositeLogTransport([{ transport: fails, minLevel: "INFO" }], {
      stderr,
    });

    await composite.write("línea", log("INFO"));
    expect(stderr.written).toEqual([]);
  });

  it("un transport que lanza en vez de resolver no rompe el fan-out (safeWrite)", async () => {
    const throws: LogTransport = {
      name: "roto",
      write: vi.fn().mockRejectedValue(new Error("no debería pasar")),
    };
    const ok = fakeTransport("console", { durable: true });
    const composite = new CompositeLogTransport([
      { transport: throws, minLevel: "INFO" },
      { transport: ok, minLevel: "INFO" },
    ]);
    const result = await composite.write("línea", log("INFO"));
    expect(result.durable).toBe(true);
  });

  it("close() cierra todos los transports en paralelo, incluso si uno falla", async () => {
    const a = fakeTransport("a", { durable: true });
    const b: LogTransport = {
      name: "b",
      write: vi.fn(),
      close: vi.fn().mockRejectedValue(new Error("no cierra")),
    };
    const composite = new CompositeLogTransport([
      { transport: a, minLevel: "INFO" },
      { transport: b, minLevel: "INFO" },
    ]);
    await expect(composite.close()).resolves.toBeUndefined();
    expect(a.close).toHaveBeenCalledOnce();
  });
});
