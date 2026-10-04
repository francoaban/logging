import { randomBytes } from "node:crypto";

/** Alfabeto Crockford Base32 (excluye I, L, O, U para evitar confusión visual). */
const CROCKFORD_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const TIMESTAMP_CHARS = 10;
const RANDOM_CHARS = 16;
const RANDOM_BYTES = 10; // 80 bits -> 16 caracteres de 5 bits

function encodeTimestamp(timestampMs: number): string {
  let remaining = timestampMs;
  let output = "";
  for (let i = 0; i < TIMESTAMP_CHARS; i++) {
    const index = remaining % 32;
    output = CROCKFORD_ALPHABET.charAt(index) + output;
    remaining = Math.floor(remaining / 32);
  }
  return output;
}

function encodeRandomness(): string {
  const bytes = randomBytes(RANDOM_BYTES);
  let bits = "";
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }
  let output = "";
  for (let i = 0; i < RANDOM_CHARS; i++) {
    const chunk = bits.slice(i * 5, i * 5 + 5).padEnd(5, "0");
    output += CROCKFORD_ALPHABET.charAt(parseInt(chunk, 2));
  }
  return output;
}

/**
 * Genera un ULID (26 caracteres): 48 bits de timestamp + 80 bits de
 * aleatoriedad criptográfica (`node:crypto`), ordenable lexicográficamente
 * por tiempo de creación.
 *
 * Implementación mínima sin dependencias externas, suficiente para Fase 1.
 * Si el volumen de la Fase 9 lo justifica, se puede reemplazar por una
 * librería dedicada sin tocar el puerto `EventIdGenerator` ni ningún
 * consumidor — ese es justamente el punto de tenerlo detrás de un puerto.
 */
export function generateUlid(now: Date = new Date()): string {
  return encodeTimestamp(now.getTime()) + encodeRandomness();
}
