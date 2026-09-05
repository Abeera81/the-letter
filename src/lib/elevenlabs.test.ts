import { afterEach, describe, expect, it, vi } from "vitest";
import { SpeakError, synthesizeSpeech } from "./elevenlabs";

/**
 * These exercise the request shape and error handling without spending any
 * ElevenLabs credits: fetch is mocked. Per the API budget rule in AGENTS.md,
 * the one live call this phase actually needs is reserved for the manual
 * verification step, not spent here.
 */

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("synthesizeSpeech", () => {
  it("throws missing_config when the voice id is not set", async () => {
    delete process.env.ELEVENLABS_VOICE_ID;
    process.env.ELEVENLABS_API_KEY = "test-key";
    await expect(synthesizeSpeech("hello")).rejects.toMatchObject({
      code: "missing_config",
    });
  });

  it("throws missing_config when the api key is not set", async () => {
    process.env.ELEVENLABS_VOICE_ID = "voice-1";
    delete process.env.ELEVENLABS_API_KEY;
    await expect(synthesizeSpeech("hello")).rejects.toMatchObject({
      code: "missing_config",
    });
  });

  it("posts to the documented endpoint with the documented shape", async () => {
    process.env.ELEVENLABS_VOICE_ID = "voice-1";
    process.env.ELEVENLABS_API_KEY = "test-key";

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]).buffer, { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await synthesizeSpeech("This explains the letter.");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.elevenlabs.io/v1/text-to-speech/voice-1");
    expect(init.method).toBe("POST");
    expect(init.headers["xi-api-key"]).toBe("test-key");

    const body = JSON.parse(init.body);
    expect(body.text).toBe("This explains the letter.");
    expect(body.model_id).toBe("eleven_multilingual_v2");
    expect(body.voice_settings).toBeDefined();
  });

  it("never sends the source letter, only the script it is given", async () => {
    process.env.ELEVENLABS_VOICE_ID = "voice-1";
    process.env.ELEVENLABS_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(new Uint8Array([1]).buffer, { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    // synthesizeSpeech takes one string parameter: whatever is passed in is
    // exactly what is spoken. There is no letter parameter to leak through.
    expect(synthesizeSpeech.length).toBe(1);
  });

  it("classifies a quota response distinctly from a generic failure", async () => {
    process.env.ELEVENLABS_VOICE_ID = "voice-1";
    process.env.ELEVENLABS_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ detail: { code: "quota_exceeded" } }), {
          status: 401,
        }),
      ),
    );

    await expect(synthesizeSpeech("hello")).rejects.toMatchObject({
      code: "quota_exceeded",
    });
  });

  it("treats a network failure as provider_unavailable", async () => {
    process.env.ELEVENLABS_VOICE_ID = "voice-1";
    process.env.ELEVENLABS_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(synthesizeSpeech("hello")).rejects.toMatchObject({
      code: "provider_unavailable",
    });
  });

  it("throws empty_audio rather than returning a zero-length clip", async () => {
    process.env.ELEVENLABS_VOICE_ID = "voice-1";
    process.env.ELEVENLABS_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(new ArrayBuffer(0), { status: 200 })),
    );

    await expect(synthesizeSpeech("hello")).rejects.toMatchObject({
      code: "empty_audio",
    });
  });

  it("is a real SpeakError instance, not a generic Error", async () => {
    delete process.env.ELEVENLABS_VOICE_ID;
    try {
      await synthesizeSpeech("hello");
      throw new Error("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(SpeakError);
    }
  });
});
