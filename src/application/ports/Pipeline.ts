import { type LoggableRecord } from "../../domain/entities/LoggableRecord.js";
import { type ProcessingContext, type ProcessingOutcome } from "./ProcessingStep.js";

/**
 * Puerto de la pipeline de procesamiento. `ProcessingPipeline` (Chain of
 * Responsibility, `src/pipeline/`) es la implementación de referencia, pero
 * los casos de uso (`CreateLog`/`RegisterEvent`/`RegisterMessage`) dependen de
 * esta interfaz, no de esa clase concreta — mismo criterio de inversión de
 * dependencias que ya se aplica a `Dispatcher`/`LogTransport`/`ProcessingStep`.
 * Sin este puerto, un test de caso de uso no podía sustituir la pipeline por
 * un fake sin violar el tipo (detectado por el propio compilador al escribir
 * los tests de Fase 2a, no de antemano).
 */
export interface Pipeline {
  run(record: LoggableRecord, context: ProcessingContext): Promise<ProcessingOutcome>;
}
