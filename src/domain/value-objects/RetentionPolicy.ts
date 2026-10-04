import { type TenantId } from "./TenantId.js";

/**
 * Política de retención/purga. `purge(policy)` en cada repositorio
 * (`contratos_interfaces.md`) recibe una de estas.
 */
export interface RetentionPolicy {
  readonly resource: "logs" | "events" | "messages" | "audit";
  readonly maxAgeMs: number;
  /** Si se omite, la política aplica a todos los tenants. */
  readonly tenantId?: TenantId;
}
