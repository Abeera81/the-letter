/**
 * ElevenLabs text-to-speech.
 *
 * Endpoint and body shape verified against
 * elevenlabs.io/docs/api-reference/text-to-speech/convert on 2026-09-05,
 * recorded in MEMORY.md. `eleven_multilingual_v2` is the documented default
 * and is what lets one voice handle English, Urdu, and Spanish (Tech Design
 * §6), so it is set explicitly rather than left to the API's default.
 *
 * The audio is returned directly to the browser. It is never written to
 * disk and never cached — nothing about a letter is kept anywhere.
 */

const ELEVENLABS_MODEL = "eleven_multilingual_v2";

export type SpeakErrorCode =
  | "missing_config"
  | "provider_unavailable"
  | "quota_exceeded"
  | "empty_audio";

export class SpeakError extends Error {
  constructor(readonly code: SpeakErrorCode) {
    // As with the Gemini errors: the code is the whole message. The script
    // that failed to speak is never included in an error, a log, or a trace.
    super(code);
    this.name = "SpeakError";
  }
}

/**
 * A calm, low-urgency voice a person could hear delivering bad news without
 * it feeling like a product jingle. Chosen and recorded in MEMORY.md — voice
 * choice is submission-post material, not an implementation detail.
 */
function requireVoiceId(): string {
  const id = process.env.ELEVENLABS_VOICE_ID;
  if (!id) throw new SpeakError("missing_config");
  return id;
}

function requireApiKey(): string {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new SpeakError("missing_config");
  return key;
}

/**
 * Synthesizes speech for the given script and returns raw MP3 bytes.
 *
 * `speed` sits slightly under 1 (see the constant below) because the
 * rendering prompt already writes short, plain sentences meant to be heard;
 * a hair slower reads as calm rather than rushed. Slow replay (0.7x) is a
 * separate, client-side control — playbackRate on the audio element — and
 * does not call this function again.
 */
const VOICE_SETTINGS = {
  stability: 0.6,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true,
  speed: 0.95,
};

export async function synthesizeSpeech(script: string): Promise<ArrayBuffer> {
  const voiceId = requireVoiceId();
  const apiKey = requireApiKey();

  let response: Response;
  try {
    response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: script,
        model_id: ELEVENLABS_MODEL,
        voice_settings: VOICE_SETTINGS,
      }),
    });
  } catch {
    throw new SpeakError("provider_unavailable");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 429) {
      // ElevenLabs reports an exhausted character quota as one of these,
      // depending on plan. Either way it is not a transient failure to retry.
      const body = await response.text().catch(() => "");
      throw new SpeakError(
        body.includes("quota") ? "quota_exceeded" : "provider_unavailable",
      );
    }
    throw new SpeakError("provider_unavailable");
  }

  const audio = await response.arrayBuffer();
  if (audio.byteLength === 0) throw new SpeakError("empty_audio");
  return audio;
}
