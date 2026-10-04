import { z } from "zod";
import { isCriticalLevel, LOG_LEVELS } from "../../domain/value-objects/LogLevel.js";
import {
  type LoggerConfig,
  type TransportConfig,
} from "../../domain/value-objects/LoggerConfig.js";
import { type PipelineConfig } from "../../domain/value-objects/PipelineConfig.js";
import { TenantId } from "../../domain/value-objects/TenantId.js";
import { ConfigurationError } from "../../shared/errors/ConfigurationError.js";

const levelSchema = z.enum(LOG_LEVELS);
const positiveInt = z.number().int().positive();
const intervalSchema = z.enum(["hourly", "daily"]);

const rotationSchema = z.discriminatedUnion("strategy", [
  z.strictObject({ strategy: z.literal("none") }),
  z.strictObject({
    strategy: z.literal("size"),
    maxSizeBytes: positiveInt,
    maxFiles: positiveInt,
    compress: z.boolean().default(false),
  }),
  z.strictObject({
    strategy: z.literal("time"),
    interval: intervalSchema,
    maxFiles: positiveInt,
    compress: z.boolean().default(false),
  }),
  z.strictObject({
    strategy: z.literal("size-or-time"),
    maxSizeBytes: positiveInt,
    interval: intervalSchema,
    maxFiles: positiveInt,
    compress: z.boolean().default(false),
  }),
]);

const resilienceSchema = z.strictObject({
  maxAttempts: positiveInt.optional(),
  initialDelayMs: positiveInt.optional(),
  maxDelayMs: positiveInt.optional(),
  timeoutMs: positiveInt.optional(),
  circuitBreakerThreshold: positiveInt.optional(),
  halfOpenAfterMs: positiveInt.optional(),
});

const httpUrlSchema = z
  .url()
  .refine((value) => /^https?:\/\//i.test(value), { message: "debe ser una URL http(s)" });

const transportSchema: z.ZodType<TransportConfig> = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.strictObject({ type: z.literal("console"), level: levelSchema.optional() }),
    z.strictObject({
      type: z.literal("file"),
      level: levelSchema.optional(),
      path: z.string().min(1),
      rotation: rotationSchema.default({ strategy: "none" }),
    }),
    z.strictObject({
      type: z.literal("http"),
      level: levelSchema.optional(),
      url: httpUrlSchema,
      headers: z.record(z.string(), z.string()).optional(),
      resilience: resilienceSchema.optional(),
      fallback: transportSchema.optional(),
    }),
    z.strictObject({
      type: z.literal("custom"),
      name: z.string().min(1),
      level: levelSchema.optional(),
      options: z.record(z.string(), z.unknown()).optional(),
    }),
  ]),
);

const tenantSchema = z.discriminatedUnion("mode", [
  z.strictObject({ mode: z.literal("required") }),
  z.strictObject({
    mode: z.literal("fixed"),
    tenantId: z
      .string()
      .trim()
      .min(1)
      .transform((value) => TenantId(value)),
  }),
]);

/**
 * `strictObject` en todos los niveles: una clave mal escrita (`defaultLevl`) es
 * un error, no un valor ignorado en silencio.
 *
 * Los defaults hacen que `parseLoggerConfig({})` funcione sin configurar nada
 * (plug-and-play): nivel INFO, salida a consola, y tenant `fixed` = "default".
 * Ese tenant por defecto es un opt-in implícito por no configurar; un consumidor
 * multi-tenant tiene que pedir `{ mode: "required" }` explícitamente (ADR-020).
 */
export const loggerConfigSchema = z.strictObject({
  defaultLevel: levelSchema.default("INFO"),
  tenant: tenantSchema.default({ mode: "fixed", tenantId: TenantId("default") }),
  transports: z
    .array(transportSchema)
    .min(1)
    .default([{ type: "console" }]),
});

export function parseLoggerConfig(input: unknown = {}): LoggerConfig {
  const result = loggerConfigSchema.safeParse(input);
  if (!result.success) {
    throw new ConfigurationError(`LoggerConfig inválida — ${formatIssues(result.error.issues)}`);
  }
  return result.data;
}

// --- Pipeline (redacción/sampling/rate-limit) — ver PipelineConfig.ts: config
// separada de LoggerConfig a propósito (dónde sale el log vs. si llega a existir).

const redactionSchema = z
  .strictObject({
    enabled: z.boolean().default(false),
    paths: z.array(z.string().min(1)).default([]),
    censor: z.string().default("[REDACTED]"),
  })
  .refine((value) => !value.enabled || value.paths.length > 0, {
    message: "redaction.enabled=true requiere al menos un path en 'paths'",
    path: ["paths"],
  });

const samplingSchema = z
  .strictObject({
    enabled: z.boolean().default(false),
    sampledLevels: z.array(levelSchema).default([]),
    rate: z.number().min(0).max(1).default(1),
  })
  .refine((value) => value.sampledLevels.every((level) => !isCriticalLevel(level)), {
    // Mismo invariante que valida el constructor de SamplingPolicy — ver su
    // comentario: ERROR/FATAL nunca se samplean, se valida en dos lugares a
    // propósito (acá, en el borde externo; en el constructor, siempre).
    message: "sampledLevels no puede incluir ERROR ni FATAL (nunca se descartan por sampling)",
    path: ["sampledLevels"],
  });

const rateLimitSchema = z.strictObject({
  enabled: z.boolean().default(false),
  maxPerWindow: positiveInt.default(1000),
  windowMs: positiveInt.default(1000),
  maxTrackedKeys: positiveInt.default(1000),
});

export const pipelineConfigSchema = z.strictObject({
  redaction: redactionSchema.default({ enabled: false, paths: [], censor: "[REDACTED]" }),
  sampling: samplingSchema.default({ enabled: false, sampledLevels: [], rate: 1 }),
  rateLimit: rateLimitSchema.default({
    enabled: false,
    maxPerWindow: 1000,
    windowMs: 1000,
    maxTrackedKeys: 1000,
  }),
});

/**
 * Config pública combinada (lo que recibe `createLogger`): un solo objeto
 * plano, sin forzar al consumidor a agrupar `{ logger: {...}, pipeline: {...}
 * }` — eso es un detalle interno. Acá se separa en los dos tipos de dominio
 * reales (`LoggerConfig` + `PipelineConfig`).
 */
export const moduleConfigSchema = z.strictObject({
  defaultLevel: levelSchema.default("INFO"),
  tenant: tenantSchema.default({ mode: "fixed", tenantId: TenantId("default") }),
  transports: z
    .array(transportSchema)
    .min(1)
    .default([{ type: "console" }]),
  redaction: redactionSchema.default({ enabled: false, paths: [], censor: "[REDACTED]" }),
  sampling: samplingSchema.default({ enabled: false, sampledLevels: [], rate: 1 }),
  rateLimit: rateLimitSchema.default({
    enabled: false,
    maxPerWindow: 1000,
    windowMs: 1000,
    maxTrackedKeys: 1000,
  }),
});

export interface ParsedModuleConfig {
  readonly logger: LoggerConfig;
  readonly pipeline: PipelineConfig;
}

export function parseModuleConfig(input: unknown = {}): ParsedModuleConfig {
  const result = moduleConfigSchema.safeParse(input);
  if (!result.success) {
    throw new ConfigurationError(`Configuración inválida — ${formatIssues(result.error.issues)}`);
  }
  const { defaultLevel, tenant, transports, redaction, sampling, rateLimit } = result.data;
  return {
    logger: { defaultLevel, tenant, transports },
    pipeline: { redaction, sampling, rateLimit },
  };
}

function formatIssues(issues: readonly z.core.$ZodIssue[]): string {
  return issues
    .map((issue) => `${issue.path.map(String).join(".") || "(raíz)"}: ${issue.message}`)
    .join("; ");
}
