/**
 * Identificador único de un `Log`/`Event`/`Message`.
 *
 * Se exige formato ULID (26 caracteres, Crockford Base32) en vez de UUIDv4:
 * un ULID es ordenable lexicográficamente por tiempo de creación, lo que
 * ayuda al Read Model (Fase 5) a paginar y ordenar sin depender de un
 * timestamp separado e indexado (decisión tomada en `ROADMAP.md`, pendiente
 * de Fase 1 — "definir el generador de event_id").
 *
 * Este archivo solo valida la *forma* del identificador. La generación
 * concreta vive detrás del puerto `EventIdGenerator`
 * (`application/ports/EventIdGenerator.ts`), con una implementación de
 * referencia en `infrastructure/ids/UlidEventIdGenerator.ts`. Así el
 * dominio nunca depende de cómo se genera un ID, solo de qué forma es válida.
 */
const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

export type EventId = string & { readonly __brand: "EventId" };

export function EventId(value: string): EventId {
  if (!ULID_PATTERN.test(value)) {
    throw new Error(
      `EventId inválido: se esperaba un ULID de 26 caracteres (Crockford Base32), se recibió "${value}"`,
    );
  }
  return value as EventId;
}
