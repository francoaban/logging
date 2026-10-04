import { describe, expect, it } from "vitest";
import { ValidationStep } from "../../src/pipeline/steps/ValidationStep.js";
import { type Log } from "../../src/domain/entities/Log.js";
import { type Event } from "../../src/domain/entities/Event.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { CURRENT_SCHEMA_VERSION } from "../../src/domain/value-objects/SchemaVersion.js";

const id = EventId("01ARZ3NDEKTSV4RRFFQ69G5FAV");
const base = {
  event_id: id,
  schema_version: CURRENT_SCHEMA_VERSION,
  tenant_id: TenantId("t1"),
  timestamp: "x",
  context: { correlation_id: "c" },
};

function log(message: string): Log {
  return { ...base, level: "INFO", message };
}
function event(type: string, source: string): Event {
  return {
    ...base,
    type,
    source,
    classification: { category: "x", severity: "INFO", tags: [] },
    payload: {},
  };
}

describe("ValidationStep", () => {
  const step = new ValidationStep();

  it("declara onUnexpectedError: drop", () => {
    expect(step.onUnexpectedError).toBe("drop");
  });

  it("descarta un Log con message vacío (o solo espacios)", async () => {
    const outcome = await step.execute(log("   "), {} as never);
    expect(outcome).toEqual({ outcome: "drop", stepName: "validation", reason: "message vacío" });
  });

  it("deja pasar un Log con message no vacío", async () => {
    const outcome = await step.execute(log("hola"), {} as never);
    expect(outcome.outcome).toBe("continue");
  });

  it("descarta un Event con type o source vacío", async () => {
    expect((await step.execute(event("", "s"), {} as never)).outcome).toBe("drop");
    expect((await step.execute(event("t", ""), {} as never)).outcome).toBe("drop");
  });

  it("deja pasar un Event con type y source no vacíos", async () => {
    const outcome = await step.execute(event("t", "s"), {} as never);
    expect(outcome.outcome).toBe("continue");
  });
});
