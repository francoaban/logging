import { type LoggableRecord } from "../../domain/entities/LoggableRecord.js";
import { type TransportWriteResult } from "./TransportWriteResult.js";

/**
 * Strategy de salida (consola, archivo, servicio externo, custom). Un
 * transport NO debe lanzar: convierte sus fallas en `TransportWriteResult` — el logging
 * nunca tiene que tirar abajo la aplicación host.
 */
export interface LogTransport {
  readonly name: string;
  /** `line` ya viene formateada; `record` está para decidir por nivel/tipo si hace falta. */
  write(line: string, record: LoggableRecord): Promise<TransportWriteResult>;
  close?(): Promise<void>;
}
