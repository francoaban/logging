export type RotationInterval = "hourly" | "daily";

/**
 * Unión discriminada: cada estrategia exige exactamente los campos que
 * necesita, así que una combinación inválida (`strategy: "size"` sin
 * `maxSizeBytes`) es un error de *compilación*. El schema de Zod
 * (`infrastructure/config`) cubre el mismo caso cuando la config llega de
 * afuera (JSON/env).
 *
 * `size-or-time` rota apenas se cumpla CUALQUIERA de las dos condiciones
 * (evaluación independiente, sin prioridad). `maxFiles` retiene los N archivos
 * rotados más recientes (FIFO: al superarse, se borra el más viejo).
 */
export type RotationPolicy =
  | { readonly strategy: "none" }
  | {
      readonly strategy: "size";
      readonly maxSizeBytes: number;
      readonly maxFiles: number;
      readonly compress: boolean;
    }
  | {
      readonly strategy: "time";
      readonly interval: RotationInterval;
      readonly maxFiles: number;
      readonly compress: boolean;
    }
  | {
      readonly strategy: "size-or-time";
      readonly maxSizeBytes: number;
      readonly interval: RotationInterval;
      readonly maxFiles: number;
      readonly compress: boolean;
    };
