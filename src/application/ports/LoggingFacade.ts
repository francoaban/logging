import { type MessageStatus } from "../../domain/entities/Message.js";
import { type Classification } from "../../domain/value-objects/Classification.js";

export interface RegisterEventInput {
  readonly type: string;
  readonly source: string;
  readonly payload: Readonly<Record<string, unknown>>;
  /** Si se omite, se resuelve con el `EventClassifier` configurado. */
  readonly classification?: Classification | undefined;
}

export interface RegisterMessageInput {
  readonly status: MessageStatus;
  readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * API pública del módulo. Fire-and-forget por default (como Pino/Winston):
 * ningún método obliga a `await`. `close()` sí es async — drena los
 * transports antes de apagar el proceso.
 */
export interface LoggingFacade {
  trace(message: string, metadata?: Record<string, unknown>): void;
  debug(message: string, metadata?: Record<string, unknown>): void;
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
  fatal(message: string, metadata?: Record<string, unknown>): void;
  event(input: RegisterEventInput): void;
  message(input: RegisterMessageInput): void;
  close(): Promise<void>;
}
