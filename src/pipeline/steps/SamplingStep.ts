import { getRecordLevel, type LoggableRecord } from "../../domain/entities/LoggableRecord.js";
import {
  type ProcessingContext,
  type ProcessingOutcome,
  type ProcessingStep,
} from "../../application/ports/ProcessingStep.js";
import { type SamplingPolicy } from "../../domain/value-objects/SamplingPolicy.js";
import { shouldKeep } from "../../domain/services/SamplingDecision.js";

/**
 * `onUnexpectedError: "pass-through"` (ver ADR-024): si no se puede decidir
 * si samplear, la opción segura es CONSERVAR — perder un log por un bug de
 * sampling contradice el propósito del sampling.
 */
export class SamplingStep implements ProcessingStep {
  readonly name = "sampling";
  readonly onUnexpectedError = "pass-through" as const;

  constructor(
    private readonly policy: SamplingPolicy,
    private readonly random: () => number = Math.random,
  ) {}

  async execute(record: LoggableRecord, _context: ProcessingContext): Promise<ProcessingOutcome> {
    const level = getRecordLevel(record);
    if (!shouldKeep(level, this.policy, this.random)) {
      return {
        outcome: "drop",
        stepName: this.name,
        reason: "sampleado (fuera de la tasa de retención configurada)",
      };
    }
    return { outcome: "continue", record };
  }
}
