import { type LogTransport } from "../../application/ports/LogTransport.js";
import { type TransportFactory } from "../../application/ports/TransportFactory.js";
import {
  type LoggerConfig,
  type TransportConfig,
} from "../../domain/value-objects/LoggerConfig.js";
import { ConfigurationError } from "../../shared/errors/ConfigurationError.js";
import { CompositeLogTransport } from "./CompositeLogTransport.js";
import { ConsoleTransport } from "./ConsoleTransport.js";
import { FileTransport } from "./FileTransport.js";
import { HttpTransport } from "./HttpTransport.js";
import { type WritableSink } from "../../application/ports/WritableSink.js";

export type CustomTransportBuilder = (options: Readonly<Record<string, unknown>>) => LogTransport;

export interface DefaultTransportFactoryOptions {
  readonly stdout?: WritableSink | undefined;
  readonly stderr?: WritableSink | undefined;
  readonly fetchImpl?: typeof fetch | undefined;
}

/**
 * Factory de transports. Los tipos built-in salen de un `switch` exhaustivo; la
 * extensión (Strategy + Factory) es `registerCustom(name, builder)` +
 * `{ type: "custom", name }` en la config — sin tocar el core.
 */
export class DefaultTransportFactory implements TransportFactory {
  private readonly customBuilders = new Map<string, CustomTransportBuilder>();

  constructor(private readonly options: DefaultTransportFactoryOptions = {}) {}

  registerCustom(name: string, builder: CustomTransportBuilder): this {
    this.customBuilders.set(name, builder);
    return this;
  }

  create(config: TransportConfig): LogTransport {
    switch (config.type) {
      case "console":
        return new ConsoleTransport({ stream: this.options.stdout });
      case "file":
        return new FileTransport({ path: config.path, rotation: config.rotation });
      case "http":
        return new HttpTransport({
          url: config.url,
          headers: config.headers,
          resilience: config.resilience,
          fallback: config.fallback === undefined ? undefined : this.create(config.fallback),
          fetchImpl: this.options.fetchImpl,
        });
      case "custom": {
        const builder = this.customBuilders.get(config.name);
        if (builder === undefined) {
          throw new ConfigurationError(
            `Transport custom "${config.name}" no registrado: llamá a registerCustom("${config.name}", builder) antes de crearlo.`,
          );
        }
        return builder(config.options ?? {});
      }
      default: {
        const unreachable: never = config;
        throw new ConfigurationError(
          `Tipo de transport desconocido: ${JSON.stringify(unreachable)}`,
        );
      }
    }
  }

  createAll(config: LoggerConfig): LogTransport {
    const entries = config.transports.map((transportConfig) => ({
      transport: this.create(transportConfig),
      minLevel: transportConfig.level ?? config.defaultLevel,
    }));
    return new CompositeLogTransport(entries, { stderr: this.options.stderr });
  }
}
