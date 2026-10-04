import { type EventIdGenerator } from "../../application/ports/EventIdGenerator.js";
import { EventId } from "../../domain/value-objects/EventId.js";
import { generateUlid } from "../../shared/utils/ulid.js";

/** Implementación de referencia de `EventIdGenerator` usando ULID. */
export class UlidEventIdGenerator implements EventIdGenerator {
  generate(): EventId {
    return EventId(generateUlid());
  }
}
