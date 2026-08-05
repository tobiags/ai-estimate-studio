import { describe, expect, it } from "vitest";
import { assertCsrf, CsrfDeniedError } from "./csrf.js";

describe("CSRF boundary", () => {
  it("allows safe methods and requires same-origin double-submit tokens for mutations", () => {
    expect(() =>
      assertCsrf({
        method: "GET",
        origin: "https://app.test",
        expectedOrigin: "https://app.test",
      }),
    ).not.toThrow();
    expect(() =>
      assertCsrf({
        method: "POST",
        origin: "https://evil.test",
        expectedOrigin: "https://app.test",
        headerToken: "x",
        cookieToken: "x",
      }),
    ).toThrow(CsrfDeniedError);
    expect(() =>
      assertCsrf({
        method: "POST",
        origin: "https://app.test",
        expectedOrigin: "https://app.test",
        headerToken: "x",
        cookieToken: "y",
      }),
    ).toThrow(CsrfDeniedError);
    expect(() =>
      assertCsrf({
        method: "POST",
        origin: "https://app.test",
        expectedOrigin: "https://app.test",
        headerToken: "x",
        cookieToken: "x",
      }),
    ).not.toThrow();
  });
});
