import { type LogLevel, isCriticalLevel } from "../value-objects/LogLevel.js";
import { type SamplingPolicy } from "../value-objects/SamplingPolicy.js";

/**
 * Decide si un registro se conserva según `SamplingPolicy`. `random` es
 * inyectable a propósito — un test que dependiera de `Math.random()` real
 * sería no determinístico (flaky por diseño), y ya establecimos en este
 * proyecto que un criterio de aceptación tiene que poder evaluarse con un
 * resultado binario claro (ver la crítica a SEC-14 en `ROADMAP.md`).
 *
 * `isCriticalLevel` se revisa acá también, no solo en la validación de
 * `SamplingPolicy` — belt-and-suspenders: aunque alguien construya la
 * política sin pasar por el constructor validado (por ejemplo, deserializando
 * JSON con un cast), `ERROR`/`FATAL` nunca se descartan en el punto de uso.
 */
export function shouldKeep(
  level: LogLevel,
  policy: SamplingPolicy,
  random: () => number = Math.random,
): boolean {
  if (isCriticalLevel(level)) return true;
  if (!policy.enabled) return true;
  if (!policy.sampledLevels.includes(level)) return true;
  return random() < policy.rate;
}
