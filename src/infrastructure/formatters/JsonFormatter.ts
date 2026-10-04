import { getRecordType, type LoggableRecord } from "../../domain/entities/LoggableRecord.js";
import { type LogFormatter } from "../../application/ports/LogFormatter.js";

/**
 * Serializa un registro a una línea JSON. Nunca lanza: el logging no puede
 * tirar abajo la app host por un `metadata` raro (referencia circular, BigInt,
 * `Error`, un `toJSON` que explota). Si aun así falla, emite una línea mínima
 * con la identidad del registro y el motivo, en vez de perderlo en silencio.
 */
export class JsonFormatter implements LogFormatter {
  format(record: LoggableRecord): string {
    const recordType = getRecordType(record);
    try {
      return safeStringify({ record_type: recordType, ...record });
    } catch (error) {
      return JSON.stringify({
        record_type: recordType,
        event_id: record.event_id,
        tenant_id: record.tenant_id,
        timestamp: record.timestamp,
        formatter_error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

function safeStringify(value: unknown): string {
  const ancestors: object[] = [];
  return JSON.stringify(value, function (this: unknown, _key: string, current: unknown): unknown {
    if (typeof current === "bigint") return current.toString();
    if (current instanceof Error)
      return { name: current.name, message: current.message, stack: current.stack };
    if (typeof current !== "object" || current === null) return current;

    // `this` es el objeto que contiene a `current`: se desapila hasta él para
    // distinguir un ciclo real de una simple referencia repetida.
    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) ancestors.pop();
    if (ancestors.includes(current)) return "[Circular]";
    ancestors.push(current);
    return current;
  });
}
