import { type LoggableRecord } from "../../domain/entities/LoggableRecord.js";
import { type DispatchResult, type Dispatcher } from "../../application/ports/Dispatcher.js";
import { type LogFormatter } from "../../application/ports/LogFormatter.js";
import { type LogTransport } from "../../application/ports/LogTransport.js";

/** Solo modo "sync" (ver `Dispatcher`); "async" llega en Fase 3 con el Broker. */
export class DefaultDispatcher implements Dispatcher {
  constructor(
    private readonly transport: LogTransport,
    private readonly formatter: LogFormatter,
  ) {}

  async dispatch(record: LoggableRecord): Promise<DispatchResult> {
    const line = this.formatter.format(record);
    const writeResult = await this.transport.write(line, record);
    return { dispatched: writeResult.durable, writeResult };
  }
}
