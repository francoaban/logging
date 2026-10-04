import { type LoggableRecord } from "../domain/entities/LoggableRecord.js";
import {
  type ProcessingContext,
  type ProcessingOutcome,
  type ProcessingStep,
} from "../application/ports/ProcessingStep.js";
import { type Pipeline } from "../application/ports/Pipeline.js";

/**
 * Chain of Responsibility. Un único `try/catch` por step: la política de
 * ESE step (`onUnexpectedError`, ver ADR-024) decide qué pasa ante una
 * excepción no controlada. Un `{ outcome: "drop" }` devuelto normalmente por
 * un step (sin lanzar) siempre corta la cadena, sin pasar por esa política.
 */
export class ProcessingPipeline implements Pipeline {
  constructor(private readonly steps: readonly ProcessingStep[]) {}

  async run(record: LoggableRecord, context: ProcessingContext): Promise<ProcessingOutcome> {
    let current = record;
    for (const step of this.steps) {
      let outcome: ProcessingOutcome;
      try {
        outcome = await step.execute(current, context);
      } catch (error) {
        if (step.onUnexpectedError === "drop") {
          return {
            outcome: "drop",
            stepName: step.name,
            reason: `excepción no controlada (${errorClassName(error)})`,
          };
        }
        continue; // pass-through: sigue con `current` sin el cambio que este step iba a aplicar
      }
      if (outcome.outcome === "drop") return outcome;
      current = outcome.record;
    }
    return { outcome: "continue", record: current };
  }
}

function errorClassName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}
