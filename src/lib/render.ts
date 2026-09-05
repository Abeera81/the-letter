import { GoogleGenAI } from "@google/genai";
import { EXTRACTION_MODEL } from "./gemini";
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
 */

/** Written by code, never by a model. Every result ends with exactly this line. */
export const FIXED_FOOTER = "This explains the letter. It is not advice about your case.";

export type RenderErrorCode = "missing_api_key" | "provider_unavailable" | "empty_script";

export class RenderError extends Error {
  constructor(readonly code: RenderErrorCode) {
    super(code);
    this.name = "RenderError";
  }
}

const LANGUAGE_NAMES: Record<TargetLang, string> = {
  en: "English",
  ur: "Urdu",
  es: "Spanish",
};

const SYSTEM_INSTRUCTION = `You turn verified facts about an official letter into words a frightened person can understand when they hear them read aloud.

You have not seen the letter. You cannot see it. Everything you know about it is in the facts you are given. This is deliberate.

HARD RULES.

1. Use only the facts given to you. Add nothing. If a fact is not in the list, it does not exist and you must not mention it.
2. Never introduce a date, amount, name, address, or phone number. If it is not in the facts, you may not say it.
3. Never state or imply whether the person qualifies, or does not qualify, for anything.
4. Never recommend appealing, not appealing, or any legal or procedural strategy. If a fact reports that the letter mentions an appeal or a hearing, you may report that the letter says it exists. You must not suggest that the person use it, and you must not present it as the expected next step. Report the option; never recommend it. Keep it separate from the required actions below — it is something the letter mentions, not a step to take.
5. Never predict what will happen.
6. Never name an organization, lawyer, or agency that the facts do not name.

HOW TO WRITE.

Write at about a grade five reading level. Short sentences. Everyday words. Say "you" and "your". Be calm. Do not be alarming, and do not be gentle to the point of hiding what happened.

This will be read out loud by a voice, so write for the ear:
- No bullet points, no dashes, no numbered lists, no headings.
- No brackets or parentheses.
- No abbreviations. Write words out.
- Write dates in full, as words. Say "the twenty sixth of September" and not "26/09" or "Sept 26".
- Write amounts as words a person would say aloud.

ORDER.

What happened first. Then why, if a reason is given. Then any deadline. Then what to do — the things the person must actually send or provide. Then, as its own separate sentence or two, anything else the letter mentions that is not a required step, such as a right to a hearing or appeal: state plainly that the letter mentions it, without folding it into the list of things to do. Then what the letter does not say, if anything is listed.

Return only the words to be spoken. No preamble, no sign off, no explanation of what you did.`;

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

  const input = `Write what the voice should say, in ${LANGUAGE_NAMES[targetLang]}.

These are the verified facts about the letter:
${JSON.stringify(facts, null, 2)}

The letter does not say these things:
${missing.length > 0 ? JSON.stringify(missing, null, 2) : "[]"}

Write only the spoken words.`;

  return {
    model: EXTRACTION_MODEL,
    system_instruction: SYSTEM_INSTRUCTION,
    input,
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

/**
 * Produces the script the voice will speak.
 *
 * The footer is appended here, by code. A model is never asked to produce it,
 * so it cannot reword it, translate it, or quietly drop it.
 */
export async function renderScript(
  claims: Claim[],
  absent: AbsentItem[],
  targetLang: TargetLang,
): Promise<string> {
  let interaction;
  try {
    interaction = await getClient().interactions.create(
      buildRenderRequest(claims, absent, targetLang),
    );
  } catch (error) {
    if (error instanceof RenderError) throw error;
    throw new RenderError("provider_unavailable");
  }

  const body = interaction.output_text?.trim();
  if (!body) throw new RenderError("empty_script");

  return `${body}\n\n${FIXED_FOOTER}`;
}
