import { NextResponse } from "next/server";
import { z } from "zod";
import { SpeakError, synthesizeSpeech } from "@/lib/elevenlabs";
import { checkRateLimit, clientKey } from "@/lib/rateLimit";
import { MAX_LETTER_CHARS } from "@/lib/schema";

/**
 * POST /api/speak
 *
 * Holds ELEVENLABS_API_KEY server-side. Takes the already-rendered script —
 * never the source letter, which this route never sees — and returns audio.
 * The audio is streamed straight back and never written to disk or cached.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A script is always shorter than the letter it was built from in practice,
// but bounded anyway: this route must never become a way to synthesize
// arbitrary long text through the API key it holds.
const SpeakRequestSchema = z.object({
  script: z.string().min(1).max(MAX_LETTER_CHARS),
});

const MESSAGES: Record<string, string> = {
  invalid_request: "There is nothing to read aloud.",
  missing_config: "The server is not set up for voice yet. The site owner needs to add a voice.",
  provider_unavailable: "The voice service did not answer. You can still read the explanation above. Try again in a moment.",
  quota_exceeded: "The voice service has reached its limit for now. You can still read the explanation above.",
  empty_audio: "No audio came back. You can still read the explanation above. Try again.",
  rate_limited: "Too many voice requests too quickly. Wait a minute and try again.",
};

function fail(code: string, status: number) {
  return NextResponse.json(
    { error: code, message: MESSAGES[code] ?? MESSAGES.provider_unavailable },
    { status },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  // Basic per-IP rate limit, before anything else: this route holds
  // ELEVENLABS_API_KEY behind no auth. See lib/rateLimit.ts.
  if (!checkRateLimit(clientKey(request))) return fail("rate_limited", 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", 400);
  }

  const parsed = SpeakRequestSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  try {
    const audio = await synthesizeSpeech(parsed.data.script);
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof SpeakError) {
      const status = error.code === "missing_config" ? 500 : 502;
      return fail(error.code, status);
    }
    return fail("provider_unavailable", 502);
  }
}
