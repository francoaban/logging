import { type RateLimiter } from "../../application/ports/RateLimiter.js";
import { type RateLimitPolicy } from "../../domain/value-objects/RateLimitPolicy.js";

interface Bucket {
  windowStart: number;
  count: number;
}

/**
 * Implementación de referencia de `RateLimiter`: contador por ventana fija
 * (no token bucket con refill continuo — más simple de razonar y de testear
 * determinísticamente, y suficiente para el caso de uso). En memoria, por
 * proceso: el rate limiting de un logger no necesita coordinarse entre
 * instancias, cada proceso puede limitar de forma independiente sin romper
 * ninguna garantía (a diferencia de, por ejemplo, un `IdempotencyStore` de
 * Fase 3, que sí necesita estado compartido).
 *
 * Eviction en dos pasos (sin `setInterval`
 * propio, a propósito: un timer de fondo complica el graceful shutdown que
 * ya es un requisito de Fase 3, y esto no lo necesita):
 *   1. Como máximo una vez por ventana, se borran los buckets más viejos que 2x la ventana
 *      (ya no están activos). Barrerlos en cada llamada era O(n) por llamada.
 *   2. Si igual se supera `maxTrackedKeys`, se borra el más antiguo por
 *      orden de inserción (aproximación a LRU, sin estructura de datos extra).
 */
export class FixedWindowRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private lastSweepAt = Number.NEGATIVE_INFINITY;

  constructor(
    private readonly policy: RateLimitPolicy,
    private readonly now: () => number = Date.now,
  ) {}

  tryAcquire(key: string): boolean {
    if (!this.policy.enabled) return true;

    this.evict();

    const current = this.now();
    const bucket = this.buckets.get(key);

    if (!bucket || current - bucket.windowStart >= this.policy.windowMs) {
      // delete + set (no solo set): Map.set sobre una key existente NO la mueve al final,
      // y una key usada todo el tiempo se evictaría primero por ser la más antigua.
      this.buckets.delete(key);
      this.buckets.set(key, { windowStart: current, count: 1 });
      return true;
    }

    if (bucket.count < this.policy.maxPerWindow) {
      bucket.count += 1;
      return true;
    }

    return false;
  }

  private evict(): void {
    const current = this.now();

    if (current - this.lastSweepAt >= this.policy.windowMs) {
      const staleBefore = current - this.policy.windowMs * 2;
      for (const [key, bucket] of this.buckets) {
        if (bucket.windowStart < staleBefore) {
          this.buckets.delete(key);
        }
      }
      this.lastSweepAt = current;
    }

    while (this.buckets.size > this.policy.maxTrackedKeys) {
      const oldestKey = this.buckets.keys().next().value;
      if (oldestKey === undefined) break;
      this.buckets.delete(oldestKey);
    }
  }
}
