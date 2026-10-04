/**
 * Contexto de trazabilidad distribuida.
 *
 * Los nombres de campo usan `snake_case` a propósito: son los mismos que
 * exige la convención de OpenTelemetry y los que ya usan `observabilidad.md`
 * y `contratos_interfaces.md`. Convertirlos a camelCase "por consistencia con
 * TypeScript" rompería la correlación directa con el backend de trazas
 * (Fase 4) y obligaría a mapear ida y vuelta sin ningún beneficio real.
 */
export interface TraceContext {
  readonly correlation_id: string;
  readonly request_id?: string;
  readonly trace_id?: string;
  readonly span_id?: string;
}
