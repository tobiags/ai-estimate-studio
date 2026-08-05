import { createHash } from "node:crypto";
import { idempotencyKeySchema } from "@ai-estimate-studio/contracts";
import { problemResponse } from "./problems";

export type IdempotencyRecord = {
  requestHash: string;
  response: Response;
  expiresAt: number;
};

export interface IdempotencyStore {
  get(scope: string, key: string): Promise<IdempotencyRecord | undefined>;
  set(scope: string, key: string, record: IdempotencyRecord): Promise<void>;
}

export class MemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  async get(
    scope: string,
    key: string,
  ): Promise<IdempotencyRecord | undefined> {
    const record = this.records.get(`${scope}:${key}`);
    if (!record || record.expiresAt <= Date.now()) {
      this.records.delete(`${scope}:${key}`);
      return undefined;
    }
    return record;
  }

  async set(
    scope: string,
    key: string,
    record: IdempotencyRecord,
  ): Promise<void> {
    this.records.set(`${scope}:${key}`, record);
  }
}

export function requestHash(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

export async function replayIdempotent(
  request: Request,
  store: IdempotencyStore,
  scope: string,
  handler: () => Promise<Response>,
  ttlMs = 24 * 60 * 60 * 1000,
): Promise<Response> {
  const key = request.headers.get("Idempotency-Key");
  const parsedKey = idempotencyKeySchema.safeParse(key);
  if (!parsedKey.success) {
    return problemResponse({
      title: "Idempotency key required",
      status: 400,
      type: "https://ai-estimate-studio.dev/problems/idempotency-key",
    });
  }

  const body = await request.clone().text();
  const hash = requestHash(body);
  const existing = await store.get(scope, parsedKey.data);
  if (existing && existing.requestHash !== hash) {
    return problemResponse({
      title: "Idempotency key conflict",
      status: 409,
      type: "https://ai-estimate-studio.dev/problems/idempotency-conflict",
    });
  }
  if (existing) return existing.response.clone();

  const response = await handler();
  if (response.status >= 200 && response.status < 300) {
    await store.set(scope, parsedKey.data, {
      requestHash: hash,
      response: response.clone(),
      expiresAt: Date.now() + ttlMs,
    });
  }
  return response;
}
