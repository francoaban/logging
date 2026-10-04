/**
 * Resultado de escribir un registro en un transport.
 *
 * `durable: true` significa "el destino aceptó el registro sin error" (el
 * callback de `write()` del stream, o un 2xx). NO significa fsync a disco:
 * `FileTransport` no lo garantiza (ADR-022). Es una garantía honesta y más débil
 * que "confirmado en almacenamiento persistente".
 *
 * `error` está presente cuando el transport falló, aunque otro camino (un
 * `fallback`) haya compensado y `durable` sea `true`: `durable` es el resultado
 * final, `error` es el diagnóstico (lo que necesita un futuro `MetricsRecorder`).
 */
export interface WriteResult {
  readonly durable: boolean;
  readonly error?: unknown;
}
