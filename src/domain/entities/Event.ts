import {
  type EventId,
  type TenantId,
  type SchemaVersion,
  type TraceContext,
  type Classification,
} from "../value-objects/index.js";

/** Hecho de negocio, sistema o seguridad ocurrido en el host. Inmutable. */
export interface Event {
  readonly event_id: EventId;
  readonly schema_version: SchemaVersion;
  readonly tenant_id: TenantId;
  readonly type: string;
  readonly source: string;
  readonly classification: Classification;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
  readonly context: TraceContext;
}
