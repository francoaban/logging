/**
 * Identificador de tenant.
 *
 * Se agrega en Fase 1 porque `AuthorizedReportScope` (lado de lectura, ver
 * `contratos_interfaces.md`) ya filtra por `tenantIds`, pero ninguna entidad
 * de escritura lo capturaba en origen (`ROADMAP.md`, pendiente de Fase 1).
 * Sin este campo en `Log`/`Event`/`Message`, el aislamiento multi-tenant en
 * reportes es imposible de garantizar: no hay nada que la autorización de
 * lectura pueda filtrar si la escritura nunca lo etiquetó.
 *
 * Tipo "branded" (no un `string` plano) para que el compilador impida pasar
 * cualquier string suelto donde se espera un `TenantId` validado.
 */
export type TenantId = string & { readonly __brand: "TenantId" };

export function TenantId(value: string): TenantId {
  if (value.trim().length === 0) {
    throw new Error("TenantId no puede ser una cadena vacía");
  }
  return value as TenantId;
}
