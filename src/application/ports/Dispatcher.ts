import { type LoggableRecord } from "../../domain/entities/LoggableRecord.js";
import { type TransportWriteResult } from "./TransportWriteResult.js";

/** "async" se agrega en Fase 3 (vía Broker); hoy solo existe "sync". */
export type ProcessingMode = "sync";

export interface DispatchResult {
  readonly dispatched: boolean;
  readonly reason?: string | undefined;
  readonly writeResult?: TransportWriteResult | undefined;
}

export interface Dispatcher {
  dispatch(record: LoggableRecord, mode?: ProcessingMode): Promise<DispatchResult>;
}
