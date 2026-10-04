import { type LoggableRecord } from "../../domain/entities/LoggableRecord.js";
import {
  type ProcessingContext,
  type ProcessingOutcome,
  type ProcessingStep,
} from "../../application/ports/ProcessingStep.js";
import { type Redactor } from "../../application/ports/Redactor.js";

/**
 * `onUnexpectedError: "drop"` (ver ADR-024 y ADR-025): si la redacción falla,
 * enviar el registro sin enmascarar es peor que no enviarlo. Produce un
 * registro NUEVO (nunca muta `record.metadata`/`record.payload`).
 */
export class RedactionStep implements ProcessingStep {
  readonly name = "redaction";
  readonly onUnexpectedError = "drop" as const;

  constructor(private readonly redactor: Redactor) {}

  async execute(record: LoggableRecord, _context: ProcessingContext): Promise<ProcessingOutcome> {
    if ("metadata" in record && record.metadata !== undefined) {
      return {
        outcome: "continue",
        record: { ...record, metadata: this.redactor.redact(record.metadata) },
      };
    }
    if ("payload" in record) {
      return {
        outcome: "continue",
        record: { ...record, payload: this.redactor.redact(record.payload) },
      };
    }
    return { outcome: "continue", record };
  }
}
