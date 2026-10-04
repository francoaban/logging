import { type RedactionPolicy } from "./RedactionPolicy.js";
import { type SamplingPolicy } from "./SamplingPolicy.js";
import { type RateLimitPolicy } from "./RateLimitPolicy.js";

/**
 * Config de *si el log llega a existir* (redacción, sampling, rate limiting)
 * — separada de `LoggerConfig`, que es sobre *dónde sale* (transports,
 * rotación). Ver nota de diseño en `ROADMAP.md`, Fase 2a: mezclarlas hubiera
 * obligado a reabrir `LoggerConfig` (ya cerrado en Fase 2b) para agregar
 * campos que no tienen nada que ver con transports.
 */
export interface PipelineConfig {
  readonly redaction: RedactionPolicy;
  readonly sampling: SamplingPolicy;
  readonly rateLimit: RateLimitPolicy;
}

/** Sin redacción/sampling/rate-limit — logging simple, todo pasa. */
export function defaultPipelineConfig(): PipelineConfig {
  return {
    redaction: RedactionPolicyDisabled(),
    sampling: SamplingPolicyDisabled(),
    rateLimit: RateLimitPolicyDisabled(),
  };
}

// Imports tardíos evitando ciclo de módulos en el barrel (ver index.ts del paquete):
import { RedactionPolicy as RedactionPolicyCtor } from "./RedactionPolicy.js";
import { SamplingPolicy as SamplingPolicyCtor } from "./SamplingPolicy.js";
import { RateLimitPolicy as RateLimitPolicyCtor } from "./RateLimitPolicy.js";

function RedactionPolicyDisabled(): RedactionPolicy {
  return RedactionPolicyCtor({ enabled: false, paths: [] });
}
function SamplingPolicyDisabled(): SamplingPolicy {
  return SamplingPolicyCtor({ enabled: false, sampledLevels: [], rate: 1 });
}
function RateLimitPolicyDisabled(): RateLimitPolicy {
  return RateLimitPolicyCtor({
    enabled: false,
    maxPerWindow: 1,
    windowMs: 1000,
    maxTrackedKeys: 1,
  });
}
