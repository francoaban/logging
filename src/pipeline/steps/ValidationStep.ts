import {
  type ProcessingContext,
  type ProcessingOutcome,
  type ProcessingStep,
} from "../../application/ports/ProcessingStep.js";
import { type LoggableRecord } from "../../domain/entities/LoggableRecord.js";

/**
 * Validación mínima de sanidad (no reemplaza el tipado de TypeScript: existe
 * para callers en JS plano, o datos que llegaron de afuera ya deserializados).
 * `onUnexpectedError: "drop"` — dejar pasar algo que no superó ni esto arriesga
 * romper un step más adelante en la cadena (ver ADR-024).
 *
 * Narrowing con `in` (no `getRecordType(record) === "..."`, ver NormalizationStep):
 * `getRecordType` devuelve `string`, no angosta el tipo de `record`.
 */
export class ValidationStep implements ProcessingStep {
  readonly name = "validation";
  readonly onUnexpectedError = "drop" as const;

  async execute(record: LoggableRecord, _context: ProcessingContext): Promise<ProcessingOutcome> {
    if ("message" in record && record.message.trim().length === 0) {
      return { outcome: "drop", stepName: this.name, reason: "message vacío" };
    }
    if (
      "type" in record &&
      (record.type.trim().length === 0 || record.source.trim().length === 0)
    ) {
      return { outcome: "drop", stepName: this.name, reason: "type o source vacío" };
    }
    return { outcome: "continue", record };
  }
}
