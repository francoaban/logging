/**
 * Resultado de escribir un registro en un transport — deliberadamente NO se
 * llama `WriteResult` a secas: ese nombre ya está reservado en
 * `contratos_interfaces.md` (original) para el resultado de
 * `LoggingFacade.createLog/registerEvent/registerMessage` (Fase 2a), que es
 * un concepto de otro nivel — el resultado de un caso de uso completo, no el
 * de un solo transport dentro de un `CompositeLogTransport`. Usar el mismo
 * nombre para ambos hubiera sido una cuarta colisión de contratos en este
 * proyecto (ver `ADR-015`/`ADR-016`), detectada acá antes de que llegara a
 * implementarse.
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
export interface TransportWriteResult {
  readonly durable: boolean;
  readonly error?: unknown;
}
