import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DefaultTransportFactory } from "../../src/infrastructure/transports/DefaultTransportFactory.js";
import { ConfigurationError } from "../../src/shared/errors/ConfigurationError.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { CURRENT_SCHEMA_VERSION } from "../../src/domain/value-objects/SchemaVersion.js";
import {
  type LoggerConfig,
  type TransportConfig,
} from "../../src/domain/value-objects/LoggerConfig.js";
import { type Log } from "../../src/domain/entities/Log.js";
import { type WritableSink } from "../../src/application/ports/WritableSink.js";
import { type LogTransport } from "../../src/application/ports/LogTransport.js";

function log(level: Log["level"] = "INFO"): Log {
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

class FakeSink extends EventEmitter implements WritableSink {
  public written: string[] = [];
  write(chunk: string, callback?: (error?: Error | null) => void): boolean {
    this.written.push(chunk);
    callback?.(null);
    return true;
  }
}

let dir: string;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe("DefaultTransportFactory — create()", () => {
  it("construye un ConsoleTransport", async () => {
    const stdout = new FakeSink();
    const factory = new DefaultTransportFactory({ stdout });
    const transport = factory.create({ type: "console" });
    await transport.write("línea", log());
    expect(stdout.written).toEqual(["línea\n"]);
  });

  it("construye un FileTransport", async () => {
    dir = mkdtempSync(join(tmpdir(), "factory-"));
    const factory = new DefaultTransportFactory();
    const transport = factory.create({
      type: "file",
      path: join(dir, "app.log"),
      rotation: { strategy: "none" },
    });
    const result = await transport.write("línea", log());
    expect(result.durable).toBe(true);
    await transport.close?.();
  });

  it("construye un HttpTransport y resuelve su `fallback` anidado recursivamente (no como instancia)", async () => {
    dir = mkdtempSync(join(tmpdir(), "factory-"));
    const fetchImpl = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const factory = new DefaultTransportFactory({ fetchImpl });
    const config: TransportConfig = {
      type: "http",
      url: "https://example.invalid/logs",
      resilience: { maxAttempts: 1 },
      fallback: { type: "file", path: join(dir, "fallback.log"), rotation: { strategy: "none" } },
    };

    const transport = factory.create(config);
    const result = await transport.write("línea", log());

    // Si `fallback` no se resolviera a una instancia real, esto no podría
    // llegar a durable:true — confirma que la recursión de la Factory ocurrió.
    expect(result.durable).toBe(true);
  });

  it("lanza ConfigurationError ante un transport custom no registrado", () => {
    const factory = new DefaultTransportFactory();
    expect(() => factory.create({ type: "custom", name: "no-existe" })).toThrow(ConfigurationError);
  });

  it("registerCustom(): el builder recibe las `options` y su resultado se usa tal cual (Strategy + Factory)", async () => {
    const factory = new DefaultTransportFactory();
    const custom: LogTransport = {
      name: "custom",
      write: vi.fn().mockResolvedValue({ durable: true }),
    };
    const builder = vi.fn().mockReturnValue(custom);
    factory.registerCustom("mi-transport", builder);

    const transport = factory.create({
      type: "custom",
      name: "mi-transport",
      options: { foo: "bar" },
    });
    await transport.write("línea", log());

    expect(builder).toHaveBeenCalledWith({ foo: "bar" });
    expect(custom.write).toHaveBeenCalledOnce();
  });
});

describe("DefaultTransportFactory — createAll()", () => {
  it("aplica el nivel mínimo por transport (el de la config, o defaultLevel si se omite)", async () => {
    const infoSink = new FakeSink();
    const errorSink = new FakeSink();
    const factory = new DefaultTransportFactory();

    // Dos transports "console" reales no se pueden distinguir por stream propio
    // en esta factory (ambos usan `options.stdout`), así que se registran como
    // custom para poder darle un sink distinto a cada uno y aislar el umbral.
    factory
      .registerCustom("sink-info", () => ({
        name: "sink-info",
        write: async (line: string) => {
          infoSink.write(line);
          return { durable: true };
        },
      }))
      .registerCustom("sink-error", () => ({
        name: "sink-error",
        write: async (line: string) => {
          errorSink.write(line);
          return { durable: true };
        },
      }));

    const config: LoggerConfig = {
      defaultLevel: "INFO",
      tenant: { mode: "fixed", tenantId: TenantId("default") },
      transports: [
        { type: "custom", name: "sink-info" }, // sin `level`: usa defaultLevel (INFO)
        { type: "custom", name: "sink-error", level: "ERROR" },
      ],
    };

    const composite = factory.createAll(config);
    await composite.write("de info", log("INFO"));
    await composite.write("de error", log("ERROR"));

    expect(infoSink.written).toEqual(["de info", "de error"]); // INFO+ pasa el umbral INFO
    expect(errorSink.written).toEqual(["de error"]); // INFO no llega al umbral ERROR
  });
});
