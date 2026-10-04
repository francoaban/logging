import { AsyncLocalStorageContextManager } from "./infrastructure/observability/AsyncLocalStorageContextManager.js";
import { UlidEventIdGenerator } from "./infrastructure/ids/UlidEventIdGenerator.js";
import { DefaultTransportFactory } from "./infrastructure/transports/DefaultTransportFactory.js";
import { JsonFormatter } from "./infrastructure/formatters/JsonFormatter.js";
import { DefaultDispatcher } from "./infrastructure/dispatch/DefaultDispatcher.js";
import { PinoRedactRedactor } from "./infrastructure/redaction/PinoRedactRedactor.js";
import { FixedWindowRateLimiter } from "./infrastructure/ratelimit/FixedWindowRateLimiter.js";
import { DefaultLoggingFacade } from "./infrastructure/facade/DefaultLoggingFacade.js";
import { parseModuleConfig } from "./infrastructure/config/loggerConfigSchema.js";
import { generateUlid } from "./shared/utils/ulid.js";

import { type ContextManager } from "./application/ports/ContextManager.js";
import { type EventIdGenerator } from "./application/ports/EventIdGenerator.js";
import { type TransportFactory } from "./application/ports/TransportFactory.js";
import { type LoggingFacade } from "./application/ports/LoggingFacade.js";
import { ExecutionContextResolver } from "./application/services/ExecutionContextResolver.js";
import { CreateLog } from "./application/use-cases/CreateLog.js";
import { RegisterEvent } from "./application/use-cases/RegisterEvent.js";
import { RegisterMessage } from "./application/use-cases/RegisterMessage.js";

import { DefaultEventClassifier, type EventClassifier } from "./domain/services/EventClassifier.js";

import { ProcessingPipeline } from "./pipeline/ProcessingPipeline.js";
import { ValidationStep } from "./pipeline/steps/ValidationStep.js";
import { NormalizationStep } from "./pipeline/steps/NormalizationStep.js";
import { RedactionStep } from "./pipeline/steps/RedactionStep.js";
import { SamplingStep } from "./pipeline/steps/SamplingStep.js";
import {
  ByLevelRateLimitKeyStrategy,
  RateLimitingStep,
  type RateLimitKeyStrategy,
} from "./pipeline/steps/RateLimitingStep.js";

/**
 * Dependencias reemplazables que no pueden venir de JSON/env (no son datos,
 * son colaboradores con comportamiento) — el punto de extensión real de
 * "Adaptadores extensibles (Strategy + Factory)" para lo que la config
 * serializable no puede cubrir. Todo tiene un default de referencia: `createLogger()`
 * sin argumentos funciona (plug-and-play).
 */
export interface CreateLoggerOverrides {
  readonly contextManager?: ContextManager | undefined;
  readonly idGenerator?: EventIdGenerator | undefined;
  readonly eventClassifier?: EventClassifier | undefined;
  readonly rateLimitKeyStrategy?: RateLimitKeyStrategy | undefined;
  readonly transportFactory?: TransportFactory | undefined;
  readonly generateCorrelationId?: (() => string) | undefined;
}

/**
 * Punto de entrada público del módulo. `config` se valida con
 * `parseModuleConfig` (Zod) — un objeto plano con `defaultLevel`, `tenant`,
 * `transports`, `redaction`, `sampling`, `rateLimit`, todos opcionales.
 */
export function createLogger(
  config: unknown = {},
  overrides: CreateLoggerOverrides = {},
): LoggingFacade {
  const { logger, pipeline } = parseModuleConfig(config);

  const contextManager = overrides.contextManager ?? new AsyncLocalStorageContextManager();
  const idGenerator = overrides.idGenerator ?? new UlidEventIdGenerator();
  const generateCorrelationId = overrides.generateCorrelationId ?? generateUlid;
  const contextResolver = new ExecutionContextResolver({
    contextManager,
    tenant: logger.tenant,
    generateCorrelationId,
  });

  const transportFactory = overrides.transportFactory ?? new DefaultTransportFactory();
  const transport = transportFactory.createAll(logger);
  const dispatcher = new DefaultDispatcher(transport, new JsonFormatter());

  const redactor = new PinoRedactRedactor(pipeline.redaction);
  const rateLimiter = new FixedWindowRateLimiter(pipeline.rateLimit);
  const rateLimitKeyStrategy = overrides.rateLimitKeyStrategy ?? new ByLevelRateLimitKeyStrategy();

  const processingPipeline = new ProcessingPipeline([
    new ValidationStep(),
    new NormalizationStep(),
    new RedactionStep(redactor),
    new SamplingStep(pipeline.sampling),
    new RateLimitingStep(rateLimiter, rateLimitKeyStrategy),
  ]);

  const eventClassifier = overrides.eventClassifier ?? new DefaultEventClassifier();

  const createLog = new CreateLog(contextResolver, idGenerator, processingPipeline, dispatcher);
  const registerEvent = new RegisterEvent(
    contextResolver,
    idGenerator,
    eventClassifier,
    processingPipeline,
    dispatcher,
  );
  const registerMessage = new RegisterMessage(
    contextResolver,
    idGenerator,
    processingPipeline,
    dispatcher,
  );

  return new DefaultLoggingFacade(createLog, registerEvent, registerMessage, transport);
}
