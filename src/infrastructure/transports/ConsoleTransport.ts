import { type LoggableRecord } from "../../domain/entities/LoggableRecord.js";
import { type LogTransport } from "../../application/ports/LogTransport.js";
import { type WritableSink } from "../../application/ports/WritableSink.js";
import { type TransportWriteResult } from "../../application/ports/TransportWriteResult.js";

export interface ConsoleTransportOptions {
  /** Por defecto `process.stdout`. Inyectable para tests y para redirigir a `stderr`. */
  readonly stream?: WritableSink | undefined;
}

// Un solo listener de 'error' por stream, aunque haya varias instancias
// (evita el warning de MaxListeners sobre process.stdout).
const guardedStreams = new WeakSet<object>();

/**
 * Escribe a stdout. `durable: true` acá significa "el stream aceptó la línea":
 * si eso además se conserva depende de quien capture stdout (Docker, systemd, el
 * shell). Un pipe roto (EPIPE) sin listener de 'error' tumba el proceso con una
 * excepción no controlada; el listener de abajo lo evita y la falla se reporta
 * como `durable: false`.
 */
export class ConsoleTransport implements LogTransport {
  readonly name = "console";
  private readonly stream: WritableSink;

  constructor(options: ConsoleTransportOptions = {}) {
    this.stream = options.stream ?? process.stdout;
    if (!guardedStreams.has(this.stream)) {
      guardedStreams.add(this.stream);
      this.stream.on("error", () => {
        /* ya se informa vía el callback de write(); acá solo se evita el crash */
      });
    }
  }

  write(line: string, _record: LoggableRecord): Promise<TransportWriteResult> {
    return new Promise((resolve) => {
      try {
        this.stream.write(`${line}\n`, (error?: Error | null) => {
          resolve(error ? { durable: false, error } : { durable: true });
        });
      } catch (error) {
        resolve({ durable: false, error });
      }
    });
  }

  close(): Promise<void> {
    return Promise.resolve(); // nunca se cierra stdout/stderr del proceso
  }
}
