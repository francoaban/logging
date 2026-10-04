import { describe, expect, it } from "vitest";
import { parseLoggerConfig } from "../../src/infrastructure/config/loggerConfigSchema.js";
import { ConfigurationError } from "../../src/shared/errors/ConfigurationError.js";

describe("parseLoggerConfig", () => {
  it("sin argumentos, produce una config plug-and-play: INFO + consola + tenant fijo 'default'", () => {
    const config = parseLoggerConfig();
    expect(config.defaultLevel).toBe("INFO");
    expect(config.transports).toEqual([{ type: "console" }]);
    expect(config.tenant).toEqual({ mode: "fixed", tenantId: "default" });
  });

  it("acepta tenant 'required' explícito (multi-tenant real)", () => {
    const config = parseLoggerConfig({ tenant: { mode: "required" } });
    expect(config.tenant).toEqual({ mode: "required" });
  });

  it("rellena `compress: false` por default en una política de rotación", () => {
    const config = parseLoggerConfig({
      transports: [
        {
          type: "file",
          path: "/var/log/app.log",
          rotation: { strategy: "size", maxSizeBytes: 1024, maxFiles: 5 },
        },
      ],
    });
    const [transport] = config.transports;
    expect(transport).toMatchObject({
      type: "file",
      rotation: { strategy: "size", compress: false },
    });
  });

  it("resuelve un `fallback` anidado en un transport http", () => {
    const config = parseLoggerConfig({
      transports: [
        {
          type: "http",
          url: "https://logs.example.com/ingest",
          fallback: { type: "console" },
        },
      ],
    });
    expect(config.transports[0]).toMatchObject({
      type: "http",
      fallback: { type: "console" },
    });
  });

  it("una clave desconocida es un error (strictObject), no un valor ignorado en silencio", () => {
    expect(() => parseLoggerConfig({ defaultLevl: "INFO" })).toThrow(ConfigurationError);
  });

  it("una URL sin esquema http(s) es rechazada", () => {
    expect(() =>
      parseLoggerConfig({ transports: [{ type: "http", url: "ftp://example.com" }] }),
    ).toThrow(ConfigurationError);
  });

  it("`strategy: 'size'` sin `maxSizeBytes` es rechazado (la unión discriminada exige los campos de esa variante)", () => {
    expect(() =>
      parseLoggerConfig({
        transports: [
          { type: "file", path: "/var/log/app.log", rotation: { strategy: "size", maxFiles: 5 } },
        ],
      }),
    ).toThrow(ConfigurationError);
  });

  it("el mensaje de ConfigurationError incluye el path del campo inválido", () => {
    try {
      parseLoggerConfig({ defaultLevel: "VERBOSE" });
      expect.unreachable("debía lanzar");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as Error).message).toContain("defaultLevel");
    }
  });

  it("un array de transports vacío es rechazado (tiene que haber al menos uno)", () => {
    expect(() => parseLoggerConfig({ transports: [] })).toThrow(ConfigurationError);
  });
});
