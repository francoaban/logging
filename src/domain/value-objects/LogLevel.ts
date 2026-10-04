/**
 * Niveles de severidad soportados por el módulo
 * (alcance funcional en `README.md` / `ROADMAP.md`).
 */
export const LOG_LEVELS = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * `ERROR` y `FATAL` nunca deben descartarse por sampling ni por backpressure
 * (`ROADMAP.md`, Fase 3 — esa garantía se extendió explícitamente a los dos
 * mecanismos, no solo a sampling). Este helper centraliza la regla para que
 * el pipeline (Fase 2) y el worker asíncrono (Fase 3) la consulten desde un
 * único lugar en vez de repetir la comparación de strings en cada capa.
 */
export function isCriticalLevel(level: LogLevel): boolean {
  return level === "ERROR" || level === "FATAL";
}

const LEVEL_ORDER: Readonly<Record<LogLevel, number>> = {
  TRACE: 0,
  DEBUG: 1,
  INFO: 2,
  WARN: 3,
  ERROR: 4,
  FATAL: 5,
};

/**
 * `true` si `level` es igual o más severo que `threshold`. Es lo que permite
 * "INFO+ a consola, solo ERROR+ al servicio externo" (nivel mínimo por
 * transport, `TransportConfig.level`). `isCriticalLevel` es binario y no
 * alcanza para esto.
 */
export function meetsThreshold(level: LogLevel, threshold: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[threshold];
}
