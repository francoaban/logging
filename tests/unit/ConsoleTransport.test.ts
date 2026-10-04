import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { ConsoleTransport } from "../../src/infrastructure/transports/ConsoleTransport.js";
import { type WritableSink } from "../../src/application/ports/WritableSink.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { CURRENT_SCHEMA_VERSION } from "../../src/domain/value-objects/SchemaVersion.js";
import { type Log } from "../../src/domain/entities/Log.js";

const record: Log = {
  event_id: EventId("01ARZ3NDEKTSV4RRFFQ69G5FAV"),
  schema_version: CURRENT_SCHEMA_VERSION,
  tenant_id: TenantId("acme"),
  level: "INFO",
  message: "hola",
  timestamp: "2026-01-01T00:00:00.000Z",
  context: { correlation_id: "corr-1" },
};

/** Stream falso: dispara el callback de write() con éxito o error según se configure. */
class FakeStream extends EventEmitter implements WritableSink {
  public written: string[] = [];
  private nextError: Error | undefined;

  failNextWrite(error: Error): void {
    this.nextError = error;
  }

  write(chunk: string, callback?: (error?: Error | null) => void): boolean {
    const error = this.nextError;
    this.nextError = undefined;
    this.written.push(chunk);
    queueMicrotask(() => callback?.(error ?? null));
    return true;
  }
}

describe("ConsoleTransport", () => {
  it("resuelve durable: true cuando el stream acepta la línea", async () => {
    const stream = new FakeStream();
    const transport = new ConsoleTransport({ stream });
    const result = await transport.write("línea", record);
    expect(result).toEqual({ durable: true });
    expect(stream.written).toEqual(["línea\n"]);
  });

  it("resuelve durable: false con el error si el callback de write() falla (ej. EPIPE)", async () => {
    const stream = new FakeStream();
    stream.failNextWrite(new Error("EPIPE"));
    const transport = new ConsoleTransport({ stream });
    const result = await transport.write("línea", record);
    expect(result.durable).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  it("un evento 'error' del stream no tumba el proceso (no hay excepción no controlada)", () => {
    const stream = new FakeStream();
    const listenerCountBefore = stream.listenerCount("error");

    new ConsoleTransport({ stream });
    expect(stream.listenerCount("error")).toBe(listenerCountBefore + 1);
    expect(() => stream.emit("error", new Error("EPIPE"))).not.toThrow();
  });

  it("no agrega un segundo listener de 'error' si dos instancias comparten el mismo stream", () => {
    const stream = new FakeStream();

    new ConsoleTransport({ stream });

    new ConsoleTransport({ stream });
    expect(stream.listenerCount("error")).toBe(1);
  });

  it("close() nunca cierra el stream subyacente (es stdout/stderr del proceso)", async () => {
    const stream = new FakeStream();
    const closeSpy = vi.fn();
    (stream as unknown as { end: () => void }).end = closeSpy;
    await new ConsoleTransport({ stream }).close();
    expect(closeSpy).not.toHaveBeenCalled();
  });
});
