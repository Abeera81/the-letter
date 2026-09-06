import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { SpeakError } from "@/lib/elevenlabs";

vi.mock("@/lib/elevenlabs", async () => {
  const actual = await vi.importActual<typeof import("@/lib/elevenlabs")>("@/lib/elevenlabs");
  return { ...actual, synthesizeSpeech: vi.fn() };
});

const { synthesizeSpeech } = await import("@/lib/elevenlabs");

afterEach(() => vi.resetAllMocks());

// Each call gets its own x-forwarded-for by default, since it's a fresh
// simulated client — this file's own rate limit tests are the only ones that
// deliberately reuse an IP.
let nextTestIp = 0;
function req(body: unknown, ip = `test-speak-ip-${nextTestIp++}`): Request {
  return new Request("http://localhost/api/speak", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "x-forwarded-for": ip },
  });
}

describe("POST /api/speak", () => {
  it("returns audio/mpeg on success", async () => {
    vi.mocked(synthesizeSpeech).mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    const res = await POST(req({ script: "This explains the letter." }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("audio/mpeg");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects an empty script", async () => {
    const res = await POST(req({ script: "" }));
    expect(res.status).toBe(400);
  });

  it("rejects a missing script field", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("rejects malformed JSON", async () => {
    const badReq = new Request("http://localhost/api/speak", {
      method: "POST",
      body: "{not json",
      headers: { "x-forwarded-for": `test-speak-ip-${nextTestIp++}` },
    });
    const res = await POST(badReq);
    expect(res.status).toBe(400);
  });

  it("fails closed with 502 when the provider is unavailable", async () => {
    vi.mocked(synthesizeSpeech).mockRejectedValue(new SpeakError("provider_unavailable"));
    const res = await POST(req({ script: "hello" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.message).toContain("You can still read the explanation above");
  });

  it("reports quota_exceeded distinctly and still points back to the text", async () => {
    vi.mocked(synthesizeSpeech).mockRejectedValue(new SpeakError("quota_exceeded"));
    const res = await POST(req({ script: "hello" }));
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("quota_exceeded");
    expect(body.message).toContain("read the explanation above");
  });

  it("returns 500 for missing_config, not a generic failure", async () => {
    vi.mocked(synthesizeSpeech).mockRejectedValue(new SpeakError("missing_config"));
    const res = await POST(req({ script: "hello" }));
    expect(res.status).toBe(500);
  });

  it("never echoes the script back in an error response", async () => {
    vi.mocked(synthesizeSpeech).mockRejectedValue(new SpeakError("provider_unavailable"));
    const distinctiveScript = "XYZZY-SCRIPT-SENTINEL-8823";
    const res = await POST(req({ script: distinctiveScript }));
    const body = await res.text();
    expect(body).not.toContain(distinctiveScript);
  });

  it("blocks a client that submits too many requests too quickly", async () => {
    vi.mocked(synthesizeSpeech).mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    const ip = "test-speak-ip-rate-limited";

    // The default limit is 5 requests per window (lib/rateLimit.ts) — the
    // first 5 from the same simulated IP must succeed.
    for (let i = 0; i < 5; i++) {
      const res = await POST(req({ script: "hello" }, ip));
      expect(res.status).toBe(200);
    }

    // The 6th, still inside the window, must be rejected before it ever
    // reaches the provider.
    const blocked = await POST(req({ script: "hello" }, ip));
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.error).toBe("rate_limited");
  });
});
