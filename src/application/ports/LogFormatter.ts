import { type LoggableRecord } from "../../domain/entities/LoggableRecord.js";

/** Strategy de serialización de un registro a una línea de texto (sin salto de línea final). */
export interface LogFormatter {
  format(record: LoggableRecord): string;
}
