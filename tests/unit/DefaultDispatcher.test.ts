import { describe, expect, it } from "vitest";
import { DefaultDispatcher } from "../../src/infrastructure/dispatch/DefaultDispatcher.js";
import { type LogFormatter } from "../../src/application/ports/LogFormatter.js";
import { type LogTransport } from "../../src/application/ports/LogTransport.js";
import { type Log } from "../../src/domain/entities/Log.js";

const fakeFormatter: LogFormatter = { format: () => "LINEA-FORMATEADA" };

function log(): Log {
  return {
    event_id: "x" as never,
    schema_version: 1 as never,
    tenant_id: "t" as never,
    level: "INFO",
    message: "m",
    timestamp: "x",
    context: { correlation_id: "c" },
  };
}

describe("DefaultDispatcher", () => {
  it("formatea el registro y lo escribe en el transport configurado", async () => {
    let received: { line: string; record: unknown } | undefined;
    const transport: LogTransport = {
      name: "fake",
      write: async (line, record) => {
        received = { line, record };
        return { durable: true };
      },
    };

    const result = await new DefaultDispatcher(transport, fakeFormatter).dispatch(log());

    expect(received?.line).toBe("LINEA-FORMATEADA");
    expect(result).toEqual({ dispatched: true, writeResult: { durable: true } });
  });

  it("dispatched refleja 'durable', no solo si el transport no lanzó", async () => {
    const transport: LogTransport = {
      name: "fake",
      write: async () => ({ durable: false, error: "boom" }),
    };
    const result = await new DefaultDispatcher(transport, fakeFormatter).dispatch(log());
    expect(result).toEqual({ dispatched: false, writeResult: { durable: false, error: "boom" } });
  });
});
