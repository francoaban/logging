import { type Event } from "./Event.js";
import { type Log } from "./Log.js";
import { type Message } from "./Message.js";
import { type LogLevel } from "../value-objects/LogLevel.js";

/** Cualquier cosa que el módulo escribe a un transport. */
export type LoggableRecord = Log | Event | Message;

export type RecordType = "log" | "event" | "message";

export function getRecordType(record: LoggableRecord): RecordType {
  if ("level" in record) return "log";
  if ("classification" in record) return "event";
  return "message";
}

/**
 * Nivel efectivo de un registro, para filtrar por umbral y decidir si es
 * crítico. `Log` trae su `level`; `Event` usa la severidad de su
 * clasificación; `Message` no tiene nivel propio: un mensaje `failed` cuenta
 * como `ERROR` (así entra en la garantía de no-pérdida de `ERROR`/`FATAL`) y
 * el resto como `INFO`.
 */
export function getRecordLevel(record: LoggableRecord): LogLevel {
  if ("level" in record) return record.level;
  if ("classification" in record) return record.classification.severity;
  return record.status === "failed" ? "ERROR" : "INFO";
}
