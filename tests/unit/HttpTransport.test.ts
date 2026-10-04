import { describe, expect, it, vi } from "vitest";
import { HttpTransport } from "../../src/infrastructure/transports/HttpTransport.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { CURRENT_SCHEMA_VERSION } from "../../src/domain/value-objects/SchemaVersion.js";
import { type Log } from "../../src/domain/entities/Log.js";
import { type LogTransport } from "../../src/application/ports/LogTransport.js";

const record: Log = {
  event_id: EventId("01ARZ3NDEKTSV4RRFFQ69G5FAV"),
  schema_version: CURRENT_SCHEMA_VERSION,
  tenant_id: TenantId("acme"),
  level: "ERROR",
  message: "hola",
  timestamp: "2026-01-01T00:00:00.000Z",
  context: { correlation_id: "corr-1" },
};

function response(status: number): Response {
  return new Response(null, { status });
}

// Reintentos rápidos: sin esto, un test con maxAttempts>1 tarda segundos reales (backoff exponencial).
const fastResilience = { initialDelayMs: 1, maxDelayMs: 1 };

describe("HttpTransport", () => {
  it("durable: true en el primer intento exitoso", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200));
    const transport = new HttpTransport({ url: "https://example.test/logs", fetchImpl });
    const result = await transport.write("línea", record);
    expect(result).toEqual({ durable: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("reintenta ante un 503 y termina durable: true si el reintento funciona", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(response(503))
      .mockResolvedValueOnce(response(200));
    const transport = new HttpTransport({
      url: "https://example.test/logs",
      fetchImpl,
      resilience: { ...fastResilience, maxAttempts: 3 },
    });
    const result = await transport.write("línea", record);
    expect(result).toEqual({ durable: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("NO reintenta ante un 400 (no transitorio)", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(400));
    const transport = new HttpTransport({
      url: "https://example.test/logs",
      fetchImpl,
      resilience: { ...fastResilience, maxAttempts: 3 },
    });
    const result = await transport.write("línea", record);
    expect(result.durable).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("abre el circuito tras N fallos consecutivos y dejar de llamar a fetch en el siguiente write", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(503));
    const transport = new HttpTransport({
      url: "https://example.test/logs",
      fetchImpl,
      resilience: {
        ...fastResilience,
        maxAttempts: 1,
        circuitBreakerThreshold: 2,
        halfOpenAfterMs: 60_000,
      },
    });

    await transport.write("uno", record); // falla 1
    await transport.write("dos", record); // falla 2 → abre el circuito
    fetchImpl.mockClear();

    const result = await transport.write("tres", record);
    expect(result.durable).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled(); // circuito abierto: no intenta la red
  });

  it("con fallback configurado, degrada a él cuando el circuito está abierto", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(503));
    const fallback: LogTransport = {
      name: "fallback",
      write: vi.fn().mockResolvedValue({ durable: true }),
    };
    const transport = new HttpTransport({
      url: "https://example.test/logs",
      fetchImpl,
      fallback,
      resilience: { ...fastResilience, maxAttempts: 1, circuitBreakerThreshold: 1 },
    });

    const result = await transport.write("línea", record);
    expect(result.durable).toBe(true);
    expect(result.error).toBeDefined(); // se conserva el diagnóstico aunque el fallback haya compensado
    expect(fallback.write).toHaveBeenCalledWith("línea", record);
  });

  it("un timeout cuenta como fallo transitorio y puede reintentar", async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementationOnce(() => Promise.reject(new DOMException("timeout", "TimeoutError")))
      .mockResolvedValueOnce(response(200));
    const transport = new HttpTransport({
      url: "https://example.test/logs",
      fetchImpl,
      resilience: { ...fastResilience, maxAttempts: 2 },
    });
    const result = await transport.write("línea", record);
    expect(result).toEqual({ durable: true });
  });
});
