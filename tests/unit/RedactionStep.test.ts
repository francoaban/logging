import { describe, expect, it } from "vitest";
import { RedactionStep } from "../../src/pipeline/steps/RedactionStep.js";
import { type Redactor } from "../../src/application/ports/Redactor.js";
import { type Log } from "../../src/domain/entities/Log.js";
import { type Event } from "../../src/domain/entities/Event.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { CURRENT_SCHEMA_VERSION } from "../../src/domain/value-objects/SchemaVersion.js";

const base = {
  event_id: EventId("01ARZ3NDEKTSV4RRFFQ69G5FAV"),
  schema_version: CURRENT_SCHEMA_VERSION,
  tenant_id: TenantId("t1"),
  timestamp: "x",
  context: { correlation_id: "c" },
};

function logWithMetadata(metadata: Record<string, unknown>): Log {
  return { ...base, level: "INFO", message: "m", metadata };
}
function eventWithPayload(payload: Record<string, unknown>): Event {
  return {
    ...base,
    type: "t",
    source: "s",
    classification: { category: "x", severity: "INFO", tags: [] },
    payload,
  };
}

describe("RedactionStep", () => {
  it("declara onUnexpectedError: drop", () => {
    expect(new RedactionStep({ redact: (v) => v } as Redactor).onUnexpectedError).toBe("drop");
  });

  it("redacta record.metadata en un Log usando el Redactor inyectado", async () => {
    const redactor: Redactor = { redact: (v) => ({ ...v, password: "[REDACTED]" }) };
    const step = new RedactionStep(redactor);
    const outcome = await step.execute(logWithMetadata({ password: "secreto" }), {} as never);
    expect(outcome.outcome).toBe("continue");
    if (outcome.outcome === "continue") {
      expect((outcome.record as Log).metadata).toEqual({ password: "[REDACTED]" });
    }
  });

  it("redacta record.payload en un Event", async () => {
    const redactor: Redactor = { redact: (v) => ({ ...v, token: "[REDACTED]" }) };
    const step = new RedactionStep(redactor);
    const outcome = await step.execute(eventWithPayload({ token: "abc" }), {} as never);
    expect(outcome.outcome).toBe("continue");
    if (outcome.outcome === "continue") {
      expect((outcome.record as Event).payload).toEqual({ token: "[REDACTED]" });
    }
  });

  it("no muta el metadata/payload original (produce un record nuevo)", async () => {
    const redactor: Redactor = { redact: (v) => ({ ...v, x: "[REDACTED]" }) };
    const step = new RedactionStep(redactor);
    const original = logWithMetadata({ x: "secreto" });
    await step.execute(original, {} as never);
    expect(original.metadata).toEqual({ x: "secreto" });
  });

  it("si el Redactor lanza, el registro se descarta (ADR-024/ADR-025: enviar sin enmascarar es peor que no enviar)", async () => {
    const redactor: Redactor = {
      redact: () => {
        throw new Error("fallo del redactor");
      },
    };
    const pipeline = new RedactionStep(redactor);
    await expect(pipeline.execute(logWithMetadata({ x: 1 }), {} as never)).rejects.toThrow();
    // La conversión de esa excepción en un drop es responsabilidad de ProcessingPipeline
    // (ver ProcessingPipeline.test.ts), no del step: por eso onUnexpectedError es una
    // declaración, no una implementación de try/catch dentro del propio step.
  });
});
