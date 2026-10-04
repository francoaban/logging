import { type Message, type MessageStatus } from "../../domain/entities/Message.js";
import { type RetentionPolicy, type TenantId } from "../../domain/value-objects/index.js";

export interface MessageQuery {
  readonly tenant_id: TenantId;
  readonly statuses?: readonly MessageStatus[];
  readonly from?: string;
  readonly to?: string;
  readonly limit?: number;
  readonly cursor?: string;
}

export interface MessageRepository {
  save(message: Message): Promise<void>;
  find(query: MessageQuery): Promise<readonly Message[]>;
  purge(policy: RetentionPolicy): Promise<number>;
}
