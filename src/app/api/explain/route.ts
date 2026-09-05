import { NextResponse } from "next/server";
import { ExtractionError, extractClaims } from "@/lib/gemini";
import { runSpanGate } from "@/lib/spanGate";
import { RenderError, renderScript } from "@/lib/render";
import { ExplainRequestSchema, MAX_LETTER_CHARS, MIN_LETTER_CHARS } from "@/lib/schema";

/**
 * POST /api/explain
 *
 * Holds GEMINI_API_KEY server-side. The letter arrives, is explained, and is
 * gone: it is never written to disk, never logged, and never included in an
 * error response. Every failure here fails closed — an error, never a partial
 * explanation.
 *
 * The Span Gate runs over the extraction before anything is rendered, so
 * nothing that cannot be traced to the letter ever reaches the user — or the
 * rendering call, which receives verified claims and never the letter itself.
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
  empty_script: "The letter was read, but the explanation came back empty. Try again.",
  nothing_verified: "None of what came back could be traced to your letter, so there is nothing safe to tell you. Try again, or check that you pasted the whole letter.",
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

    // ══ THE SPAN GATE ══ Deterministic, no model. Anything the letter does not
    // actually say is deleted here, before it can reach the user.
    const { verified, dropped } = runSpanGate(extraction.claims, parsed.data.text);

    // Fail closed. A letter we cannot verify a single claim about is not
    // something to half-explain — that is worse than saying nothing.
    if (verified.length === 0) return fail("nothing_verified", 502);

    // Gemini call #2. It gets verified claims and the absent list. Not the letter.
    const script = await renderScript(verified, extraction.absent, parsed.data.targetLang);

    return NextResponse.json({
      script,
      documentType: extraction.documentType,
      verified,
      dropped,
      absent: extraction.absent,
      meta: {
        droppedCount: dropped.length,
        extractedCount: extraction.claims.length,
        targetLang: parsed.data.targetLang,
      },
    });
  } catch (error) {
    if (error instanceof ExtractionError || error instanceof RenderError) {
      return fail(error.code, error.code === "missing_api_key" ? 500 : 502);
    }
    // Never surface an unknown error's message: it could quote the request.
    return fail("provider_unavailable", 502);
  }
}
