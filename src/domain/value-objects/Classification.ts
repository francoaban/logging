import { type LogLevel } from "./LogLevel.js";

/**
 * Categoría, severidad y tags asignados a un evento. La produce
 * `EventClassifier` (`domain/services/`, Strategy — ver `patrones_diseno.md`),
 * que se implementa en Fase 2.
 */
export interface Classification {
  readonly category: string;
  readonly severity: LogLevel;
  readonly tags: readonly string[];
}
