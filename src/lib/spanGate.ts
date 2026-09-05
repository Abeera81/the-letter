import { normalize } from "./normalize";
import type { Claim } from "./schema";

/**
 * ══ THE SPAN GATE ══
 *
 * This is the point of the whole product, and there is no model in it.
 *
 * Gemini returns claims about a letter, each carrying an `evidence` field it
 * asserts is a verbatim quote. This function checks that assertion against the
 * actual letter, in plain TypeScript. A claim whose evidence cannot be located
 * in the source is deleted before anything is spoken.
 *
 * The rule when uncertain is DROP. A missing claim is a poor experience; a
 * fabricated one — an invented deadline on a benefits letter — is a harm. The
 * user cannot read the letter to catch us, so the code has to be the check.
 *
 * What this does NOT do, and the submission post must say so: it verifies that
 * a quote exists in the letter. It does not verify that the claim's
 * interpretation of that quote is correct.
 */

/** Evidence shorter than this is too generic to prove anything. "September" is not proof. */
const MIN_EVIDENCE_CHARS = 12;

/** Deliberately strict. This is a tolerance for reformatting, not for paraphrase. */
const MIN_OVERLAP_RATIO = 0.9;

export type DropReason = "evidence_too_short" | "evidence_not_found" | "overlap_below_threshold";

export type DroppedClaim = { claim: Claim; reason: DropReason };

export type GatedResult = {
  verified: Claim[];
  dropped: DroppedClaim[];
};

/**
 * Fraction of the evidence's words that appear in the source.
 *
 * The fallback exists because a model that quotes faithfully may still drop a
 * line break or tidy a hyphen. It compares against the source's whole word set,
 * so it is a test of "are these the letter's words", not of word order. That is
 * why the threshold sits at 0.90 rather than something forgiving.
 */
export function tokenOverlapRatio(evidence: string, sourceWords: Set<string>): number {
  const words = evidence.split(" ").filter(Boolean);
  if (words.length === 0) return 0;
  const found = words.filter((word) => sourceWords.has(word)).length;
  return found / words.length;
}

/**
 * Splits claims into those whose evidence is genuinely in the letter and those
 * that are not, recording why each one was dropped.
 */
export function runSpanGate(claims: Claim[], sourceText: string): GatedResult {
  const source = normalize(sourceText);
  const sourceWords = new Set(source.split(" ").filter(Boolean));

  const verified: Claim[] = [];
  const dropped: DroppedClaim[] = [];

  for (const claim of claims) {
    const evidence = normalize(claim.evidence);

    if (evidence.length < MIN_EVIDENCE_CHARS) {
      dropped.push({ claim, reason: "evidence_too_short" });
      continue;
    }

    // The ordinary case: the model quoted the letter and we can find it.
    if (source.includes(evidence)) {
      verified.push(claim);
      continue;
    }

    const overlap = tokenOverlapRatio(evidence, sourceWords);
    if (overlap >= MIN_OVERLAP_RATIO) {
      verified.push(claim);
      continue;
    }

    // Both reasons are recorded because they mean different things to a reader
    // of the audit panel: nothing in this quote is in the letter, versus some
    // of it is but not enough to trust.
    dropped.push({
      claim,
      reason: overlap === 0 ? "evidence_not_found" : "overlap_below_threshold",
    });
  }

  return { verified, dropped };
}
