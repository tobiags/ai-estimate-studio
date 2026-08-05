import { describe, expect, it } from "vitest";
import {
  SessionDeniedError,
  SessionService,
  type AuthSession,
  type SessionStore,
} from "./session.js";

describe("session lifecycle", () => {
  const session: AuthSession = {
    sessionId: "session",
    userId: "user",
    organizationId: "organization",
    expiresAt: "2030-01-01T00:00:00.000Z",
  };

  it("rejects missing and expired sessions, and rotates valid tokens", async () => {
    let rotated = "";
    const store: SessionStore = {
      read: async (token) => (token === "valid" ? session : null),
      rotate: async (_token, nextToken) => {
        rotated = nextToken;
        return { session, token: nextToken };
      },
      revoke: async () => undefined,
    };
    const service = new SessionService(
      store,
      { now: () => "2029-01-01T00:00:00.000Z" },
      { create: () => "next" },
    );

    await expect(service.require("")).rejects.toBeInstanceOf(
      SessionDeniedError,
    );
    await expect(service.require("valid")).resolves.toEqual(session);
    await expect(service.rotate("valid")).resolves.toEqual({
      session,
      token: "next",
    });
    expect(rotated).toBe("next");
  });
});
