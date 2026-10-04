import {
  ConsecutiveBreaker,
  ExponentialBackoff,
  circuitBreaker,
  handleAll,
  handleWhen,
  retry,
  wrap,
} from "cockatiel";
import { ConfigurationError } from "../errors/ConfigurationError.js";

export interface ResilientExecutorOptions {
  /** Intentos totales, incluyendo el primero. Mínimo 1 (= sin reintentos). */
  readonly maxAttempts: number;
  readonly initialDelayMs: number;
  readonly maxDelayMs: number;
  /** Ejecuciones fallidas consecutivas (ya agotados los reintentos) que abren el circuito. */
  readonly circuitBreakerThreshold: number;
  readonly halfOpenAfterMs: number;
  /** Si se omite, se reintenta ante cualquier error. */
  readonly shouldRetry?: ((error: unknown) => boolean) | undefined;
}

export interface ResilientExecutor {
  execute<T>(operation: () => Promise<T>): Promise<T>;
}

/**
 * Composición retry + circuit breaker sobre `cockatiel` (ADR-021). Vive en
 * `shared/` para que el `Broker` de Fase 3 reuse exactamente la misma
 * composición en vez de rearmarla con otros defaults.
 *
 * El breaker va AFUERA del retry (`wrap(breaker, retry)`): cuenta una falla por
 * ejecución ya con los reintentos agotados, y con el circuito abierto rechaza
 * de inmediato (`BrokenCircuitError`) sin gastar reintentos con backoff.
 */
export function createResilientExecutor(options: ResilientExecutorOptions): ResilientExecutor {
  if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1) {
    throw new ConfigurationError(
      `maxAttempts debe ser un entero >= 1, se recibió ${options.maxAttempts}`,
    );
  }
  if (!Number.isInteger(options.circuitBreakerThreshold) || options.circuitBreakerThreshold < 1) {
    throw new ConfigurationError(
      `circuitBreakerThreshold debe ser un entero >= 1, se recibió ${options.circuitBreakerThreshold}`,
    );
  }

  const retryPolicy = retry(options.shouldRetry ? handleWhen(options.shouldRetry) : handleAll, {
    maxAttempts: options.maxAttempts - 1, // cockatiel cuenta reintentos, no intentos totales
    backoff: new ExponentialBackoff({
      initialDelay: options.initialDelayMs,
      maxDelay: options.maxDelayMs,
    }),
  });
  const breakerPolicy = circuitBreaker(handleAll, {
    halfOpenAfter: options.halfOpenAfterMs,
    breaker: new ConsecutiveBreaker(options.circuitBreakerThreshold),
  });
  const policy = wrap(breakerPolicy, retryPolicy);

  return { execute: (operation) => policy.execute(() => operation()) };
}
