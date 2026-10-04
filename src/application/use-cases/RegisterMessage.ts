import { type Message } from "../../domain/entities/Message.js";
import { CURRENT_SCHEMA_VERSION, IdempotencyKey } from "../../domain/value-objects/index.js";
import { toTraceContext } from "../../domain/value-objects/ExecutionContext.js";
import { type ExecutionContextResolver } from "../services/ExecutionContextResolver.js";
import { type EventIdGenerator } from "../ports/EventIdGenerator.js";
import { type DispatchResult, type Dispatcher } from "../ports/Dispatcher.js";
import { type RegisterMessageInput } from "../ports/LoggingFacade.js";
import { type Pipeline } from "../ports/Pipeline.js";

/**
 * `idempotency_key` se deriva de `event_id` como placeholder (igual criterio
 * que ya está documentado y pendiente de revisar en `ROADMAP.md`, Fase 3: si
 * un reintento del broker genera un `event_id` nuevo por intento, esta
 * derivación no deduplica nada — no se resuelve acá a propósito, es decisión
 * de Fase 3, no de Fase 2a).
 */
export class RegisterMessage {
  constructor(
    private readonly contextResolver: ExecutionContextResolver,
    private readonly idGenerator: EventIdGenerator,
    private readonly pipeline: Pipeline,
    private readonly dispatcher: Dispatcher,
  ) {}

  async execute(input: RegisterMessageInput): Promise<DispatchResult> {
    const executionContext = this.contextResolver.resolve();
    const eventId = this.idGenerator.generate();

    const message: Message = {
      event_id: eventId,
      schema_version: CURRENT_SCHEMA_VERSION,
      tenant_id: executionContext.tenant_id,
      status: input.status,
      idempotency_key: IdempotencyKey("messages", eventId),
      payload: input.payload,
      timestamp: new Date().toISOString(),
      context: toTraceContext(executionContext),
    };

    const outcome = await this.pipeline.run(message, { executionContext });
    if (outcome.outcome === "drop") {
      return { dispatched: false, reason: `${outcome.stepName}: ${outcome.reason}` };
    }
    return this.dispatcher.dispatch(outcome.record);
  }
}
