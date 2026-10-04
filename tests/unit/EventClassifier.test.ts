import { describe, expect, it } from "vitest";
import { DefaultEventClassifier } from "../../src/domain/services/EventClassifier.js";

describe("DefaultEventClassifier", () => {
  const classifier = new DefaultEventClassifier();

  it("usa el primer segmento de 'type' separado por '.' como categoría", () => {
    expect(classifier.classify({ type: "user.created", payload: {} })).toEqual({
      category: "user",
      severity: "INFO",
      tags: [],
    });
  });

  it("sin '.', usa el type completo como categoría", () => {
    expect(classifier.classify({ type: "ping", payload: {} }).category).toBe("ping");
  });

  it("si el primer segmento queda vacío (type empieza con '.' o es ''), usa 'general'", () => {
    expect(classifier.classify({ type: "", payload: {} }).category).toBe("general");
    expect(classifier.classify({ type: ".sinCategoria", payload: {} }).category).toBe("general");
  });
});
