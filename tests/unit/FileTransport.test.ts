import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { FileTransport } from "../../src/infrastructure/transports/FileTransport.js";
import { EventId } from "../../src/domain/value-objects/EventId.js";
import { TenantId } from "../../src/domain/value-objects/TenantId.js";
import { CURRENT_SCHEMA_VERSION } from "../../src/domain/value-objects/SchemaVersion.js";
import { type Log } from "../../src/domain/entities/Log.js";

const record: Log = {
  event_id: EventId("01ARZ3NDEKTSV4RRFFQ69G5FAV"),
  schema_version: CURRENT_SCHEMA_VERSION,
  tenant_id: TenantId("acme"),
  level: "INFO",
  message: "hola",
  timestamp: "2026-01-01T00:00:00.000Z",
  context: { correlation_id: "corr-1" },
};

let dir: string;

afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe("FileTransport — sin rotación", () => {
  it("escribe cada línea con salto de línea final y confirma durable: true", async () => {
    dir = mkdtempSync(join(tmpdir(), "file-transport-"));
    const path = join(dir, "app.log");
    const transport = new FileTransport({ path });

    expect(await transport.write("uno", record)).toEqual({ durable: true });
    expect(await transport.write("dos", record)).toEqual({ durable: true });
    await transport.close();

    expect(readFileSync(path, "utf-8")).toBe("uno\ndos\n");
  });

  it("crea el directorio destino si no existe", async () => {
    dir = mkdtempSync(join(tmpdir(), "file-transport-"));
    const path = join(dir, "nested", "sub", "app.log");
    const transport = new FileTransport({ path });
    await transport.write("línea", record);
    await transport.close();
    expect(readFileSync(path, "utf-8")).toBe("línea\n");
  });

  it("después de close(), escribir devuelve durable: false en vez de lanzar", async () => {
    dir = mkdtempSync(join(tmpdir(), "file-transport-"));
    const transport = new FileTransport({ path: join(dir, "app.log") });
    await transport.close();
    const result = await transport.write("tarde", record);
    expect(result.durable).toBe(false);
  });
});

describe("FileTransport — con rotación por tamaño", () => {
  it("rota a un segundo archivo al superar maxSizeBytes", async () => {
    dir = mkdtempSync(join(tmpdir(), "file-transport-"));
    const path = join(dir, "app.log");
    const transport = new FileTransport({
      path,
      rotation: { strategy: "size", maxSizeBytes: 10, maxFiles: 5, compress: false },
    });

    for (let i = 0; i < 10; i++) {
      const result = await transport.write(`línea-${i}-relleno-para-superar-el-límite`, record);
      expect(result.durable).toBe(true);
    }
    await transport.close();

    const files = readdirSync(dir);
    expect(files.length).toBeGreaterThan(1);
    expect(files).toContain("app.log");
  });
});
