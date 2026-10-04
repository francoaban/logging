import { describe, expect, it } from "vitest";
import { RateLimitPolicy } from "../../src/domain/value-objects/RateLimitPolicy.js";
import { FixedWindowRateLimiter } from "../../src/infrastructure/ratelimit/FixedWindowRateLimiter.js";

function clock(startAt = 0) {
  let current = startAt;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

describe("RateLimitPolicy", () => {
  it("rechaza valores no positivos", () => {
    expect(() =>
      RateLimitPolicy({ enabled: true, maxPerWindow: 0, windowMs: 1000, maxTrackedKeys: 10 }),
    ).toThrow();
    expect(() =>
      RateLimitPolicy({ enabled: true, maxPerWindow: 5, windowMs: 0, maxTrackedKeys: 10 }),
    ).toThrow();
    expect(() =>
      RateLimitPolicy({ enabled: true, maxPerWindow: 5, windowMs: 1000, maxTrackedKeys: 0 }),
    ).toThrow();
  });
});

describe("FixedWindowRateLimiter", () => {
  it("permite hasta maxPerWindow y luego bloquea dentro de la misma ventana", () => {
    const policy = RateLimitPolicy({
      enabled: true,
      maxPerWindow: 3,
      windowMs: 1000,
      maxTrackedKeys: 100,
    });
    const c = clock();
    const limiter = new FixedWindowRateLimiter(policy, c.now);

    expect(limiter.tryAcquire("a")).toBe(true);
    expect(limiter.tryAcquire("a")).toBe(true);
    expect(limiter.tryAcquire("a")).toBe(true);
    expect(limiter.tryAcquire("a")).toBe(false); // 4to dentro de la ventana: bloqueado
  });

  it("resetea el contador al pasar la ventana", () => {
    const policy = RateLimitPolicy({
      enabled: true,
      maxPerWindow: 1,
      windowMs: 1000,
      maxTrackedKeys: 100,
    });
    const c = clock();
    const limiter = new FixedWindowRateLimiter(policy, c.now);

    expect(limiter.tryAcquire("a")).toBe(true);
    expect(limiter.tryAcquire("a")).toBe(false);
    c.advance(1000);
    expect(limiter.tryAcquire("a")).toBe(true); // nueva ventana
  });

  it("cada key tiene su propio contador independiente", () => {
    const policy = RateLimitPolicy({
      enabled: true,
      maxPerWindow: 1,
      windowMs: 1000,
      maxTrackedKeys: 100,
    });
    const limiter = new FixedWindowRateLimiter(policy, clock().now);

    expect(limiter.tryAcquire("tenant-a")).toBe(true);
    expect(limiter.tryAcquire("tenant-b")).toBe(true);
    expect(limiter.tryAcquire("tenant-a")).toBe(false);
    expect(limiter.tryAcquire("tenant-b")).toBe(false);
  });

  it("con enabled: false, siempre permite", () => {
    const policy = RateLimitPolicy({
      enabled: false,
      maxPerWindow: 1,
      windowMs: 1000,
      maxTrackedKeys: 100,
    });
    const limiter = new FixedWindowRateLimiter(policy, clock().now);

    expect(limiter.tryAcquire("a")).toBe(true);
    expect(limiter.tryAcquire("a")).toBe(true);
    expect(limiter.tryAcquire("a")).toBe(true);
  });

  it("no crece sin límite: respeta maxTrackedKeys evictando las keys más viejas", () => {
    const policy = RateLimitPolicy({
      enabled: true,
      maxPerWindow: 5,
      windowMs: 1000,
      maxTrackedKeys: 2,
    });
    const c = clock();
    const limiter = new FixedWindowRateLimiter(policy, c.now);

    limiter.tryAcquire("key-1");
    c.advance(1);
    limiter.tryAcquire("key-2");
    c.advance(1);
    limiter.tryAcquire("key-3"); // fuerza eviction: solo deben quedar 2 keys rastreadas

    // key-1 fue evictada (la más vieja) -> su contador arranca de cero de nuevo
    expect(limiter.tryAcquire("key-1")).toBe(true);
    expect(limiter.tryAcquire("key-1")).toBe(true);
  });
});

describe("FixedWindowRateLimiter — recencia bajo presión de maxTrackedKeys", () => {
  it("una key activa no se evicta antes que una key inactiva", () => {
    const policy = RateLimitPolicy({
      enabled: true,
      maxPerWindow: 2,
      windowMs: 1000,
      maxTrackedKeys: 2,
    });
    const c = clock();
    const limiter = new FixedWindowRateLimiter(policy, c.now);

    limiter.tryAcquire("activa"); // t=0
    limiter.tryAcquire("inactiva"); // t=0
    c.advance(1000);
    limiter.tryAcquire("activa"); // nueva ventana: se refresca su recencia
    limiter.tryAcquire("activa"); // count = 2 (el máximo)
    limiter.tryAcquire("nueva"); // supera maxTrackedKeys: debe evictar a "inactiva", no a "activa"

    // Si "activa" hubiera sido evictada, tendría un bucket nuevo y esto daría true.
    expect(limiter.tryAcquire("activa")).toBe(false);
  });
});
