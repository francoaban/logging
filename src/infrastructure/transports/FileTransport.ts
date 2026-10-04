import { createWriteStream, mkdirSync } from "node:fs";
import { basename, dirname } from "node:path";
import { finished } from "node:stream/promises";
import { type Writable } from "node:stream";
import { createStream, type Options as RotatingOptions } from "rotating-file-stream";
import { type LogTransport } from "../../application/ports/LogTransport.js";
import { type TransportWriteResult } from "../../application/ports/TransportWriteResult.js";
import { type RotationPolicy } from "../../domain/value-objects/RotationPolicy.js";
import { type LoggableRecord } from "../../domain/entities/LoggableRecord.js";

export interface FileTransportOptions {
  readonly path: string;
  readonly rotation?: RotationPolicy | undefined;
  /** Errores de escritura o de rotación del stream. Sin listener, un 'error' tumba el proceso. */
  readonly onError?: ((error: Error) => void) | undefined;
}

/**
 * Escritura a archivo con rotación delegada en `rotating-file-stream` (ADR-022),
 * que ya resuelve lo delicado: nunca pisar un archivo existente, retención por
 * `maxFiles`, compresión y los eventos de error.
 *
 * Límites documentados, no escondidos:
 * - `durable: true` = el stream aceptó la línea (buffer del SO). NO hay fsync,
 *   ni siquiera para ERROR/FATAL; queda como spike en ROADMAP (Fase 2b).
 * - La atomicidad de cada línea bajo escrituras concurrentes depende de
 *   `O_APPEND` y de líneas menores a PIPE_BUF; no aplica en NFS.
 * - Si el stream se destruye por un error, las escrituras siguientes devuelven
 *   `durable: false`; no hay reapertura automática.
 */
export class FileTransport implements LogTransport {
  readonly name = "file";
  private readonly stream: Writable;

  constructor(options: FileTransportOptions) {
    const rotation: RotationPolicy = options.rotation ?? { strategy: "none" };
    const onError = options.onError ?? (() => undefined);
    mkdirSync(dirname(options.path), { recursive: true });

    if (rotation.strategy === "none") {
      this.stream = createWriteStream(options.path, { flags: "a" });
    } else {
      const rotating = createStream(basename(options.path), {
        ...toRotatingOptions(rotation),
        path: dirname(options.path),
      });
      rotating.on("warning", onError);
      this.stream = rotating;
    }
    this.stream.on("error", onError);
  }

  write(line: string, _record: LoggableRecord): Promise<TransportWriteResult> {
    return new Promise((resolve) => {
      if (this.stream.destroyed || this.stream.writableEnded) {
        resolve({ durable: false, error: new Error("FileTransport: el stream ya está cerrado") });
        return;
      }
      try {
        this.stream.write(`${line}\n`, (error?: Error | null) => {
          resolve(error ? { durable: false, error } : { durable: true });
        });
      } catch (error) {
        resolve({ durable: false, error });
      }
    });
  }

  async close(): Promise<void> {
    if (this.stream.destroyed) return;
    this.stream.end();
    await finished(this.stream).catch(() => undefined);
  }
}

function toRotatingOptions(policy: Exclude<RotationPolicy, { strategy: "none" }>): RotatingOptions {
  const options: RotatingOptions = { maxFiles: policy.maxFiles };
  if (policy.strategy === "size" || policy.strategy === "size-or-time") {
    options.size = `${policy.maxSizeBytes}B`;
  }
  if (policy.strategy === "time" || policy.strategy === "size-or-time") {
    options.interval = policy.interval === "hourly" ? "1h" : "1d";
  }
  if (policy.compress) options.compress = "gzip";
  return options;
}
