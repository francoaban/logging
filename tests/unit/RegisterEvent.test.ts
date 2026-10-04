import { describe, expect, it } from "vitest";
import { RegisterEvent } from "../../src/application/use-cases/RegisterEvent.js";
import { type Pipeline } from "../../src/application/ports/Pipeline.js";
import { type Dispatcher } from "../../src/application/ports/Dispatcher.js";
import { type EventIdGenerator } from "../../src/application/ports/EventIdGenerator.js";
import { type EventClassifier } from "../../src/domain/services/EventClassifier.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { fakeExecutionContext, fakeResolver } from "./helpers/fakeExecutionContext.js";

const fakeIdGenerator: EventIdGenerator = { generate: () => EventId("01ARZ3NDEKTSV4RRFFQ69G5FAV") };
const passthroughPipeline: Pipeline = { run: async (record) => ({ outcome: "continue", record }) };

function fakeDispatcher(): Dispatcher & { readonly dispatched: unknown[] } {
  const dispatched: unknown[] = [];
  return {
    dispatched,
    dispatch: async (record) => (dispatched.push(record), { dispatched: true }),
  };
}

describe("RegisterEvent", () => {
  it("usa la classification provista en el input tal cual, sin invocar al classifier", async () => {
    const classifier: EventClassifier = {
      classify: () => {
        throw new Error("no debería llamarse");
      },
    };
    const dispatcher = fakeDispatcher();
    const useCase = new RegisterEvent(
      fakeResolver(),
      fakeIdGenerator,
      classifier,
      passthroughPipeline,
      dispatcher,
    );

    await useCase.execute({
      type: "t",
      source: "s",
      payload: {},
      classification: { category: "c", severity: "WARN", tags: ["x"] },
    });

    const event = dispatcher.dispatched[0] as { classification: unknown };
    expect(event.classification).toEqual({ category: "c", severity: "WARN", tags: ["x"] });
  });

  it("si no se provee classification, la resuelve con el EventClassifier configurado", async () => {
    const classifier: EventClassifier = {
      classify: (input) => ({ category: `resuelta:${input.type}`, severity: "INFO", tags: [] }),
    };
    const dispatcher = fakeDispatcher();
    const useCase = new RegisterEvent(
      fakeResolver(),
      fakeIdGenerator,
      classifier,
      passthroughPipeline,
      dispatcher,
    );

    await useCase.execute({ type: "user.created", source: "api", payload: { a: 1 } });

    const event = dispatcher.dispatched[0] as {
      classification: { category: string };
      tenant_id: unknown;
      payload: unknown;
    };
    expect(event.classification.category).toBe("resuelta:user.created");
    expect(event.tenant_id).toBe(fakeExecutionContext().tenant_id);
    expect(event.payload).toEqual({ a: 1 });
  });
});
