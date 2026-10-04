import { type LogLevel } from "../../domain/value-objects/LogLevel.js";
import {
  type LoggingFacade,
  type RegisterEventInput,
  type RegisterMessageInput,
} from "../../application/ports/LoggingFacade.js";
import { type LogTransport } from "../../application/ports/LogTransport.js";
import { type CreateLog, type CreateLogInput } from "../../application/use-cases/CreateLog.js";
import { type RegisterEvent } from "../../application/use-cases/RegisterEvent.js";
import { type RegisterMessage } from "../../application/use-cases/RegisterMessage.js";

/**
 * Fire-and-forget: ningún método de nivel/evento/mensaje devuelve una
 * Promise (igual ergonomía que Pino/Winston). Los rechazos se atrapan acá —
 * no deberían ocurrir en operación normal (`CompositeLogTransport` ya nunca
 * lanza), pero esta es la última red antes de que el logging tire abajo al
 * host, que es la regla que todo el resto del diseño ya respeta.
 */
export class DefaultLoggingFacade implements LoggingFacade {
  constructor(
    private readonly createLogUseCase: CreateLog,
    private readonly registerEventUseCase: RegisterEvent,
    private readonly registerMessageUseCase: RegisterMessage,
    private readonly transport: LogTransport,
  ) {}

  trace(message: string, metadata?: Record<string, unknown>): void {
    this.log("TRACE", message, metadata);
  }
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log("DEBUG", message, metadata);
  }
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log("INFO", message, metadata);
  }
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log("WARN", message, metadata);
  }
  error(message: string, metadata?: Record<string, unknown>): void {
    this.log("ERROR", message, metadata);
  }
  fatal(message: string, metadata?: Record<string, unknown>): void {
    this.log("FATAL", message, metadata);
  }

  event(input: RegisterEventInput): void {
    this.registerEventUseCase.execute(input).catch(() => undefined);
  }

  message(input: RegisterMessageInput): void {
    this.registerMessageUseCase.execute(input).catch(() => undefined);
  }

  async close(): Promise<void> {
    await this.transport.close?.();
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const input: CreateLogInput =
      metadata === undefined ? { level, message } : { level, message, metadata };
    this.createLogUseCase.execute(input).catch(() => undefined);
  }
}
