import {
  type LoggerConfig,
  type TransportConfig,
} from "../../domain/value-objects/LoggerConfig.js";
import { type LogTransport } from "./LogTransport.js";

export interface TransportFactory {
  /** Construye un transport individual (resolviendo `fallback` anidado, si hay). */
  create(config: TransportConfig): LogTransport;
  /** Construye el transport compuesto que despacha a todos los configurados, con su umbral de nivel. */
  createAll(config: LoggerConfig): LogTransport;
}
