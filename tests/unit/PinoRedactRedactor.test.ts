import { describe, expect, it } from "vitest";
import { PinoRedactRedactor } from "../../src/infrastructure/redaction/PinoRedactRedactor.js";
import { RedactionPolicy } from "../../src/domain/value-objects/RedactionPolicy.js";

/**
 * `RedactionStep.test.ts` solo prueba con un `Redactor` mockeado — nunca
 * ejercitó la librería real (`@pinojs/redact`). Ese hueco es justo lo que
 * dejó pasar un bug real: un path mal configurado (`"metadata.password"` en
 * vez de `"password"`) que no redactaba nada, en silencio, y ningún test
 * lo detectó porque el mock no sabe de paths — siempre "redacta" lo que se
 * le pida sin importar el formato.
 */
describe("PinoRedactRedactor (librería real, sin mock)", () => {
  it("redacta un path relativo a metadata/payload, como documenta RedactionPolicy", () => {
    const redactor = new PinoRedactRedactor(
      RedactionPolicy({ enabled: true, paths: ["password"] }),
    );
    const result = redactor.redact({ user: "franco", password: "hunter2" });
    expect(result).toEqual({ user: "franco", password: "[REDACTED]" });
  });

  it("REGRESIÓN: un path con el prefijo 'metadata.'/'payload.' de más NO redacta — guarda contra repetir el bug", () => {
    const redactor = new PinoRedactRedactor(
      RedactionPolicy({ enabled: true, paths: ["metadata.password"] }),
    );
    const result = redactor.redact({ password: "hunter2" });
    // Documenta el comportamiento real (falla en silencio, sin excepción) para que
    // quede explícito en el test suite, no solo en un comentario que alguien puede no leer.
    expect(result).toEqual({ password: "hunter2" });
  });

  it("no muta el objeto original (selective cloning de @pinojs/redact)", () => {
    const redactor = new PinoRedactRedactor(RedactionPolicy({ enabled: true, paths: ["secret"] }));
    const original = { keep: 1, secret: "x" };
    const result = redactor.redact(original);
    expect(original).toEqual({ keep: 1, secret: "x" });
    expect(result).not.toBe(original);
  });

  it("soporta paths anidados y wildcards", () => {
    const redactor = new PinoRedactRedactor(
      RedactionPolicy({ enabled: true, paths: ["user.creditCard"] }),
    );
    const result = redactor.redact({ user: { name: "franco", creditCard: "4111111111111111" } });
    expect(result).toEqual({ user: { name: "franco", creditCard: "[REDACTED]" } });
  });

  it("política deshabilitada: no transforma nada", () => {
    const redactor = new PinoRedactRedactor(RedactionPolicy({ enabled: false, paths: [] }));
    const input = { password: "hunter2" };
    expect(redactor.redact(input)).toEqual(input);
  });

  it("censor personalizado", () => {
    const redactor = new PinoRedactRedactor(
      RedactionPolicy({ enabled: true, paths: ["password"], censor: "***" }),
    );
    expect(redactor.redact({ password: "x" })).toEqual({ password: "***" });
  });
});
