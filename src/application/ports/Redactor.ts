/**
 * Puerto de redacción (ver ADR-025). No expone nada específico de la
 * librería detrás del adapter — `redact` siempre devuelve un objeto nuevo,
 * nunca muta `value`.
 */
export interface Redactor {
  redact<T extends Readonly<Record<string, unknown>>>(value: T): T;
}
