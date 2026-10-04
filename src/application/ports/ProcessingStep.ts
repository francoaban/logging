import { type LoggableRecord } from "../../domain/entities/LoggableRecord.js";
import { type ExecutionContext } from "../../domain/value-objects/ExecutionContext.js";

export interface ProcessingContext {
  readonly executionContext: ExecutionContext;
}

/** Nunca lleva el payload/metadata original — solo diagnóstico seguro de loguear. */
export type ProcessingOutcome =
  | { readonly outcome: "continue"; readonly record: LoggableRecord }
  | { readonly outcome: "drop"; readonly stepName: string; readonly reason: string };

/**
 * Un step de la `ProcessingPipeline` (Chain of Responsibility). `onUnexpectedError`
 * es obligatorio a propósito (ver ADR-024): no hay un default implícito que
 * alguien pueda olvidar fijar al agregar un step nuevo.
 */
export interface ProcessingStep {
  readonly name: string;
  readonly onUnexpectedError: "drop" | "pass-through";
  execute(record: LoggableRecord, context: ProcessingContext): Promise<ProcessingOutcome>;
}
