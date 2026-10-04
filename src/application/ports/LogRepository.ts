import { type Log } from "../../domain/entities/Log.js";
import {
  type LogLevel,
  type RetentionPolicy,
  type TenantId,
} from "../../domain/value-objects/index.js";

/**
 * Toda consulta exige `tenant_id`: el aislamiento multi-tenant se resuelve
 * en origen, en la propia forma de la query, no solo en
 * `AuthorizedReportScope` en el momento de leer reportes (`ROADMAP.md`,
 * pendiente de Fase 1).
 */
export interface LogQuery {
  readonly tenant_id: TenantId;
  readonly levels?: readonly LogLevel[];
  readonly from?: string;
  readonly to?: string;
  readonly correlation_id?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

/**
 * `save` debe ser idempotente usando el `event_id` del registro
 * (`contratos_interfaces.md`). `find` no puede recibir filtros que amplíen
 * el alcance autorizado por la capa de aplicación — esa validación ocurre en
 * Fase 6 (`ReportAuthorizationService`), no en el repositorio.
 */
export interface LogRepository {
  save(log: Log): Promise<void>;
  find(query: LogQuery): Promise<readonly Log[]>;
  purge(policy: RetentionPolicy): Promise<number>;
}
