import { type EventId } from "../../domain/value-objects/EventId.js";

/**
 * Puerto de generación de identificadores. El dominio y los casos de uso
 * (Fase 2) solo conocen este contrato; la implementación de referencia
 * (ULID) vive en `infrastructure/ids/UlidEventIdGenerator.ts`.
 */
export interface EventIdGenerator {
  generate(): EventId;
}
