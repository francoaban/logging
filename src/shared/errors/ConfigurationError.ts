import { DomainError } from "./DomainError.js";

/** Configuración inválida (schema, transport custom no registrado, parámetros fuera de rango). */
export class ConfigurationError extends DomainError {}
