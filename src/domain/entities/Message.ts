import {
  type EventId,
  type TenantId,
  type SchemaVersion,
  type TraceContext,
  type IdempotencyKey,
} from "../value-objects/index.js";

export const MESSAGE_STATUSES = ["created", "sent", "failed", "retried", "confirmed"] as const;

export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

export interface Message {
  readonly event_id: EventId;
  readonly schema_version: SchemaVersion;
  readonly tenant_id: TenantId;
  readonly status: MessageStatus;
  readonly idempotency_key: IdempotencyKey;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
  readonly context: TraceContext;
}
