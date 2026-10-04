import { describe, expect, it, vi } from "vitest";
import { DefaultLoggingFacade } from "../../src/infrastructure/facade/DefaultLoggingFacade.js";
import { type CreateLog } from "../../src/application/use-cases/CreateLog.js";
import { type RegisterEvent } from "../../src/application/use-cases/RegisterEvent.js";
import { type RegisterMessage } from "../../src/application/use-cases/RegisterMessage.js";
import { type LogTransport } from "../../src/application/ports/LogTransport.js";

function facadeWithSpies() {
  const createLog = {
    execute: vi.fn().mockResolvedValue({ dispatched: true }),
  } as unknown as CreateLog;
  const registerEvent = {
    execute: vi.fn().mockResolvedValue({ dispatched: true }),
  } as unknown as RegisterEvent;
  const registerMessage = {
    execute: vi.fn().mockResolvedValue({ dispatched: true }),
  } as unknown as RegisterMessage;
  const transport: LogTransport = {
    name: "fake",
    write: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const facade = new DefaultLoggingFacade(createLog, registerEvent, registerMessage, transport);
  return { facade, createLog, registerEvent, registerMessage, transport };
}

describe("DefaultLoggingFacade", () => {
  it("es fire-and-forget: los métodos de nivel no devuelven una Promise", () => {
    const { facade } = facadeWithSpies();
    expect(facade.info("m")).toBeUndefined();
  });

  it.each(["trace", "debug", "info", "warn", "error", "fatal"] as const)(
    "%s() llama a CreateLog.execute con level=%s en mayúsculas y el message/metadata dados",
    async (method) => {
      const { facade, createLog } = facadeWithSpies();
      facade[method]("un mensaje", { a: 1 });
      expect(createLog.execute).toHaveBeenCalledWith({
        level: method.toUpperCase(),
        message: "un mensaje",
        metadata: { a: 1 },
      });
    },
  );

  it("sin metadata, no incluye la clave 'metadata' en el input del caso de uso", () => {
    const { facade, createLog } = facadeWithSpies();
    facade.info("sin metadata");
    expect(createLog.execute).toHaveBeenCalledWith({ level: "INFO", message: "sin metadata" });
  });

  it("event() delega en RegisterEvent.execute", () => {
    const { facade, registerEvent } = facadeWithSpies();
    const input = { type: "t", source: "s", payload: {} };
    facade.event(input);
    expect(registerEvent.execute).toHaveBeenCalledWith(input);
  });

  it("message() delega en RegisterMessage.execute", () => {
    const { facade, registerMessage } = facadeWithSpies();
    const input = { status: "created" as const, payload: {} };
    facade.message(input);
    expect(registerMessage.execute).toHaveBeenCalledWith(input);
  });

  it("un rechazo del caso de uso se traga: no tumba el proceso (unhandled rejection)", async () => {
    const createLog = {
      execute: vi.fn().mockRejectedValue(new Error("boom")),
    } as unknown as CreateLog;
    const facade = new DefaultLoggingFacade(createLog, {} as RegisterEvent, {} as RegisterMessage, {
      name: "f",
      write: vi.fn(),
    });
    expect(() => facade.info("m")).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 0)); // deja asentar el .catch() interno
  });

  it("close() cierra el transport configurado", async () => {
    const { facade, transport } = facadeWithSpies();
    await facade.close();
    expect(transport.close).toHaveBeenCalled();
  });
});
