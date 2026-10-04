import { describe, expect, it } from "vitest";
import { NormalizationStep } from "../../src/pipeline/steps/NormalizationStep.js";
import { type Log } from "../../src/domain/entities/Log.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { CURRENT_SCHEMA_VERSION } from "../../src/domain/value-objects/SchemaVersion.js";

function log(message: string): Log {
  return {
    event_id: EventId("01ARZ3NDEKTSV4RRFFQ69G5FAV"),
    schema_version: CURRENT_SCHEMA_VERSION,
    tenant_id: TenantId("t1"),
    level: "INFO",
    message,
    timestamp: "x",
    context: { correlation_id: "c" },
  };
}

describe("NormalizationStep", () => {
  const step = new NormalizationStep();

  it("declara onUnexpectedError: pass-through", () => {
    expect(step.onUnexpectedError).toBe("pass-through");
  });

  it("recorta espacios al principio/final del message", async () => {
    const outcome = await step.execute(log("  hola mundo  "), {} as never);
    expect(outcome.outcome).toBe("continue");
    if (outcome.outcome === "continue") {
      expect((outcome.record as Log).message).toBe("hola mundo");
    }
  });

  it("no crea un objeto nuevo si no hace falta normalizar (sin espacios de más)", async () => {
    const input = log("ya está limpio");
    const outcome = await step.execute(input, {} as never);
    expect(outcome.outcome).toBe("continue");
    if (outcome.outcome === "continue") {
      expect(outcome.record).toBe(input); // misma referencia: no reconstruye sin necesidad
    }
  });
});
