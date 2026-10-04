import { type LoggableRecord } from "../../domain/entities/LoggableRecord.js";
import { type LogTransport } from "../../application/ports/LogTransport.js";
import { type TransportWriteResult } from "../../application/ports/TransportWriteResult.js";
import { type ResilienceConfig } from "../../domain/value-objects/LoggerConfig.js";
import {
  createResilientExecutor,
  type ResilientExecutor,
} from "../../shared/resilience/createResilientExecutor.js";

export interface HttpTransportOptions {
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>> | undefined;
  readonly resilience?: ResilienceConfig | undefined;
  /** Otro transport (ya construido) al que se degrada si el HTTP falla o el circuito está abierto. */
  readonly fallback?: LogTransport | undefined;
  /** Inyectable para tests. Por defecto, el `fetch` global (Node >= 20). */
  readonly fetchImpl?: typeof fetch | undefined;
}

class HttpStatusError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
    this.name = "HttpStatusError";
  }
}

/** 5xx, 408 y 429 son transitorios; el resto de los 4xx (auth, payload) no mejoran reintentando. */
function isRetryable(error: unknown): boolean {
  if (!(error instanceof HttpStatusError)) return true; // red, timeout, DNS
  return error.status >= 500 || error.status === 408 || error.status === 429;
}

/**
 * Envía cada registro como un POST JSON, con retry + circuit breaker (ADR-021).
 *
 * LIMITACIÓN CONOCIDA: 1 request por registro. Sirve para volumen bajo/medio y
 * para umbrales altos (`level: "ERROR"`); para alto volumen hace falta batching,
 * que se resuelve en Fase 3 junto con el buffer acotado y el backpressure.
 *
 * Si no hay `fallback` y el HTTP falla, devuelve `durable: false`; el último
 * recurso a stderr para ERROR/FATAL lo aplica `CompositeLogTransport`, no acá.
 */
export class HttpTransport implements LogTransport {
  readonly name = "http";
  private readonly executor: ResilientExecutor;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(private readonly options: HttpTransportOptions) {
    const resilience = options.resilience ?? {};
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = resilience.timeoutMs ?? 5000;
    this.executor = createResilientExecutor({
      maxAttempts: resilience.maxAttempts ?? 3,
      initialDelayMs: resilience.initialDelayMs ?? 200,
      maxDelayMs: resilience.maxDelayMs ?? 2000,
      circuitBreakerThreshold: resilience.circuitBreakerThreshold ?? 5,
      halfOpenAfterMs: resilience.halfOpenAfterMs ?? 10_000,
      shouldRetry: isRetryable,
    });
  }

  async write(line: string, record: LoggableRecord): Promise<TransportWriteResult> {
    try {
      await this.executor.execute(() => this.send(line));
      return { durable: true };
    } catch (error) {
      return this.recover(line, record, error);
    }
  }

  async close(): Promise<void> {
    await this.options.fallback?.close?.();
  }

  private async send(line: string): Promise<void> {
    const response = await this.fetchImpl(this.options.url, {
      method: "POST",
      headers: { "content-type": "application/json", ...this.options.headers },
      body: line,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    try {
      await response.body?.cancel(); // libera el socket sin leer el cuerpo
    } catch {
      /* irrelevante para el resultado */
    }
    if (!response.ok) throw new HttpStatusError(response.status);
  }

  private async recover(
    line: string,
    record: LoggableRecord,
    error: unknown,
  ): Promise<TransportWriteResult> {
    const fallback = this.options.fallback;
    if (fallback === undefined) return { durable: false, error };
    try {
      const result = await fallback.write(line, record);
      return { durable: result.durable, error };
    } catch (fallbackError) {
      return { durable: false, error: fallbackError };
    }
  }
}
