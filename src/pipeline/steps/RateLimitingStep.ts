import { getRecordLevel, type LoggableRecord } from "../../domain/entities/LoggableRecord.js";
import {
  type ProcessingContext,
  type ProcessingOutcome,
  type ProcessingStep,
} from "../../application/ports/ProcessingStep.js";
import { type RateLimiter } from "../../application/ports/RateLimiter.js";
import { isCriticalLevel } from "../../domain/value-objects/LogLevel.js";

/** Estrategia de clave para el rate limiter — por defecto, por nivel. Inyectable (Strategy). */
export interface RateLimitKeyStrategy {
  keyFor(record: LoggableRecord, context: ProcessingContext): string;
}

export class ByLevelRateLimitKeyStrategy implements RateLimitKeyStrategy {
  keyFor(record: LoggableRecord): string {
    return getRecordLevel(record);
  }
}

/**
 * `onUnexpectedError: "pass-through"` (ver ADR-024): mismo argumento que
 * `SamplingStep` — un bug en el limitador no debe costar el registro.
 * `ERROR`/`FATAL` nunca se limitan, sin excepción.
 */
export class RateLimitingStep implements ProcessingStep {
  readonly name = "rate-limiting";
  readonly onUnexpectedError = "pass-through" as const;

  constructor(
    private readonly limiter: RateLimiter,
    private readonly keyStrategy: RateLimitKeyStrategy = new ByLevelRateLimitKeyStrategy(),
  ) {}

  async execute(record: LoggableRecord, context: ProcessingContext): Promise<ProcessingOutcome> {
    const level = getRecordLevel(record);
    if (isCriticalLevel(level)) return { outcome: "continue", record };

    const key = this.keyStrategy.keyFor(record, context);
    if (!this.limiter.tryAcquire(key)) {
      return { outcome: "drop", stepName: this.name, reason: `rate limit excedido (key="${key}")` };
    }
    return { outcome: "continue", record };
  }
}
