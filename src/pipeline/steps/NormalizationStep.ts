import { type LoggableRecord } from "../../domain/entities/LoggableRecord.js";
import {
  type ProcessingContext,
  type ProcessingOutcome,
  type ProcessingStep,
} from "../../application/ports/ProcessingStep.js";

/**
 * Cosmético: `onUnexpectedError: "pass-through"` — su falla no debe costar el registro.
 *
 * Usa `"message" in record` (no `getRecordType(record) === "log"`) para que
 * TypeScript angoste el tipo de verdad: `getRecordType` devuelve un `string`
 * plano, no un *type predicate*, así que compararlo no angosta `LoggableRecord`
 * y `record.message` no compila fuera de este patrón.
 */
export class NormalizationStep implements ProcessingStep {
  readonly name = "normalization";
  readonly onUnexpectedError = "pass-through" as const;

  async execute(record: LoggableRecord, _context: ProcessingContext): Promise<ProcessingOutcome> {
    if ("message" in record) {
      const trimmed = record.message.trim();
      if (trimmed !== record.message) {
        return { outcome: "continue", record: { ...record, message: trimmed } };
      }
    }
    return { outcome: "continue", record };
  }
}
