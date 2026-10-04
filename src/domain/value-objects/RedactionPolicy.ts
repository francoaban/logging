/**
 * Política de redacción (`RedactionStep`, ver ADR-025). `paths` usa la
 * sintaxis de `@pinojs/redact`/`fast-redact` (`a.b`, `a.*`, `a[*].b`) — pero
 * **relativos a `metadata`/`payload`, no al registro completo**:
 * `RedactionStep` ya le pasa al redactor `record.metadata`/`record.payload`
 * desenvuelto, nunca el registro entero. Para enmascarar
 * `metadata.password` en un `Log`, el path es `"password"`, NO
 * `"metadata.password"` (ese es un error de configuración fácil de cometer
 * — verificado en runtime: con el prefijo de más, el path simplemente no
 * matchea nada y la redacción queda en silencio sin aplicar).
 *
 * Esta forma relativa es intencional, no solo un detalle de implementación:
 * una misma política sirve para `Log.metadata` y para `Event`/`Message.payload`
 * sin que el consumidor tenga que listar dos variantes del mismo campo.
 *
 * Nunca se aplica sobre los campos propios de la entidad (`event_id`,
 * `tenant_id`, etc.) — esos ni siquiera llegan al redactor.
 */
export interface RedactionPolicy {
  readonly enabled: boolean;
  readonly paths: readonly string[];
  readonly censor: string;
}

export function RedactionPolicy(input: {
  readonly enabled: boolean;
  readonly paths: readonly string[];
  readonly censor?: string;
}): RedactionPolicy {
  if (input.enabled && input.paths.length === 0) {
    throw new Error("RedactionPolicy: enabled=true requiere al menos un path en 'paths'");
  }
  return { enabled: input.enabled, paths: input.paths, censor: input.censor ?? "[REDACTED]" };
}
