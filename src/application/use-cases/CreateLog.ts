import { type Log } from "../../domain/entities/Log.js";
import { CURRENT_SCHEMA_VERSION, type LogLevel } from "../../domain/value-objects/index.js";
import { toTraceContext } from "../../domain/value-objects/ExecutionContext.js";
import { type ExecutionContextResolver } from "../services/ExecutionContextResolver.js";
import { type EventIdGenerator } from "../ports/EventIdGenerator.js";
import { type DispatchResult, type Dispatcher } from "../ports/Dispatcher.js";
import { type Pipeline } from "../ports/Pipeline.js";

export interface CreateLogInput {
  readonly level: LogLevel;
  readonly message: string;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
}

export class CreateLog {
  constructor(
    private readonly contextResolver: ExecutionContextResolver,
    private readonly idGenerator: EventIdGenerator,
    private readonly pipeline: Pipeline,
    private readonly dispatcher: Dispatcher,
  ) {}

  async execute(input: CreateLogInput): Promise<DispatchResult> {
    const executionContext = this.contextResolver.resolve();
    const log: Log = {
      event_id: this.idGenerator.generate(),
      schema_version: CURRENT_SCHEMA_VERSION,
      tenant_id: executionContext.tenant_id,
      level: input.level,
      message: input.message,
      timestamp: new Date().toISOString(),
      context: toTraceContext(executionContext),
      ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
    };

    const outcome = await this.pipeline.run(log, { executionContext });
    if (outcome.outcome === "drop") {
      return { dispatched: false, reason: `${outcome.stepName}: ${outcome.reason}` };
    }
    return this.dispatcher.dispatch(outcome.record);
  }
}
