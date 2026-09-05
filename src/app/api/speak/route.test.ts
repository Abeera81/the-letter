import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { SpeakError } from "@/lib/elevenlabs";

vi.mock("@/lib/elevenlabs", async () => {
  const actual = await vi.importActual<typeof import("@/lib/elevenlabs")>("@/lib/elevenlabs");
  return { ...actual, synthesizeSpeech: vi.fn() };
});

const { synthesizeSpeech } = await import("@/lib/elevenlabs");

afterEach(() => vi.resetAllMocks());

function req(body: unknown): Request {
  return new Request("http://localhost/api/speak", {
    method: "POST",
    body: JSON.stringify(body),
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
    const badReq = new Request("http://localhost/api/speak", { method: "POST", body: "{not json" });
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
});
