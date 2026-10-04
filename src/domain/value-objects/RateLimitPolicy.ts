/**
 * Política de rate limiting (problema distinto de sampling — ver
 * `SamplingPolicy`). Con estado: cuenta cuántos registros pasaron por una
 * `key` dentro de una ventana de tiempo.
 *
 * `maxTrackedKeys` existe porque `RateLimiter` es genérico sobre `key` (se
 * puede usar por nivel, por tenant, por emisor — ver SEC-16 en
 * `docs/architecture/seguridad-autorizacion.md`). Si `key` fuera, por
 * ejemplo, un `tenant_id` con miles de tenants activos, un `Map` sin cota
 * de tamaño es una fuga de memoria lenta. Este campo la cierra desde el
 * diseño, no como un parche después de un incidente.
 */
export interface RateLimitPolicy {
  readonly enabled: boolean;
  readonly maxPerWindow: number;
  readonly windowMs: number;
  readonly maxTrackedKeys: number;
}

export function RateLimitPolicy(input: {
  readonly enabled: boolean;
  readonly maxPerWindow: number;
  readonly windowMs: number;
  readonly maxTrackedKeys: number;
}): RateLimitPolicy {
  if (input.maxPerWindow <= 0) {
    throw new Error(`RateLimitPolicy.maxPerWindow debe ser > 0, se recibió ${input.maxPerWindow}`);
  }
  if (input.windowMs <= 0) {
    throw new Error(`RateLimitPolicy.windowMs debe ser > 0, se recibió ${input.windowMs}`);
  }
  if (input.maxTrackedKeys <= 0) {
    throw new Error(
      `RateLimitPolicy.maxTrackedKeys debe ser > 0, se recibió ${input.maxTrackedKeys}`,
    );
  }
  return { ...input };
}
