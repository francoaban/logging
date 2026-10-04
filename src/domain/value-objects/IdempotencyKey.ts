import { type EventId } from "./EventId.js";

/**
 * Clave de idempotencia usada por `save()` en cada repositorio
 * (`contratos_interfaces.md`: "`save` debe ser idempotente usando el
 * `event_id`") y por el claim del worker asíncrono (`IdempotencyStore`,
 * Fase 3).
 *
 * Se deriva del `EventId` **y** del recurso para que un mismo `EventId`
 * nunca colisione entre recursos distintos (por ejemplo, si algún día se
 * reutiliza un ULID entre un `Log` y un `Message` por error de integración).
 */
export type IdempotencyKey = string & { readonly __brand: "IdempotencyKey" };

export function IdempotencyKey(
  resource: "logs" | "events" | "messages",
  eventId: EventId,
): IdempotencyKey {
  return `${resource}:${eventId}` as IdempotencyKey;
}
