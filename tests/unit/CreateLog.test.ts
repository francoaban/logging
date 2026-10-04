import { describe, expect, it } from "vitest";
import { CreateLog } from "../../src/application/use-cases/CreateLog.js";
import { type Pipeline } from "../../src/application/ports/Pipeline.js";
import { type Dispatcher, type DispatchResult } from "../../src/application/ports/Dispatcher.js";
import { type EventIdGenerator } from "../../src/application/ports/EventIdGenerator.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { fakeExecutionContext, fakeResolver } from "./helpers/fakeExecutionContext.js";

const fixedId = EventId("01ARZ3NDEKTSV4RRFFQ69G5FAV");
const fakeIdGenerator: EventIdGenerator = { generate: () => fixedId };

function fakePipeline(behavior: "continue" | "drop"): Pipeline {
  return {
    run: async (record) =>
      behavior === "continue"
        ? { outcome: "continue", record }
        : { outcome: "drop", stepName: "fake-step", reason: "motivo-fake" },
  };
}

function fakeDispatcher(): Dispatcher & { readonly dispatched: unknown[] } {
  const dispatched: unknown[] = [];
  return {
    dispatched,
    dispatch: async (record): Promise<DispatchResult> => {
      dispatched.push(record);
      return { dispatched: true };
    },
  };
}

describe("CreateLog", () => {
  it("construye el Log con tenant_id/correlation_id del ExecutionContext resuelto y lo despacha", async () => {
    const context = fakeExecutionContext({ correlation_id: "corr-xyz" });
    const dispatcher = fakeDispatcher();
    const useCase = new CreateLog(
      fakeResolver(context),
      fakeIdGenerator,
      fakePipeline("continue"),
      dispatcher,
    );

    const result = await useCase.execute({ level: "INFO", message: "hola", metadata: { a: 1 } });

    expect(result).toEqual({ dispatched: true });
    expect(dispatcher.dispatched).toHaveLength(1);
    const log = dispatcher.dispatched[0] as Record<string, unknown>;
    expect(log["event_id"]).toBe(fixedId);
    expect(log["tenant_id"]).toBe(context.tenant_id);
    expect(log["level"]).toBe("INFO");
    expect(log["message"]).toBe("hola");
    expect(log["metadata"]).toEqual({ a: 1 });
    expect((log["context"] as { correlation_id: string }).correlation_id).toBe("corr-xyz");
  });

  it("omite 'metadata' del Log si no se pasó input.metadata (no lo deja en undefined)", async () => {
    const dispatcher = fakeDispatcher();
    const useCase = new CreateLog(
      fakeResolver(),
      fakeIdGenerator,
      fakePipeline("continue"),
      dispatcher,
    );
    await useCase.execute({ level: "INFO", message: "sin metadata" });
    expect("metadata" in (dispatcher.dispatched[0] as object)).toBe(false);
  });

  it("si el pipeline descarta, no despacha y devuelve el motivo con el nombre del step", async () => {
    const dispatcher = fakeDispatcher();
    const useCase = new CreateLog(
      fakeResolver(),
      fakeIdGenerator,
      fakePipeline("drop"),
      dispatcher,
    );
    const result = await useCase.execute({ level: "INFO", message: "x" });
    expect(result).toEqual({ dispatched: false, reason: "fake-step: motivo-fake" });
    expect(dispatcher.dispatched).toHaveLength(0);
  });
});
