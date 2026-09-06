import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { EXTRACTION_MODEL } from "./gemini";
import { classifySdkError } from "./sdkError";
import type { AbsentItem, Claim, TargetLang } from "./schema";

/**
 * Gemini call #2 — RENDERING.
 *
 * ⚠️ THIS CALL NEVER RECEIVES THE SOURCE LETTER. ⚠️
 *
 * That is the load-bearing idea of the whole product. The rendering model
 * cannot invent something that was in the letter, because it has never read
 * the letter. It sees claims that the Span Gate already traced to verbatim
 * spans, and nothing else.
 *
 * The guarantee is enforced by shape, not by discipline: `buildRenderRequest`
 * takes verified claims, absent items and a language. There is no parameter to
 * pass the letter through, so "just for context" is a type error rather than a
 * judgement call. `render.test.ts` asserts a sentinel token from a source
 * letter appears nowhere in the fully serialized request body.
 *
 * If you are ever tempted to add a `sourceText` argument here: don't. That is
 * the failure mode this architecture exists to prevent.
 *
 * P6 adds a second output alongside the spoken script: `absentLines`, a
 * translated one-line-per-item version of the "letter does not say" list,
 * for the on-screen panel (PRD §5.1). The spoken script already narrates
 * these facts naturally in its own flowing prose — that is unchanged.
 * `absentLines` is a parallel, independently-phrased rendering of the same
 * facts, built for scanning as a short list rather than for being heard.
 * Structured output (a JSON schema, the same mechanism call #1 already uses)
 * is used here specifically so a length mismatch between what was asked for
 * and what came back is something code can catch and fail closed on, rather
 * than something that could silently drift.
 */

/**
 * Written by code, never by a model. Every result ends with exactly this
 * line, in the language it was requested in.
 *
 * Translated once, here, by hand — not per-request by the rendering model.
 * The whole point of a fixed footer is that it cannot be reworded, dropped,
 * or drift between calls; letting a model translate it per-request would
 * reopen exactly that risk in a different language. The Urdu translation was
 * reviewed and confirmed correct by a native speaker at P5.
 */
export const FIXED_FOOTERS: Record<TargetLang, string> = {
  en: "This explains the letter. It is not advice about your case.",
  ur: "یہ خط کی وضاحت کرتا ہے۔ یہ آپ کے معاملے کے بارے میں مشورہ نہیں ہے۔",
  es: "Esto explica la carta. No es un consejo sobre su caso.",
};

export type RenderErrorCode =
  | "missing_api_key"
  | "auth_failed"
  | "quota_exceeded"
  | "provider_unavailable"
  | "malformed_render";

export class RenderError extends Error {
  constructor(readonly code: RenderErrorCode) {
    // As with extraction: the code is the whole message. Nothing about the
    // letter or the rendered explanation ever reaches a log line.
    super(code);
    this.name = "RenderError";
  }
}

const LANGUAGE_NAMES: Record<TargetLang, string> = {
  en: "English",
  ur: "Urdu",
  es: "Spanish",
};

/**
 * The contract with Gemini call #2.
 *
 * `absentLines` must have exactly one entry per item in the "does not say"
 * list the model was given, in the same order — this is checked below on
 * top of the schema, since Zod can validate shape but not "matches the
 * length of a different array the caller passed in".
 */
const RenderResultSchema = z.object({
  script: z
    .string()
    .min(1)
    .describe("The full spoken explanation, exactly as specified in the system instructions."),
  absentLines: z
    .array(z.string().min(1))
    .describe(
      "One short sentence per item in the 'letter does not say' list, in the same order, written to be read on screen rather than heard. Empty array if that list was empty.",
    ),
});

function renderResultJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(RenderResultSchema, { target: "draft-7" }) as Record<
    string,
    unknown
  >;
  delete schema.$schema;
  return schema;
}

const SYSTEM_INSTRUCTION = `You turn verified facts about an official letter into words a frightened person can understand when they hear them read aloud.

You have not seen the letter. You cannot see it. Everything you know about it is in the facts you are given. This is deliberate.

HARD RULES.

1. Use only the facts given to you. Add nothing. If a fact is not in the list, it does not exist and you must not mention it.
2. Never introduce a date, amount, name, address, or phone number. If it is not in the facts, you may not say it.
3. Never state or imply whether the person qualifies, or does not qualify, for anything.
4. Never recommend appealing, not appealing, or any legal or procedural strategy. If a fact reports that the letter mentions an appeal or a hearing, you may report that the letter says it exists. You must not suggest that the person use it, and you must not present it as the expected next step. Report the option; never recommend it. Keep it separate from the required actions below — it is something the letter mentions, not a step to take.
5. Never predict what will happen.
6. Never name an organization, lawyer, or agency that the facts do not name.

YOU MUST RETURN TWO THINGS.

"script" — the full spoken explanation. Write at about a grade five reading level. Short sentences. Everyday words. Say "you" and "your". Be calm. Do not be alarming, and do not be gentle to the point of hiding what happened.

This will be read out loud by a voice, so write it for the ear:
- No bullet points, no dashes, no numbered lists, no headings.
- No brackets or parentheses.
- No abbreviations. Write words out.
- Write dates in full, as words. Say "the twenty sixth of September" and not "26/09" or "Sept 26".
- Write amounts as words a person would say aloud.

Order for "script": what happened first. Then why, if a reason is given. Then any deadline. Then what to do — the things the person must actually send or provide. Then, as its own separate sentence or two, anything else the letter mentions that is not a required step, such as a right to a hearing or appeal: state plainly that the letter mentions it, without folding it into the list of things to do. Then what the letter does not say, if anything is listed, narrated naturally as part of the explanation.

"absentLines" — a SEPARATE list, one short sentence per item in the "letter does not say" facts you were given, in the same order, written to be read on a screen rather than heard aloud. This repeats the same facts as the end of "script" in a different form — that repetition is intentional, not a mistake. If you were given no such facts, return an empty array. Never add an item that was not given to you.

Return only the JSON object described. No preamble, no sign off, no explanation of what you did.`;

/**
 * Builds the request for call #2.
 *
 * Exported so the isolation test can inspect exactly what would be sent.
 * Note the parameters: claims, absent items, language. No letter.
 */
export function buildRenderRequest(
  claims: Claim[],
  absent: AbsentItem[],
  targetLang: TargetLang,
) {
  // Only the fields the renderer needs. `evidence` is deliberately excluded:
  // it is a verbatim slice of the letter, and this call does not get letter
  // text. Its job was to satisfy the Span Gate, and the gate has already run.
  const facts = claims.map((claim) => ({ kind: claim.kind, fact: claim.statement }));
  const missing = absent.map((item) => item.note);

  const input = `Write the explanation in ${LANGUAGE_NAMES[targetLang]}.

These are the verified facts about the letter:
${JSON.stringify(facts, null, 2)}

The letter does not say these things:
${missing.length > 0 ? JSON.stringify(missing, null, 2) : "[]"}

Return the JSON object with "script" and "absentLines" as described.`;

  return {
    model: EXTRACTION_MODEL,
    system_instruction: SYSTEM_INSTRUCTION,
    input,
    response_format: {
      type: "text" as const,
      mime_type: "application/json",
      schema: renderResultJsonSchema(),
    },
  };
}

/** Exported for the isolation test. */
export const __testables = { SYSTEM_INSTRUCTION, LANGUAGE_NAMES };

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new RenderError("missing_api_key");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function callOnce(
  claims: Claim[],
  absent: AbsentItem[],
  targetLang: TargetLang,
): Promise<string> {
  const interaction = await getClient().interactions.create(
    buildRenderRequest(claims, absent, targetLang),
  );
  const text = interaction.output_text;
  if (!text) throw new RenderError("malformed_render");
  return text;
}

export type RenderedExplanation = {
  /** The words the voice speaks. The footer is appended here, by code. */
  script: string;
  /** One translated line per absent item, same order, for the on-screen panel. */
  absentLines: string[];
};

/**
 * Produces the explanation: the spoken script and the translated "does not
 * say" lines for the on-screen panel.
 *
 * Fails closed on every path. A malformed or short response gets one retry,
 * exactly like extraction — then a typed error, never a partial or
 * mismatched result. In particular: `absentLines` must have exactly as many
 * entries as `absent` had, in order. A model that drops or merges an item is
 * indistinguishable from one that mistranslated it, and this product does
 * not show a "maybe right" list — it shows a correct one or an error.
 */
export async function renderExplanation(
  claims: Claim[],
  absent: AbsentItem[],
  targetLang: TargetLang,
): Promise<RenderedExplanation> {
  let lastFailure: RenderError = new RenderError("malformed_render");

  for (let attempt = 0; attempt < 2; attempt++) {
    let raw: string;
    try {
      raw = await callOnce(claims, absent, targetLang);
    } catch (error) {
      if (error instanceof RenderError) {
        if (error.code === "missing_api_key") throw error;
        lastFailure = error;
        continue;
      }

      const classified = classifySdkError(error);
      if (classified === "auth_failed" || classified === "quota_exceeded") {
        throw new RenderError(classified);
      }
      lastFailure = new RenderError(classified);
      continue;
    }

    const parsed = RenderResultSchema.safeParse(safeJsonParse(raw));
    if (!parsed.success) {
      lastFailure = new RenderError("malformed_render");
      continue;
    }

    // The cross-field check Zod cannot express on its own.
    if (parsed.data.absentLines.length !== absent.length) {
      lastFailure = new RenderError("malformed_render");
      continue;
    }

    return {
      script: `${parsed.data.script.trim()}\n\n${FIXED_FOOTERS[targetLang]}`,
      absentLines: parsed.data.absentLines,
    };
  }

  throw lastFailure;
}
