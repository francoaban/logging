import { describe, expect, it } from "vitest";
import { RegisterMessage } from "../../src/application/use-cases/RegisterMessage.js";
import { type Pipeline } from "../../src/application/ports/Pipeline.js";
import { type Dispatcher } from "../../src/application/ports/Dispatcher.js";
import { type EventIdGenerator } from "../../src/application/ports/EventIdGenerator.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { fakeResolver } from "./helpers/fakeExecutionContext.js";

const fixedId = EventId("01ARZ3NDEKTSV4RRFFQ69G5FAV");
const fakeIdGenerator: EventIdGenerator = { generate: () => fixedId };
const passthroughPipeline: Pipeline = { run: async (record) => ({ outcome: "continue", record }) };

describe("RegisterMessage", () => {
  it("deriva idempotency_key del event_id generado, con prefijo 'messages:'", async () => {
    const dispatched: unknown[] = [];
    const dispatcher: Dispatcher = {
      dispatch: async (record) => (dispatched.push(record), { dispatched: true }),
    };
    const useCase = new RegisterMessage(
      fakeResolver(),
      fakeIdGenerator,
      passthroughPipeline,
      dispatcher,
    );

    await useCase.execute({ status: "created", payload: { orderId: 1 } });

    const message = dispatched[0] as {
      event_id: unknown;
      idempotency_key: unknown;
      status: unknown;
    };
    expect(message.event_id).toBe(fixedId);
    expect(message.idempotency_key).toBe(`messages:${fixedId}`);
    expect(message.status).toBe("created");
  });
});
