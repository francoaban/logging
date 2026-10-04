import { describe, expect, it } from "vitest";
import {
  ByLevelRateLimitKeyStrategy,
  RateLimitingStep,
  type RateLimitKeyStrategy,
} from "../../src/pipeline/steps/RateLimitingStep.js";
import { type RateLimiter } from "../../src/application/ports/RateLimiter.js";
import { type Log } from "../../src/domain/entities/Log.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { CURRENT_SCHEMA_VERSION } from "../../src/domain/value-objects/SchemaVersion.js";
import { fakeExecutionContext } from "./helpers/fakeExecutionContext.js";

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

function fakeLimiter(allow: boolean): RateLimiter & { readonly calledWith: string[] } {
  const calledWith: string[] = [];
  return {
    calledWith,
    tryAcquire: (key: string) => {
      calledWith.push(key);
      return allow;
    },
  };
}

const ctx = { executionContext: fakeExecutionContext() };

describe("RateLimitingStep", () => {
  it("declara onUnexpectedError: pass-through", () => {
    expect(new RateLimitingStep(fakeLimiter(true)).onUnexpectedError).toBe("pass-through");
  });

  it("ERROR/FATAL nunca se limitan, ni siquiera consultan al limiter", async () => {
    const limiter = fakeLimiter(false); // diría que no, si lo consultaran
    const step = new RateLimitingStep(limiter);
    const outcome = await step.execute(log("FATAL"), ctx);
    expect(outcome.outcome).toBe("continue");
    expect(limiter.calledWith).toEqual([]);
  });

  it("un nivel no crítico permitido por el limiter continúa", async () => {
    const step = new RateLimitingStep(fakeLimiter(true));
    expect((await step.execute(log("INFO"), ctx)).outcome).toBe("continue");
  });

  it("un nivel no crítico rechazado por el limiter se descarta", async () => {
    const step = new RateLimitingStep(fakeLimiter(false));
    const outcome = await step.execute(log("INFO"), ctx);
    expect(outcome.outcome).toBe("drop");
    if (outcome.outcome === "drop") expect(outcome.reason).toContain("rate limit");
  });

  it("ByLevelRateLimitKeyStrategy usa el nivel como key", () => {
    const strategy: RateLimitKeyStrategy = new ByLevelRateLimitKeyStrategy();
    expect(strategy.keyFor(log("WARN"), ctx)).toBe("WARN");
  });

  it("usa la key strategy inyectada, no la de por defecto", async () => {
    const limiter = fakeLimiter(true);
    const customStrategy: RateLimitKeyStrategy = { keyFor: () => "clave-custom" };
    await new RateLimitingStep(limiter, customStrategy).execute(log("INFO"), ctx);
    expect(limiter.calledWith).toEqual(["clave-custom"]);
  });
});
