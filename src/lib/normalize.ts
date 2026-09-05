/**
 * Text normalization shared by the extraction step and the Span Gate.
 *
 * The point is to make two strings comparable without making them different.
 * A model that faithfully quotes a letter may still swap a curly quote for a
 * straight one, turn an em dash into a hyphen, or flatten a line break. None
 * of those are fabrication, so none of them should cost a claim its evidence.
 *
 * Characters are listed by code point rather than typed literally: a file full
 * of invisible characters and near-identical quote glyphs is unreviewable, and
 * a reviewer of the Span Gate needs to see exactly what is being folded away.
 *
 * The source text is never mutated. Display always uses the letter exactly as
 * pasted; only the throwaway comparison copy is normalized.
 */

/** Soft hyphen, zero-width spaces, bidi marks, word joiner, BOM. All survive a PDF copy-paste. */
const INVISIBLE_CODE_POINTS = [
  0x00ad, // soft hyphen
  0x200b, 0x200c, 0x200d, // zero-width space / non-joiner / joiner
  0x200e, 0x200f, // left-to-right and right-to-left marks
  0x2028, 0x2029, // line and paragraph separators
  0x202a, 0x202b, 0x202c, 0x202d, 0x202e, // bidi embedding and override
  0x2060, // word joiner
  0xfeff, // byte order mark
];

/** Every single-quote glyph a word processor might have produced. */
const SINGLE_QUOTE_CODE_POINTS = [
  0x2018, 0x2019, 0x201a, 0x201b, // curly and low singles
  0x2032, // prime
  0x0060, 0x00b4, // grave and acute accents used as quotes
];

/** Every double-quote glyph, including the guillemets. */
const DOUBLE_QUOTE_CODE_POINTS = [
  0x201c, 0x201d, 0x201e, 0x201f, // curly and low doubles
  0x2033, // double prime
  0x00ab, 0x00bb, // guillemets
];

/** Hyphen, non-breaking hyphen, figure/en/em dash, horizontal bar, minus sign. */
const DASH_CODE_POINTS = [
  0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212,
];

function charClass(codePoints: number[]): RegExp {
  return new RegExp(`[${codePoints.map((c) => String.fromCodePoint(c)).join("")}]`, "g");
}

const INVISIBLE = charClass(INVISIBLE_CODE_POINTS);
const SINGLE_QUOTES = charClass(SINGLE_QUOTE_CODE_POINTS);
const DOUBLE_QUOTES = charClass(DOUBLE_QUOTE_CODE_POINTS);
const DASHES = charClass(DASH_CODE_POINTS);

export function normalize(input: string): string {
  return input
    .normalize("NFKC")
    .replace(INVISIBLE, "")
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, "-")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
