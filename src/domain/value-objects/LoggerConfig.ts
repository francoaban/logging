import { type LogLevel } from "./LogLevel.js";
import { type RotationPolicy } from "./RotationPolicy.js";
import { type TenantMode } from "./TenantMode.js";

/*
 * Los campos opcionales llevan `| undefined` a propósito: la config llega de
 * afuera (JSON / variables de entorno) y Zod infiere `T | undefined` para
 * `.optional()`. Con `exactOptionalPropertyTypes` activo, sin esto el tipo del
 * schema y el del dominio no serían asignables entre sí.
 */

export interface ResilienceConfig {
  /** Intentos totales, incluyendo el primero (1 = sin reintentos). Default 3. */
  readonly maxAttempts?: number | undefined;
  readonly initialDelayMs?: number | undefined; // default 200
  readonly maxDelayMs?: number | undefined; // default 2000
  /** Timeout por request. Sin él, un endpoint colgado nunca dispara el retry. Default 5000. */
  readonly timeoutMs?: number | undefined;
  /** Fallos consecutivos (ya agotados los reintentos) que abren el circuito. Default 5. */
  readonly circuitBreakerThreshold?: number | undefined;
  readonly halfOpenAfterMs?: number | undefined; // default 10000
}

/**
 * Datos puros (sin instancias): tiene que poder venir de JSON/env y validarse
 * con Zod. Por eso `fallback` es config anidada y no un `LogTransport` — la
 * `TransportFactory` la resuelve a una instancia real, recursivamente.
 */
export type TransportConfig =
  | { readonly type: "console"; readonly level?: LogLevel | undefined }
  | {
      readonly type: "file";
      readonly level?: LogLevel | undefined;
      readonly path: string;
      readonly rotation: RotationPolicy;
    }
  | {
      readonly type: "http";
      readonly level?: LogLevel | undefined;
      readonly url: string;
      readonly headers?: Readonly<Record<string, string>> | undefined;
      readonly resilience?: ResilienceConfig | undefined;
      readonly fallback?: TransportConfig | undefined;
    }
  | {
      /** Punto de extensión (Strategy + Factory): un builder registrado con `registerCustom(name, ...)`. */
      readonly type: "custom";
      readonly name: string;
      readonly level?: LogLevel | undefined;
      readonly options?: Readonly<Record<string, unknown>> | undefined;
    };

export interface LoggerConfig {
  /** Nivel mínimo global; cada transport puede subirlo o bajarlo con su propio `level`. */
  readonly defaultLevel: LogLevel;
  readonly tenant: TenantMode;
  readonly transports: readonly TransportConfig[];
}
