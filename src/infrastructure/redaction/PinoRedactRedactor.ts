import pinoRedact from "@pinojs/redact";
import { type Redactor } from "../../application/ports/Redactor.js";
import { type RedactionPolicy } from "../../domain/value-objects/RedactionPolicy.js";

/**
 * Implementación de referencia de `Redactor` (ver ADR-025, con la corrección
 * de seguridad documentada en el adéndum de ese mismo ADR).
 *
 * `@pinojs/redact` con `serialize: false` adjunta una función `restore()` al
 * objeto devuelto, que reconstruye los valores originales sin redactar —
 * documentado en su propio README como feature, no como bug. Eso es
 * inaceptable acá: el objeto "redactado" es el mismo `Log`/`Event`/`Message`
 * que circula por el resto del pipeline y le llega a cada transport — no
 * alcanza con que `JsonFormatter` lo serialice bien (`JSON.stringify` ya
 * descarta funciones por su cuenta); el objeto en memoria no puede retener
 * la capacidad de revelar el secreto. Se elimina esa propiedad antes de que
 * el resultado salga de este adapter.
 */
export class PinoRedactRedactor implements Redactor {
  private readonly apply: (value: unknown) => unknown;

  constructor(policy: RedactionPolicy) {
    this.apply =
      policy.enabled && policy.paths.length > 0
        ? pinoRedact({ paths: [...policy.paths], censor: policy.censor, serialize: false })
        : (value: unknown) => value;
  }

  redact<T extends Readonly<Record<string, unknown>>>(value: T): T {
    const result = this.apply(value) as T & { restore?: unknown };
    delete result.restore;
    return result;
  }
}
