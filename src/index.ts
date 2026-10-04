/**
 * Punto de entrada público del paquete.
 *
 * `createLogger(config?, overrides?)` es el punto de entrada plug-and-play:
 * sin argumentos arma un logger a consola, nivel INFO, tenant fijo "default".
 * También se exponen todos los contratos (dominio + puertos), errores, el
 * pipeline y los adapters de referencia, para quien necesite ensamblar su
 * propia composición en vez de usar `createLogger`.
 */
export * from "./domain/index.js";
export * from "./application/ports/index.js";
export * from "./application/services/index.js";
export * from "./application/use-cases/index.js";
export * from "./shared/errors/index.js";
export * from "./pipeline/index.js";
export * from "./infrastructure/index.js";
export * from "./createLogger.js";
