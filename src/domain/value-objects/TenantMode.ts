import { type TenantId } from "./TenantId.js";

/**
 * Cómo se resuelve el `tenant_id` (ver ADR-020, que amplía ADR-018).
 *
 * - `required`: multi-tenant real. Sin `ExecutionContext` activo, los casos de
 *   uso fallan cerrado (`MissingExecutionContextError`).
 * - `fixed`: single-tenant. El consumidor elige el `TenantId` a mano; el módulo
 *   nunca inventa uno por su cuenta. Un `ExecutionContext` activo, si existe,
 *   sigue ganando (es lo más específico).
 */
export type TenantMode =
  { readonly mode: "required" } | { readonly mode: "fixed"; readonly tenantId: TenantId };
