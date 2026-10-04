import { type Event } from "../../domain/entities/Event.js";
import { type RetentionPolicy, type TenantId } from "../../domain/value-objects/index.js";

export interface EventQuery {
  readonly tenant_id: TenantId;
  readonly types?: readonly string[];
  readonly from?: string;
  readonly to?: string;
  readonly correlation_id?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface EventRepository {
  save(event: Event): Promise<void>;
  find(query: EventQuery): Promise<readonly Event[]>;
  purge(policy: RetentionPolicy): Promise<number>;
}
