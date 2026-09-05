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

/** Spelled-out numbers, because these letters write "within ninety days", not "90". */
const NUMBER_WORDS = new Set([
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen", "twenty", "thirty", "forty", "fifty",
  "sixty", "seventy", "eighty", "ninety", "hundred", "thousand",
]);

export type DropReason =
  | "evidence_too_short"
  | "evidence_not_found"
  | "overlap_below_threshold"
  | "numeric_mismatch";

export type DroppedClaim = { claim: Claim; reason: DropReason };

export type GatedResult = {
  verified: Claim[];
  dropped: DroppedClaim[];
};

/** A token carrying a date, an amount, or any other number. */
function isNumeric(token: string): boolean {
  const bare = token.replace(/[^a-z0-9]/g, "");
  return /\d/.test(bare) || NUMBER_WORDS.has(bare);
}

type WindowMatch = { ratio: number; mismatchedNumeric: boolean };

/**
 * Compares the evidence against the best-matching CONTIGUOUS run of source
 * words, word position by word position.
 *
 * The earlier version of this compared against the source's whole word set,
 * which was far too generous: it ignored order, so a quote could be assembled
 * from words scattered across the letter. Changing "within ninety days" to
 * "within thirty days" scored a perfect 1.0, because "thirty" appeared in an
 * unrelated sentence. Sliding a window fixes that — "thirty" is now compared
 * against whatever word actually sits in that position.
 */
function bestWindow(evidenceWords: string[], sourceWords: string[]): WindowMatch {
  // No match at all is reported as a plain zero ratio, not as a numeric
  // mismatch: nothing was compared, so nothing disagreed.
  let best: WindowMatch = { ratio: 0, mismatchedNumeric: false };
  if (evidenceWords.length === 0) return best;

  for (let start = 0; start + evidenceWords.length <= sourceWords.length; start++) {
    let hits = 0;
    let mismatchedNumeric = false;

    for (let i = 0; i < evidenceWords.length; i++) {
      const word = evidenceWords[i];
      if (word === sourceWords[start + i]) {
        hits++;
      } else if (isNumeric(word)) {
        // A date or amount that is not where the quote claims it is.
        mismatchedNumeric = true;
      }
    }

    const ratio = hits / evidenceWords.length;
    if (ratio > best.ratio) best = { ratio, mismatchedNumeric };
    if (ratio === 1) break;
  }

  return best;
}

/**
 * Splits claims into those whose evidence is genuinely in the letter and those
 * that are not, recording why each one was dropped.
 */
export function runSpanGate(claims: Claim[], sourceText: string): GatedResult {
  const source = normalize(sourceText);
  const sourceWords = source.split(" ").filter(Boolean);

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

    // The fallback exists only because a faithful quote may have lost a line
    // break or had a hyphen tidied. It is not a licence to paraphrase.
    const match = bestWindow(evidence.split(" ").filter(Boolean), sourceWords);

    // A wrong date or amount is the exact harm this product exists to prevent,
    // so it fails the claim outright however well the rest of the words score.
    if (match.mismatchedNumeric) {
      dropped.push({ claim, reason: "numeric_mismatch" });
      continue;
    }

    if (match.ratio >= MIN_OVERLAP_RATIO) {
      verified.push(claim);
      continue;
    }

    // Both remaining reasons are recorded because they mean different things to
    // a reader of the audit panel: nothing in this quote is in the letter,
    // versus some of it is but not enough to trust.
    dropped.push({
      claim,
      reason: match.ratio === 0 ? "evidence_not_found" : "overlap_below_threshold",
    });
  }

  return { verified, dropped };
}
