import { describe, expect, it } from "vitest";
import { classifySdkError } from "./sdkError";

describe("classifySdkError", () => {
  it("classifies 401 and 403 as an auth failure", () => {
    expect(classifySdkError({ status: 401 })).toBe("auth_failed");
    expect(classifySdkError({ status: 403 })).toBe("auth_failed");
  });

  it("classifies 429 as quota exceeded", () => {
    expect(classifySdkError({ status: 429 })).toBe("quota_exceeded");
  });

  it("falls back to provider_unavailable for any other status", () => {
    expect(classifySdkError({ status: 500 })).toBe("provider_unavailable");
    expect(classifySdkError({ status: 400 })).toBe("provider_unavailable");
  });

  it("falls back to provider_unavailable when there is no status at all", () => {
    expect(classifySdkError(new Error("network down"))).toBe("provider_unavailable");
    expect(classifySdkError("a plain string")).toBe("provider_unavailable");
    expect(classifySdkError(null)).toBe("provider_unavailable");
    expect(classifySdkError(undefined)).toBe("provider_unavailable");
  });

  it("does not choke on a status that is not a number", () => {
    expect(classifySdkError({ status: "429" })).toBe("provider_unavailable");
  });
});
