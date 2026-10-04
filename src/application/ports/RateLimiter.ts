/**
 * Genérico sobre `key` a propósito: la próxima `RateLimitingStep` (Fase 2a)
 * puede usarlo por nivel; una futura defensa SEC-16 (flood por emisor,
 * `docs/architecture/seguridad-autorizacion.md`) puede reusar el mismo
 * puerto con `key` = identificador del emisor. El bypass de `ERROR`/`FATAL`
 * es responsabilidad de quien llama, no de `RateLimiter` — este puerto no
 * conoce `LogLevel` en absoluto, para poder reusarse fuera del pipeline de
 * logging si hace falta.
 */
export interface RateLimiter {
  /** true = permitido, false = debe descartarse (o degradarse, según el caller). */
  tryAcquire(key: string): boolean;
}
