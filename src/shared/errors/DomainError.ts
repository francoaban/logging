/**
 * Base de la jerarquía de errores propia del módulo. Se adelanta de Fase 2
 * (ver ADR-018) porque `MissingExecutionContextError` ya hace falta para que
 * los casos de uso de Fase 2 puedan fallar cerrado.
 */
export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
