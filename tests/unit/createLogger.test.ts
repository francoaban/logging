import { describe, expect, it } from "vitest";
import { createLogger } from "../../src/createLogger.js";
import { DefaultTransportFactory } from "../../src/infrastructure/transports/DefaultTransportFactory.js";
import { AsyncLocalStorageContextManager } from "../../src/infrastructure/observability/AsyncLocalStorageContextManager.js";
import { type LogTransport } from "../../src/application/ports/LogTransport.js";
import { type TransportWriteResult } from "../../src/application/ports/TransportWriteResult.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";

/** Transport en memoria, registrado como "custom" — el punto de extensión real de Strategy+Factory. */
class ArrayTransport implements LogTransport {
  readonly name = "array";
  readonly records: Record<string, unknown>[] = [];
  async write(line: string): Promise<TransportWriteResult> {
    this.records.push(JSON.parse(line) as Record<string, unknown>);
    return { durable: true };
  }
}

function harness(configOverrides: Record<string, unknown> = {}) {
  const sink = new ArrayTransport();
  const transportFactory = new DefaultTransportFactory().registerCustom("array-sink", () => sink);
  const contextManager = new AsyncLocalStorageContextManager();
  const logger = createLogger(
    { transports: [{ type: "custom", name: "array-sink" }], ...configOverrides },
    { contextManager, transportFactory },
  );
  return { logger, sink, contextManager };
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 10));
}

describe("createLogger — end-to-end", () => {
  it("createLogger() sin argumentos no lanza (plug-and-play real)", () => {
    expect(() => createLogger()).not.toThrow();
  });

  it("un log simple llega al transport configurado con tenant por defecto ('fixed')", async () => {
    const { logger, sink } = harness();
    logger.info("hola", { a: 1 });
    await flush();
    expect(sink.records).toHaveLength(1);
    expect(sink.records[0]).toMatchObject({
      level: "INFO",
      message: "hola",
      tenant_id: "default",
      metadata: { a: 1 },
    });
  });

  it("dentro de contextManager.run(), tenant_id y correlation_id vienen del ExecutionContext activo", async () => {
    const { logger, sink, contextManager } = harness();
    await contextManager.run(
      { tenant_id: TenantId("acme"), correlation_id: "corr-1" },
      async () => {
        logger.info("con contexto");
        await flush();
      },
    );
    expect(sink.records[0]).toMatchObject({ tenant_id: "acme" });
    expect((sink.records[0]?.["context"] as { correlation_id: string }).correlation_id).toBe(
      "corr-1",
    );
  });

  it("tenant 'required' sin ExecutionContext activo: el registro NUNCA llega al transport (fail-closed)", async () => {
    const { logger, sink } = harness({ tenant: { mode: "required" } });
    logger.info("esto se descarta");
    await flush();
    expect(sink.records).toHaveLength(0);
  });

  it("redacción: enmascara los paths configurados sin tocar el resto del objeto", async () => {
    const { logger, sink } = harness({ redaction: { enabled: true, paths: ["password"] } });
    logger.info("login", { user: "f", password: "secreto" });
    await flush();
    expect(sink.records[0]?.["metadata"]).toEqual({ user: "f", password: "[REDACTED]" });
  });

  it("sampling: con rate 0 en un nivel no crítico, nunca llega al transport", async () => {
    const { logger, sink } = harness({
      sampling: { enabled: true, sampledLevels: ["INFO"], rate: 0 },
    });
    logger.info("nunca debería llegar");
    await flush();
    expect(sink.records).toHaveLength(0);
  });

  it("sampling: ERROR/FATAL siempre llegan aunque el sampling esté activo para otros niveles", async () => {
    const { logger, sink } = harness({
      sampling: { enabled: true, sampledLevels: ["INFO"], rate: 0 },
    });
    logger.error("esto sí debe llegar");
    await flush();
    expect(sink.records).toHaveLength(1);
  });

  it("rate limiting: al superar maxPerWindow en un nivel no crítico, los siguientes se descartan", async () => {
    const { logger, sink } = harness({
      rateLimit: { enabled: true, maxPerWindow: 1, windowMs: 60_000, maxTrackedKeys: 10 },
    });
    logger.info("primero");
    logger.info("segundo, debería descartarse");
    await flush();
    expect(sink.records).toHaveLength(1);
    expect(sink.records[0]?.["message"]).toBe("primero");
  });

  it("registerEvent resuelve classification con el EventClassifier por defecto si no se provee", async () => {
    const { logger, sink } = harness();
    logger.event({ type: "order.created", source: "api", payload: { id: 1 } });
    await flush();
    expect(sink.records[0]).toMatchObject({
      record_type: "event",
      classification: { category: "order" },
    });
  });

  it("registerMessage deriva idempotency_key y llega con record_type 'message'", async () => {
    const { logger, sink } = harness();
    logger.message({ status: "sent", payload: { id: 7 } });
    await flush();
    expect(sink.records[0]).toMatchObject({ record_type: "message", status: "sent" });
    expect(typeof sink.records[0]?.["idempotency_key"]).toBe("string");
  });

  it("close() no lanza", async () => {
    const { logger } = harness();
    await expect(logger.close()).resolves.toBeUndefined();
  });
});
