import { describe, expect, it } from "vitest";
import {
  parseLoggerConfig,
  parseModuleConfig,
} from "../../src/infrastructure/config/loggerConfigSchema.js";
import {
  CURRENT_SCHEMA_VERSION,
  SchemaVersion,
} from "../../src/domain/value-objects/SchemaVersion.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { type LoggerConfig } from "../../src/domain/value-objects/LoggerConfig.js";

describe("LoggerConfig (vía parseLoggerConfig)", () => {
  it("usa consola a nivel INFO como default mínimo", () => {
    const config = parseLoggerConfig({});
    expect(config.defaultLevel).toBe("INFO");
    expect(config.transports).toEqual([{ type: "console" }]);
    expect(config.tenant).toEqual({ mode: "fixed", tenantId: TenantId("default") });
  });

  it("acepta una config completa con transporthttp, fallback y rotación", () => {
    const config: LoggerConfig = parseLoggerConfig({
      defaultLevel: "DEBUG",
      tenant: { mode: "required" },
      transports: [
        {
          type: "http",
          url: "https://ingest.example.com/logs",
          resilience: { maxAttempts: 2 },
          fallback: { type: "console" },
        },
        {
          type: "file",
          path: "logs/app.log",
          rotation: { strategy: "size", maxSizeBytes: 1048576, maxFiles: 5 },
        },
      ],
    });
    expect(config.defaultLevel).toBe("DEBUG");
    expect(config.tenant.mode).toBe("required");
    expect(config.transports).toHaveLength(2);
  });

  it("rechaza claves desconocidas (strictObject)", () => {
    expect(() => parseLoggerConfig({ nivel: "INFO" })).toThrow();
  });

  it("parseModuleConfig combina logger y pipeline también por default", () => {
    const parsed = parseModuleConfig({});
    expect(parsed.logger.defaultLevel).toBe("INFO");
    expect(parsed.pipeline).toBeDefined();
  });

  it("SchemaVersion vigente es consistente con los defaults del schema", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
    expect(() => SchemaVersion(0)).toThrow();
    expect(EventId("01ARZ3NDEKTSV4RRFFQ69G5FAV")).toHaveLength(26);
  });
});
