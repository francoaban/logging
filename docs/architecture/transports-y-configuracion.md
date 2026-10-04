# Transports y configuración — comportamiento y límites

> Detalle de comportamiento de los contratos listados en
> `docs/api/contratos-interfaces.md` (sección "Transports y configuración").
> Las decisiones y su porqué están en a ; acá se documenta
> el comportamiento resultante para quien integra o extiende el módulo.

## `WriteResult.durable` — qué garantiza y qué no

`durable: true` significa **"el destino aceptó el registro sin error"** (el
callback de `write` del stream, o un 2xx de `HttpTransport`). No significa
fsync a disco ni confirmación de almacenamiento persistente:

- `ConsoleTransport`: `durable: true` = el stream de `stdout` no devolvió
  error. Si eso se conserva depende de quien capture la salida (Docker,
  systemd, un pipe).
- `FileTransport`: `durable: true` = el buffer del SO aceptó la escritura.
  **No hay fsync** — queda como spike explícito, no como
  garantía. Ver "Límites de `FileTransport`" abajo.
- `HttpTransport`: `durable: true` = 2xx, después de retry + circuit breaker, o el `fallback` configurado confirmó.

`WriteResult.error` puede estar presente aunque `durable` sea `true`: significa
que el transport principal falló pero un `fallback` compensó. `durable` es el
resultado final; `error` es diagnóstico para métricas .

## `CompositeLogTransport` — la única regla de último recurso

Un registro pasa solo por los transports cuyo `minLevel` cumple
(`meetsThreshold`). Si **ninguno** de los aplicables confirma `durable: true`:

- Nivel `ERROR`/`FATAL` (`isCriticalLevel`) → se escribe a `stderr` como
  último recurso.
- Cualquier otro nivel → se pierde. Documentado, no accidental: el logging
  nunca debe tumbar la aplicación host reintentando indefinidamente.

Si ningún transport es aplicable (todos filtrados por nivel), no es una
falla: `write` resuelve `durable: true`.

## Límites de `FileTransport`

- **Sin fsync**: ver arriba. Si el caso de uso necesita esa garantía dura
  (cumplimiento regulatorio, por ejemplo), usar `HttpTransport` contra un
  store que sí la dé, o esperar al spike de anotado en `ROADMAP.md`.
- **Atomicidad de línea bajo escritura concurrente**: depende de `O_APPEND` y
  de que la línea sea menor a `PIPE_BUF` (típicamente 4096 bytes en Linux).
  No aplica en filesystems de red (NFS).
- **Sin reapertura automática**: si el stream se destruye por un error,
  las escrituras siguientes devuelven `durable: false` — no hay reintento de
  reapertura del archivo.
- **Rotación** delegada en `rotating-file-stream`: anti-colisión
  de nombres, `maxFiles` (retención FIFO), compresión opcional. La traducción
  de `RotationPolicy` (dominio) a las opciones de la librería vive en
  `FileTransport.toRotatingOptions` — el contrato de dominio no cambia si el
  día de mañana se reemplaza la librería.

## `HttpTransport` — resiliencia y límites

Retry + circuit breaker vía `cockatiel`, con defaults si se omite
`resilience`:

| Parámetro                 | Default               |
| ------------------------- | --------------------- |
| `maxAttempts`             | 3                     |
| `initialDelayMs`          | 200                   |
| `maxDelayMs`              | 2000                  |
| `timeoutMs`               | 5000                  |
| `circuitBreakerThreshold` | 5 fallos consecutivos |
| `halfOpenAfterMs`         | 10000                 |

Solo se reintentan errores transitorios: red/DNS/timeout, y HTTP 5xx/408/429.
Un 4xx de autenticación o payload (401, 403, 400, 422) **no** se reintenta —
reintentar un request mal formado no lo arregla, solo demora el fallo.

**Límite conocido, no resuelto acá:** 1 request HTTP por registro. Sirve para
volumen bajo/medio o para umbrales altos (`level: "ERROR"` en ese transport);
batching de líneas queda para, junto con el buffer acotado y el
backpressure del broker.

## `DefaultTransportFactory` — extensibilidad (Strategy + Factory)

Los tipos built-in (`console`, `file`, `http`) salen de un `switch`
exhaustivo (el compilador exige cubrir los cuatro casos de `TransportConfig`).
Un transport de terceros se agrega sin tocar el core:

```ts
factory.registerCustom("datadog", (options) => new DatadogTransport(options));
```

y en la config: `{ type: "custom", name: "datadog", options: { apiKey: "..." } }`.
Un `type: "custom"` con un `name` no registrado lanza `ConfigurationError` —
fail-fast al construir, no un fallo silencioso en el primer `write`.

`fallback` en un transport `http` es **config anidada** (`TransportConfig`),
no una instancia — tiene que poder venir de JSON/env y validarse con Zod. La
Factory la resuelve recursivamente a una instancia real.

## `LoggerConfig` — defaults plug-and-play

`parseLoggerConfig` sin argumentos produce una config funcional sin que el
consumidor configure nada: `defaultLevel: "INFO"`, `transports: [{ type:
"console" }]`, `tenant: { mode: "fixed", tenantId: "default" }`. Ver
para la semántica de `tenant`. El schema es `strictObject` en todos
los niveles: una clave mal escrita es un `ConfigurationError`, no un valor
ignorado en silencio.

## Formateo (`JsonFormatter`)

Nunca lanza. Dos niveles de resiliencia:

1. Una referencia circular en `metadata` se sustituye **en el lugar**
   (`"[Circular]"`) — el resto del registro, incluido `message`, se conserva.
2. Si el registro es genuinamente imposible de serializar (por ejemplo, un
   getter en `metadata` que lanza al leerlo), recién ahí se degrada a un
   fallback mínimo: identidad del registro (`event_id`, `tenant_id`,
   `timestamp`) + `formatter_error`, sin `message` ni el resto de los campos.

`BigInt` se serializa como string; una instancia de `Error` en `metadata` se
serializa como `{ name, message, stack }`.
