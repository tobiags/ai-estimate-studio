import { describe, expect, it } from "vitest";
import { healthSchema } from "@ai-estimate-studio/contracts";
import { MemoryIdempotencyStore, replayIdempotent } from "./idempotency";
import { parsePagination, page } from "./pagination";
import { problemResponse, PROBLEM_MEDIA_TYPE } from "./problems";
import { readJson } from "./route";

describe("HTTP foundation", () => {
  it("returns RFC 7807 content type and correlation header", async () => {
    const response = problemResponse({ title: "Nope", status: 403 });
    expect(response.headers.get("content-type")).toBe(PROBLEM_MEDIA_TYPE);
    expect(response.headers.get("x-correlation-id")).toBeTruthy();
  });

  it("rejects unsupported media types and oversized JSON", async () => {
    const unsupported = await readJson(
      new Request("https://example.test", { method: "POST", body: "{}" }),
      healthSchema,
    );
    expect(unsupported).toBeInstanceOf(Response);
    expect((unsupported as Response).status).toBe(415);

    const oversized = await readJson(
      new Request("https://example.test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "ok", release: "a".repeat(32) }),
      }),
      healthSchema,
      10,
    );
    expect((oversized as Response).status).toBe(413);
  });

  it("parses bounded pagination and produces a stable page envelope", () => {
    const parsed = parsePagination(
      new Request("https://example.test/items?limit=2&cursor=abc"),
    );
    expect(parsed).toEqual({ limit: 2, cursor: "abc" });
    expect(page(["a"], "next")).toEqual({
      data: ["a"],
      page: { nextCursor: "next", hasMore: true },
    });
  });

  it("replays the same idempotent request and rejects a changed body", async () => {
    const store = new MemoryIdempotencyStore();
    const makeRequest = (body: string) =>
      new Request("https://example.test/quotes", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": "0123456789abcdef",
        },
        body,
      });

    let calls = 0;
    const handler = () => {
      calls += 1;
      return Promise.resolve(Response.json({ calls }, { status: 201 }));
    };
    const first = await replayIdempotent(
      makeRequest('{"a":1}'),
      store,
      "tenant-1",
      handler,
    );
    const replay = await replayIdempotent(
      makeRequest('{"a":1}'),
      store,
      "tenant-1",
      handler,
    );
    const conflict = await replayIdempotent(
      makeRequest('{"a":2}'),
      store,
      "tenant-1",
      handler,
    );
    expect(first.status).toBe(201);
    expect(replay.status).toBe(201);
    expect(conflict.status).toBe(409);
    expect(calls).toBe(1);
  });
});
