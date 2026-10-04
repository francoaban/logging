import { type Event } from "../../domain/entities/Event.js";
import { CURRENT_SCHEMA_VERSION } from "../../domain/value-objects/index.js";
import { toTraceContext } from "../../domain/value-objects/ExecutionContext.js";
import { type EventClassifier } from "../../domain/services/EventClassifier.js";
import { type ExecutionContextResolver } from "../services/ExecutionContextResolver.js";
import { type EventIdGenerator } from "../ports/EventIdGenerator.js";
import { type DispatchResult, type Dispatcher } from "../ports/Dispatcher.js";
import { type RegisterEventInput } from "../ports/LoggingFacade.js";
import { type Pipeline } from "../ports/Pipeline.js";

export class RegisterEvent {
  constructor(
    private readonly contextResolver: ExecutionContextResolver,
    private readonly idGenerator: EventIdGenerator,
    private readonly classifier: EventClassifier,
    private readonly pipeline: Pipeline,
    private readonly dispatcher: Dispatcher,
  ) {}

  async execute(input: RegisterEventInput): Promise<DispatchResult> {
    const executionContext = this.contextResolver.resolve();
    // Clasificación resuelta ACÁ, antes de construir la entidad (ver ADR-024):
    // `classification` es obligatorio en `Event`, no hay "evento a medio construir".
    const classification =
      input.classification ??
      this.classifier.classify({ type: input.type, payload: input.payload });

    const event: Event = {
      event_id: this.idGenerator.generate(),
      schema_version: CURRENT_SCHEMA_VERSION,
      tenant_id: executionContext.tenant_id,
      type: input.type,
      source: input.source,
      classification,
      payload: input.payload,
      timestamp: new Date().toISOString(),
      context: toTraceContext(executionContext),
    };

    const outcome = await this.pipeline.run(event, { executionContext });
    if (outcome.outcome === "drop") {
      return { dispatched: false, reason: `${outcome.stepName}: ${outcome.reason}` };
    }
    return this.dispatcher.dispatch(outcome.record);
  }
}
