import {
  type LogLevel,
  type EventId,
  type TenantId,
  type SchemaVersion,
  type TraceContext,
} from "../value-objects/index.js";

/**
 * Registro técnico o funcional.
 *
 * Inmutable: toda propiedad es `readonly` y no expone métodos de mutación —
 * un `Log` no cambia una vez creado; si el pipeline lo redacta o normaliza
 * (Fase 2), produce un `Log` nuevo, no muta el existente.
 */
export interface Log {
  readonly event_id: EventId;
  readonly schema_version: SchemaVersion;
  readonly tenant_id: TenantId;
  readonly level: LogLevel;
  readonly message: string;
  /** ISO 8601 en UTC. */
  readonly timestamp: string;
  readonly context: TraceContext;
  readonly metadata?: Readonly<Record<string, unknown>>;
}
