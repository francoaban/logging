import { describe, expect, it } from "vitest";
import { CreateLog } from "../../src/application/use-cases/CreateLog.js";
import { RegisterEvent } from "../../src/application/use-cases/RegisterEvent.js";
import { RegisterMessage } from "../../src/application/use-cases/RegisterMessage.js";
import { DefaultEventClassifier } from "../../src/domain/services/EventClassifier.js";
import { ExecutionContextResolver } from "../../src/application/services/ExecutionContextResolver.js";
import { ProcessingPipeline } from "../../src/pipeline/ProcessingPipeline.js";
import {
  NormalizationStep,
  RateLimitingStep,
  RedactionStep,
  SamplingStep,
  ValidationStep,
} from "../../src/pipeline/steps/index.js";
import { DefaultDispatcher } from "../../src/infrastructure/dispatch/DefaultDispatcher.js";
import { AsyncLocalStorageContextManager } from "../../src/infrastructure/observability/AsyncLocalStorageContextManager.js";
import { FixedWindowRateLimiter } from "../../src/infrastructure/ratelimit/FixedWindowRateLimiter.js";
import { PinoRedactRedactor } from "../../src/infrastructure/redaction/PinoRedactRedactor.js";
import { JsonFormatter } from "../../src/infrastructure/formatters/JsonFormatter.js";
import { UlidEventIdGenerator } from "../../src/infrastructure/ids/UlidEventIdGenerator.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { SamplingPolicy } from "../../src/domain/value-objects/SamplingPolicy.js";
import { RateLimitPolicy } from "../../src/domain/value-objects/RateLimitPolicy.js";
import { RedactionPolicy } from "../../src/domain/value-objects/RedactionPolicy.js";
import { type LogTransport } from "../../src/application/ports/LogTransport.js";
import { type TransportWriteResult } from "../../src/application/ports/TransportWriteResult.js";

function buildHarness(config?: {
  readonly sampleRate?: number;
  readonly rateLimitMax?: number;
  readonly tenantMode?: "fixed" | "required";
}) {
  const lines: string[] = [];
  const transport: LogTransport = {
    name: "memory",
    write: async (line: string): Promise<TransportWriteResult> => {
      lines.push(line);
      return { durable: true };
    },
  };
  const contextManager = new AsyncLocalStorageContextManager();
  const tenantMode =
    config?.tenantMode === "required"
      ? ({ mode: "required" } as const)
      : ({ mode: "fixed", tenantId: TenantId("tenant-integration") } as const);
  const contextResolver = new ExecutionContextResolver({
    contextManager,
    tenant: tenantMode,
    generateCorrelationId: () => `corr-${lines.length + 1}`,
  });
  const ids = new UlidEventIdGenerator();
  const redactor = new PinoRedactRedactor(
    RedactionPolicy({ enabled: true, paths: ["password", "secret"] }),
  );
  const limiter = new FixedWindowRateLimiter(
    RateLimitPolicy({
      enabled: true,
      maxPerWindow: config?.rateLimitMax ?? 1000,
      windowMs: 60_000,
      maxTrackedKeys: 1000,
    }),
  );
  const pipeline = new ProcessingPipeline([
    new ValidationStep(),
    new NormalizationStep(),
    new RedactionStep(redactor),
    new SamplingStep(
      SamplingPolicy({
        enabled: config?.sampleRate !== undefined,
        sampledLevels: ["INFO", "WARN", "DEBUG", "TRACE"],
        rate: config?.sampleRate ?? 1,
      }),
      () => 0.99, // random inyectado determinístico: descarta casi todo lo sampleable
    ),
    new RateLimitingStep(limiter),
  ]);
  const dispatcher = new DefaultDispatcher(transport, new JsonFormatter());
  const classifier = new DefaultEventClassifier();
  const createLog = new CreateLog(contextResolver, ids, pipeline, dispatcher);
  const registerEvent = new RegisterEvent(contextResolver, ids, classifier, pipeline, dispatcher);
  const registerMessage = new RegisterMessage(contextResolver, ids, pipeline, dispatcher);
  return { lines, createLog, registerEvent, registerMessage, contextManager };
}

describe("flujo de registro end-to-end (caso de uso → pipeline → dispatcher → transport)", () => {
  it("un log con metadata sensible llega redactado al transport", async () => {
    const { lines, createLog } = buildHarness();
    const result = await createLog.execute({
      level: "INFO",
      message: "login",
      metadata: { password: "secret123", user: "ana" },
    });
    expect(result.dispatched).toBe(true);
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(parsed["message"]).toBe("login");
    const metadata = parsed["metadata"] as Record<string, unknown>;
    expect(metadata["password"]).toBe("[REDACTED]");
    expect(metadata["user"]).toBe("ana");
  });

  it("un message con payload sensible se redacta y un evento clasifica su severity", async () => {
    const { lines, registerEvent, registerMessage } = buildHarness();
    await registerEvent.execute({ type: "auth.login", source: "web", payload: {} });
    await registerMessage.execute({
      status: "sent",
      payload: { secret: "s3cr3t", to: "user-9" },
    });
    expect(lines).toHaveLength(2);
    const event = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(event["record_type"]).toBe("event");
    const message = JSON.parse(lines[1]!) as Record<string, unknown>;
    expect((message["payload"] as Record<string, unknown>)["secret"]).toBe("[REDACTED]");
  });

  it("sampling con rate 0 descarta INFO/WARN pero nunca ERROR", async () => {
    const { lines, createLog } = buildHarness({ sampleRate: 0 });
    await createLog.execute({ level: "INFO", message: "se descarta" });
    await createLog.execute({ level: "ERROR", message: "se conserva" });
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)["level"]).toBe("ERROR");
  });

  it("rate limiting corta INFO bajo saturación pero deja pasar ERROR", async () => {
    const { lines, createLog } = buildHarness({ rateLimitMax: 2 });
    await createLog.execute({ level: "INFO", message: "uno" });
    await createLog.execute({ level: "INFO", message: "dos" });
    await createLog.execute({ level: "INFO", message: "tres (se limita)" });
    await createLog.execute({ level: "ERROR", message: "crítico pasa" });
    expect(lines).toHaveLength(3);
    const levels = lines.map((l) => JSON.parse(l)["level"]);
    expect(levels).toEqual(["INFO", "INFO", "ERROR"]);
  });

  it("validation descarta un mensaje vacío antes de llegar al transport", async () => {
    const { lines, createLog } = buildHarness();
    const result = await createLog.execute({ level: "WARN", message: "   " });
    expect(result.dispatched).toBe(false);
    expect(lines).toHaveLength(0);
  });

  it("normalización recorta espacios en el mensaje antes de despachar", async () => {
    const { lines, createLog } = buildHarness();
    await createLog.execute({ level: "INFO", message: "  con espacios  " });
    expect(JSON.parse(lines[0]!)["message"]).toBe("con espacios");
  });

  it("dentro de AsyncLocalStorage, el tenant y correlation_id llegan al registro", async () => {
    const { lines, createLog, contextManager } = buildHarness({ tenantMode: "fixed" });
    await contextManager.run(
      { tenant_id: TenantId("tenant-als"), correlation_id: "corr-als-1" },
      () => createLog.execute({ level: "INFO", message: "con contexto" }),
    );
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!) as Record<string, unknown>;
    expect(parsed["tenant_id"]).toBe("tenant-als");
    expect((parsed["context"] as Record<string, unknown>)["correlation_id"]).toBe("corr-als-1");
  });
});
