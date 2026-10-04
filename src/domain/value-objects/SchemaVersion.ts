/**
 * Versión del esquema de `Log`/`Event`/`Message`.
 *
 * Sin un campo explícito, un cambio de forma en las entidades rompe a
 * cualquier consumidor de `ReportService` sin ningún aviso — con este campo,
 * al menos se puede detectar y migrar por versión.
 */
export type SchemaVersion = number & { readonly __brand: "SchemaVersion" };

/** Versión vigente que deben usar los registros nuevos creados por el módulo. */
export const CURRENT_SCHEMA_VERSION = 1 as SchemaVersion;

export function SchemaVersion(value: number): SchemaVersion {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`SchemaVersion inválida: se esperaba un entero >= 1, se recibió ${value}`);
  }
  return value as SchemaVersion;
}
