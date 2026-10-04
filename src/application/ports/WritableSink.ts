/**
 * Subconjunto mínimo de `NodeJS.WritableStream` que los transports basados en
 * streams realmente usan. Depender de la interfaz completa (`writable`, `end`,
 * los overloads de `write`) obliga a los tests a implementar miembros que
 * nunca se llaman, solo para satisfacer al compilador (ISP). `process.stdout`
 * y `process.stderr` siguen siendo asignables sin cambios: son un superset.
 */
export interface WritableSink {
  write(chunk: string, callback?: (error?: Error | null) => void): boolean;
  on(event: "error", listener: (error: Error) => void): this;
}
