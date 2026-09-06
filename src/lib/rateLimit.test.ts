import { describe, expect, it } from "vitest";
import { checkRateLimit } from "./rateLimit";

describe("checkRateLimit", () => {
  it("allows requests up to the limit, then blocks", () => {
    const key = "test-ip-1";
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, { max: 5, windowMs: 60_000 })).toBe(true);
    }
    // The 6th request within the same window is the one that must be blocked.
    expect(checkRateLimit(key, { max: 5, windowMs: 60_000 })).toBe(false);
  });

  it("tracks each key independently", () => {
    const a = "test-ip-2a";
    const b = "test-ip-2b";
    for (let i = 0; i < 3; i++) checkRateLimit(a, { max: 3, windowMs: 60_000 });
    expect(checkRateLimit(a, { max: 3, windowMs: 60_000 })).toBe(false);
    // A different key must not be affected by another key's usage.
    expect(checkRateLimit(b, { max: 3, windowMs: 60_000 })).toBe(true);
  });

  it("resets the count once the window has elapsed", async () => {
    const key = "test-ip-3";
    expect(checkRateLimit(key, { max: 1, windowMs: 20 })).toBe(true);
    expect(checkRateLimit(key, { max: 1, windowMs: 20 })).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(checkRateLimit(key, { max: 1, windowMs: 20 })).toBe(true);
  });
});
