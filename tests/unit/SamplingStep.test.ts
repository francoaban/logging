import { describe, expect, it } from "vitest";
import { SamplingStep } from "../../src/pipeline/steps/SamplingStep.js";
import { SamplingPolicy } from "../../src/domain/value-objects/SamplingPolicy.js";
import { type Log } from "../../src/domain/entities/Log.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { CURRENT_SCHEMA_VERSION } from "../../src/domain/value-objects/SchemaVersion.js";

function log(level: Log["level"]): Log {
  return {
    event_id: EventId("01ARZ3NDEKTSV4RRFFQ69G5FAV"),
    schema_version: CURRENT_SCHEMA_VERSION,
    tenant_id: TenantId("t1"),
    level,
    message: "m",
    timestamp: "x",
    context: { correlation_id: "c" },
  };
}

describe("SamplingStep", () => {
  it("declara onUnexpectedError: pass-through (conservar ante la duda)", () => {
    const step = new SamplingStep(SamplingPolicy({ enabled: false, sampledLevels: [], rate: 1 }));
    expect(step.onUnexpectedError).toBe("pass-through");
  });

  it("descarta cuando shouldKeep da false (random fijo, determinístico)", async () => {
    const policy = SamplingPolicy({ enabled: true, sampledLevels: ["DEBUG"], rate: 0.5 });
    const step = new SamplingStep(policy, () => 0.9); // 0.9 >= rate(0.5) => no conservar
    const outcome = await step.execute(log("DEBUG"), {} as never);
    expect(outcome.outcome).toBe("drop");
  });

  it("conserva cuando shouldKeep da true", async () => {
    const policy = SamplingPolicy({ enabled: true, sampledLevels: ["DEBUG"], rate: 0.5 });
    const step = new SamplingStep(policy, () => 0.1); // 0.1 < rate(0.5) => conservar
    const outcome = await step.execute(log("DEBUG"), {} as never);
    expect(outcome.outcome).toBe("continue");
  });

  it("ERROR/FATAL nunca se descartan, aunque el random diga que no conservar", async () => {
    const policy = SamplingPolicy({ enabled: true, sampledLevels: ["DEBUG"], rate: 0 });
    // random -> 1 haría descartar cualquier nivel sampleable; ERROR/FATAL deben
    // ignorarlo por completo (isCriticalLevel se revisa antes que la tasa).
    const step = new SamplingStep(policy, () => 1);
    expect((await step.execute(log("ERROR"), {} as never)).outcome).toBe("continue");
    expect((await step.execute(log("FATAL"), {} as never)).outcome).toBe("continue");
  });
});
