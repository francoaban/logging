import { type LogLevel, isCriticalLevel } from "./LogLevel.js";

/**
 * Política de sampling probabilístico (no confundir con rate limiting, que
 * es un problema distinto — ver `RateLimitPolicy`). Sampling decide, por
 * nivel, qué fracción de los registros se conserva; es sin estado (una
 * moneda al aire por registro), no requiere contador.
 *
 * `sampledLevels` nunca puede incluir `ERROR`/`FATAL` — se valida acá, en
 * construcción, no en el punto de uso, para que sea imposible construir una
 * política que rompa la garantía ya establecida en `ROADMAP.md` (Fase 3:
 * "los registros ERROR y FATAL no se descartan por sampling ni por
 * backpressure bajo ninguna condición").
 */
export interface SamplingPolicy {
  readonly enabled: boolean;
  readonly sampledLevels: readonly LogLevel[];
  /** Fracción que se CONSERVA, no la que se descarta. 0 = descarta todo lo sampleable, 1 = conserva todo. */
  readonly rate: number;
}

export function SamplingPolicy(input: {
  readonly enabled: boolean;
  readonly sampledLevels: readonly LogLevel[];
  readonly rate: number;
}): SamplingPolicy {
  if (input.rate < 0 || input.rate > 1) {
    throw new Error(`SamplingPolicy.rate debe estar entre 0 y 1, se recibió ${input.rate}`);
  }
  for (const level of input.sampledLevels) {
    if (isCriticalLevel(level)) {
      throw new Error(
        `SamplingPolicy no puede samplear el nivel ${level}: ERROR/FATAL nunca se descartan (ver LogLevel.isCriticalLevel).`,
      );
    }
  }
  return { enabled: input.enabled, sampledLevels: input.sampledLevels, rate: input.rate };
}
