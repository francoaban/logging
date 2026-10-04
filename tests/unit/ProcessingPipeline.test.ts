import { describe, expect, it } from "vitest";
import { ProcessingPipeline } from "../../src/pipeline/ProcessingPipeline.js";
import {
  type ProcessingOutcome,
  type ProcessingStep,
} from "../../src/application/ports/ProcessingStep.js";
import { type Log } from "../../src/domain/entities/Log.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { CURRENT_SCHEMA_VERSION } from "../../src/domain/value-objects/SchemaVersion.js";
import { fakeExecutionContext } from "./helpers/fakeExecutionContext.js";

function fakeLog(): Log {
  return {
    event_id: EventId("01ARZ3NDEKTSV4RRFFQ69G5FAV"),
    schema_version: CURRENT_SCHEMA_VERSION,
    tenant_id: TenantId("t1"),
    level: "INFO",
    message: "hola",
    timestamp: new Date().toISOString(),
    context: { correlation_id: "c1" },
  };
}

function step(
  name: string,
  onUnexpectedError: "drop" | "pass-through",
  execute: ProcessingStep["execute"],
): ProcessingStep {
  return { name, onUnexpectedError, execute };
}

const continueWith = (record: Log): ProcessingOutcome => ({ outcome: "continue", record });
const ctx = { executionContext: fakeExecutionContext() };

describe("ProcessingPipeline", () => {
  it("corre todos los steps y devuelve 'continue' si ninguno descarta", async () => {
    const pipeline = new ProcessingPipeline([
      step("a", "drop", async (r) => continueWith(r as Log)),
      step("b", "drop", async (r) => continueWith(r as Log)),
    ]);
    const outcome = await pipeline.run(fakeLog(), ctx);
    expect(outcome.outcome).toBe("continue");
  });

  it("un 'drop' normal (sin excepción) corta la cadena inmediatamente", async () => {
    let calledB = false;
    const pipeline = new ProcessingPipeline([
      step("a", "drop", async () => ({ outcome: "drop", stepName: "a", reason: "motivo" })),
      step("b", "drop", async (r) => {
        calledB = true;
        return continueWith(r as Log);
      }),
    ]);
    const outcome = await pipeline.run(fakeLog(), ctx);
    expect(outcome).toEqual({ outcome: "drop", stepName: "a", reason: "motivo" });
    expect(calledB).toBe(false);
  });

  it("onUnexpectedError 'drop': una excepción descarta el registro sin exponer el mensaje del error", async () => {
    const pipeline = new ProcessingPipeline([
      step("riesgoso", "drop", async () => {
        throw new Error("contiene el payload sensible: password=1234");
      }),
    ]);
    const outcome = await pipeline.run(fakeLog(), ctx);
    expect(outcome.outcome).toBe("drop");
    if (outcome.outcome === "drop") {
      expect(outcome.stepName).toBe("riesgoso");
      expect(outcome.reason).not.toContain("1234");
      expect(outcome.reason).not.toContain("password");
    }
  });

  it("onUnexpectedError 'pass-through': una excepción sigue la cadena sin el cambio de ese step", async () => {
    let calledNext = false;
    const pipeline = new ProcessingPipeline([
      step("cosmetico", "pass-through", async () => {
        throw new Error("boom");
      }),
      step("siguiente", "drop", async (r) => {
        calledNext = true;
        return continueWith(r as Log);
      }),
    ]);
    const outcome = await pipeline.run(fakeLog(), ctx);
    expect(calledNext).toBe(true);
    expect(outcome.outcome).toBe("continue");
  });
});
