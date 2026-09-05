import { NextResponse } from "next/server";
import { ExtractionError, extractClaims } from "@/lib/gemini";
import { ExplainRequestSchema, MAX_LETTER_CHARS, MIN_LETTER_CHARS } from "@/lib/schema";

/**
 * POST /api/explain
 *
 * Holds GEMINI_API_KEY server-side. The letter arrives, is explained, and is
 * gone: it is never written to disk, never logged, and never included in an
 * error response. Every failure here fails closed — an error, never a partial
 * explanation.
 *
 * P1 returns the raw extraction result. The Span Gate lands in P2 and the
 * plain-language script in P3.
 */

export const runtime = "nodejs";
/** Nothing here is cacheable, and nothing about a letter should be reused. */
export const dynamic = "force-dynamic";

type ErrorBody = { error: string; message: string };

const MESSAGES: Record<string, string> = {
  invalid_request: `Paste between ${MIN_LETTER_CHARS} and ${MAX_LETTER_CHARS.toLocaleString("en-US")} characters of the letter, and choose a language.`,
  missing_api_key: "The server is not set up to read letters yet. The site owner needs to add an API key.",
  provider_unavailable: "The service that reads letters did not answer. Wait a moment and try again.",
  malformed_output: "The letter could not be read cleanly. Try again, or paste a bit more of the letter.",
};

function fail(code: string, status: number): NextResponse<ErrorBody> {
  return NextResponse.json(
    { error: code, message: MESSAGES[code] ?? MESSAGES.malformed_output },
    { status },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_request", 400);
  }

  const parsed = ExplainRequestSchema.safeParse(body);
  if (!parsed.success) return fail("invalid_request", 400);

  try {
    const extraction = await extractClaims(parsed.data.text);
    return NextResponse.json({
      extraction,
      meta: { targetLang: parsed.data.targetLang },
    });
  } catch (error) {
    if (error instanceof ExtractionError) {
      return fail(error.code, error.code === "missing_api_key" ? 500 : 502);
    }
    // Never surface an unknown error's message: it could quote the request.
    return fail("provider_unavailable", 502);
  }
}
