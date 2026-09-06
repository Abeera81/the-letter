/**
 * Finds where an already-verified claim's evidence sits in the raw letter, in
 * raw character offsets, so the UI can highlight the exact words a claim came
 * from.
 *
 * This is deliberately separate from the Span Gate. The gate already decided
 * whether a claim is trustworthy, working in normalized, word-position space;
 * it must not be touched to add this. locateSpan runs only on claims the gate
 * already verified, and it answers a narrower question — not "is this real?"
 * but "where exactly is it?" — against the untouched raw text.
 *
 * Fail closed: if a confident, unambiguous location cannot be found, this
 * returns null. A highlight that points at the wrong words, or at nothing in
 * particular, is worse than no highlight at all.
 */

export type SourceSpan = { start: number; end: number };

const REGEX_SPECIAL = /[.*+?^${}()|[\]\\]/g;

/** Every quote glyph normalize() would have folded to a plain ' or ". */
const SINGLE_QUOTE_CLASS = "['‘’‚‛′`´]";
const DOUBLE_QUOTE_CLASS = '["“”„‟″«»]';

/** Every dash glyph normalize() would have folded to a plain hyphen. */
const DASH_CLASS = "[-‐‑‒–—―−]";

/**
 * Builds a tolerant pattern from the evidence string: literal text, but with
 * whitespace runs loosened to match any whitespace run, and quote/dash glyphs
 * loosened to match any equivalent glyph — the same surface differences
 * normalize() already tolerates for the gate's own comparison.
 */
function toTolerantPattern(evidence: string): string {
  const escaped = evidence.replace(REGEX_SPECIAL, "\\$&");
  return escaped
    .replace(/\s+/g, "\\s+")
    .replace(new RegExp(SINGLE_QUOTE_CLASS, "g"), SINGLE_QUOTE_CLASS)
    .replace(new RegExp(DOUBLE_QUOTE_CLASS, "g"), DOUBLE_QUOTE_CLASS)
    .replace(new RegExp(DASH_CLASS, "g"), DASH_CLASS);
}

export function locateSpan(rawSource: string, evidence: string): SourceSpan | null {
  if (evidence.length === 0) return null;

  // Fast path: the ordinary case is a byte-exact quote.
  const exact = rawSource.indexOf(evidence);
  if (exact !== -1) return { start: exact, end: exact + evidence.length };

  // Fallback: tolerate the same reformatting the gate itself tolerates.
  let pattern: RegExp;
  try {
    pattern = new RegExp(toTolerantPattern(evidence), "i");
  } catch {
    return null;
  }

  const match = pattern.exec(rawSource);
  if (!match) return null;

  return { start: match.index, end: match.index + match[0].length };
}
