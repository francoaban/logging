import { describe, expect, it } from "vitest";
import { SamplingPolicy } from "../../src/domain/value-objects/SamplingPolicy.js";
import { shouldKeep } from "../../src/domain/services/SamplingDecision.js";

describe("SamplingPolicy", () => {
  it("rechaza rate fuera de [0,1]", () => {
    expect(() => SamplingPolicy({ enabled: true, sampledLevels: ["DEBUG"], rate: 1.5 })).toThrow();
    expect(() => SamplingPolicy({ enabled: true, sampledLevels: ["DEBUG"], rate: -0.1 })).toThrow();
  });

  it("rechaza ERROR o FATAL en sampledLevels", () => {
    expect(() => SamplingPolicy({ enabled: true, sampledLevels: ["ERROR"], rate: 0.5 })).toThrow();
    expect(() =>
      SamplingPolicy({ enabled: true, sampledLevels: ["DEBUG", "FATAL"], rate: 0.5 }),
    ).toThrow();
  });

  it("acepta una política válida", () => {
    const policy = SamplingPolicy({ enabled: true, sampledLevels: ["TRACE", "DEBUG"], rate: 0.1 });
    expect(policy.rate).toBe(0.1);
  });
});

describe("shouldKeep", () => {
  const policy = SamplingPolicy({ enabled: true, sampledLevels: ["DEBUG"], rate: 0.3 });

  it("ERROR/FATAL siempre se conservan, sin importar random()", () => {
    expect(shouldKeep("ERROR", policy, () => 0.99)).toBe(true);
    expect(shouldKeep("FATAL", policy, () => 0.99)).toBe(true);
  });

  it("un nivel no listado en sampledLevels siempre se conserva", () => {
    expect(shouldKeep("INFO", policy, () => 0.99)).toBe(true);
  });

  it("con la policy deshabilitada, siempre se conserva", () => {
    const disabled = SamplingPolicy({ enabled: false, sampledLevels: ["DEBUG"], rate: 0.1 });
    expect(shouldKeep("DEBUG", disabled, () => 0.99)).toBe(true);
  });

  it("random() < rate conserva; random() >= rate descarta (determinístico)", () => {
    expect(shouldKeep("DEBUG", policy, () => 0.29)).toBe(true);
    expect(shouldKeep("DEBUG", policy, () => 0.3)).toBe(false);
    expect(shouldKeep("DEBUG", policy, () => 0.9)).toBe(false);
  });
});
