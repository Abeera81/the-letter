import { z } from "zod";

/**
 * The contract with Gemini call #1.
 *
 * This is a boundary, not a convenience. Everything the model returns is
 * parsed through it and nothing crosses without conforming. The Span Gate
 * that runs next assumes a well-formed Claim; this is what guarantees one.
 *
 * The same Zod schemas generate the JSON Schema sent to the model, so the
 * shape we ask for and the shape we accept cannot drift apart.
 */

export const CLAIM_KINDS = [
  "what_happened",
  "why",
  "deadline",
  "amount",
  "action",
  "contact",
] as const;

export const ABSENT_FIELDS = [
  "deadline",
  "reason",
  "explanation",
  "phone",
  "contact_name",
  "appeal_route",
  "amount",
] as const;

export const TARGET_LANGUAGES = ["en", "ur", "es"] as const;
export type TargetLang = (typeof TARGET_LANGUAGES)[number];

/**
 * PRD §8 / Tech Design §7: the on-screen transcript reads right-to-left for
 * Urdu, and only Urdu. Shared here rather than duplicated per component, so
 * the script panel and the absent-info panel can never disagree about it.
 */
export const RTL_LANGUAGES: ReadonlySet<TargetLang> = new Set(["ur"]);

export const ClaimSchema = z.object({
  id: z
    .string()
    .min(1)
    .describe("A short unique identifier for this claim, such as c1, c2, c3."),
  kind: z.enum(CLAIM_KINDS).describe("Which part of the letter this claim reports."),
  /** The model's neutral restatement. Never spoken directly — call #2 rewrites it. */
  statement: z
    .string()
    .min(1)
    .describe(
      "A neutral restatement of what the letter says. Report only. Never state or imply whether the person qualifies for anything, never recommend a course of action, and never introduce a date, amount, name, address, or phone number that is not in the letter.",
    ),
  /** A verbatim span of the source letter. The Span Gate checks this and only this. */
  evidence: z
    .string()
    .min(1)
    .describe(
      "An exact, character-for-character quote from the letter that supports this claim. Copy it directly from the letter. Do not paraphrase, summarize, or repair it. If you cannot quote it, do not make the claim.",
    ),
});
export type Claim = z.infer<typeof ClaimSchema>;

export const AbsentItemSchema = z.object({
  field: z
    .enum(ABSENT_FIELDS)
    .describe(
      'The kind of information the letter fails to give. "reason" is why an action was taken (a case closed, a notice sent); "explanation" is what a charge, fee, or line item is for. A medical bill with an unexplained charge is missing "explanation", not "reason".',
    ),
  note: z
    .string()
    .min(1)
    .describe(
      "One plain sentence naming what is missing, such as: The letter does not give a phone number.",
    ),
});
export type AbsentItem = z.infer<typeof AbsentItemSchema>;

export const ExtractionResultSchema = z.object({
  documentType: z
    .string()
    .min(1)
    .describe('What kind of document this is, in plain words, such as "benefits notice" or "medical bill".'),
  claims: z.array(ClaimSchema).describe("Every claim you can support with a verbatim quote."),
  absent: z
    .array(AbsentItemSchema)
    .describe("Important information the letter does NOT contain."),
});
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;

/** Input contract for POST /api/explain. */
export const MIN_LETTER_CHARS = 50;
export const MAX_LETTER_CHARS = 20_000;

export const ExplainRequestSchema = z.object({
  text: z.string().min(MIN_LETTER_CHARS).max(MAX_LETTER_CHARS),
  targetLang: z.enum(TARGET_LANGUAGES),
});
export type ExplainRequest = z.infer<typeof ExplainRequestSchema>;

/**
 * The JSON Schema handed to Gemini's structured-output mode.
 *
 * Derived from the Zod schema above rather than written twice by hand, so the
 * shape we ask for and the shape we accept cannot drift apart. The field
 * descriptions carry the extraction rules to the model.
 *
 * `$schema` is dropped: the API wants a bare schema object, not a document.
 */
export function extractionJsonSchema(): Record<string, unknown> {
  const schema = z.toJSONSchema(ExtractionResultSchema, {
    target: "draft-7",
  }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}
