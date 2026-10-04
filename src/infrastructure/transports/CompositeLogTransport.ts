import { getRecordLevel, type LoggableRecord } from "../../domain/entities/LoggableRecord.js";
import { type LogTransport } from "../../application/ports/LogTransport.js";
import { type TransportWriteResult } from "../../application/ports/TransportWriteResult.js";
import {
  isCriticalLevel,
  meetsThreshold,
  type LogLevel,
} from "../../domain/value-objects/LogLevel.js";
import { type WritableSink } from "../../application/ports/WritableSink.js";

export interface CompositeEntry {
  readonly transport: LogTransport;
  /** Nivel mínimo que este transport recibe. */
  readonly minLevel: LogLevel;
}

export interface CompositeLogTransportOptions {
  /** Por defecto `process.stderr`. Inyectable para tests. */
  readonly stderr?: WritableSink | undefined;
}

/**
 * Fan-out a todos los transports aplicables (Composite). Es el ÚNICO lugar con
 * la regla de último recurso: si un registro ERROR/FATAL no lo confirmó ningún
 * transport (`durable: true`), se escribe a stderr. Los no críticos, en ese
 * caso, se pierden (decisión documentada: el logging nunca tumba a la app host).
 *
 * "Nada aplicable" (todo filtrado por nivel) no es una falla: devuelve `durable: true`.
 */
export class CompositeLogTransport implements LogTransport {
  readonly name = "composite";

  constructor(
    private readonly entries: readonly CompositeEntry[],
    private readonly options: CompositeLogTransportOptions = {},
  ) {}

  async write(line: string, record: LoggableRecord): Promise<TransportWriteResult> {
    const level = getRecordLevel(record);
    const applicable = this.entries.filter((entry) => meetsThreshold(level, entry.minLevel));
    if (applicable.length === 0) return { durable: true };

    const results = await Promise.all(
      applicable.map((entry) => safeWrite(entry.transport, line, record)),
    );
    const firstError = results.find((result) => result.error !== undefined)?.error;

    if (results.some((result) => result.durable)) {
      return firstError === undefined ? { durable: true } : { durable: true, error: firstError };
    }
    if (isCriticalLevel(level)) this.emergencyWrite(line);
    return { durable: false, error: firstError };
  }

  async close(): Promise<void> {
    await Promise.allSettled(this.entries.map((entry) => entry.transport.close?.()));
  }

  private emergencyWrite(line: string): void {
    try {
      (this.options.stderr ?? process.stderr).write(`${line}\n`);
    } catch {
      /* último recurso agotado: no hay nada más que hacer sin tumbar al host */
    }
  }
}

async function safeWrite(
  transport: LogTransport,
  line: string,
  record: LoggableRecord,
): Promise<TransportWriteResult> {
  try {
    return await transport.write(line, record);
  } catch (error) {
    return { durable: false, error }; // un transport no debería lanzar, pero no se asume
  }
}
