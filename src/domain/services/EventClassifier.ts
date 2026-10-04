import { type Classification } from "../value-objects/Classification.js";

export interface EventClassifierInput {
  readonly type: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

/**
 * Strategy de clasificación (ver `patrones-diseno.md`). Se resuelve en
 * `RegisterEvent` ANTES de construir la entidad `Event` — `classification`
 * es un campo obligatorio de una entidad inmutable, no algo que un
 * `ProcessingStep` pueda completar después (ver ADR-024).
 */
export interface EventClassifier {
  classify(input: EventClassifierInput): Classification;
}

/**
 * Implementación de referencia: usa el primer segmento de `type` separado
 * por "." como categoría (`"user.created"` → `"user"`), severidad `INFO` y
 * sin tags. Un consumidor con reglas de negocio propias inyecta su propio
 * `EventClassifier` en `createLogger` (extensibilidad vía Strategy).
 */
export class DefaultEventClassifier implements EventClassifier {
  classify(input: EventClassifierInput): Classification {
    const [category] = input.type.split(".");
    return {
      category: category === undefined || category.length === 0 ? "general" : category,
      severity: "INFO",
      tags: [],
    };
  }
}
