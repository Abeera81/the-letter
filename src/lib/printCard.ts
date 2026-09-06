import type { AbsentField, Claim } from "./schema";

/**
 * Builds the printable action card's four sections — PRD F10: "what
 * happened, deadline, what to bring, where to go" — from data the app
 * already has. This is a pure re-presentation of already-verified claims and
 * the extraction's own absent-information list: no new Gemini call, no new
 * trust boundary.
 *
 * Always English. Claims and absent notes come from extraction (call #1),
 * which runs on the letter as pasted — always English for this product's
 * fixtures — and are never translated; only render.ts's script and
 * AbsentPanel's absentLines are. The card is meant to be handed to a
 * caseworker or office worker at a counter, per PRD F10, not read by the
 * person themselves — the on-screen explanation and audio already serve
 * that in their own language.
 *
 * Fail honest, not silent: a section with nothing to report either says why
 * (reusing the extraction's own absent-field note, when there is one) or is
 * left out of the card entirely. It never invents content, and it never
 * pretends a gap doesn't exist just because there's no absent field for it.
 */

export type PrintCardSection = {
  heading: string;
  lines: string[];
};

export type PrintCardData = {
  documentType: string;
  sections: PrintCardSection[];
};

type SectionSpec = {
  heading: string;
  kinds: Claim["kind"][];
  /** Absent fields checked for a fallback note when no claim of `kinds` exists. */
  fallbackFields: AbsentField[];
};

const SECTION_SPECS: SectionSpec[] = [
  { heading: "What happened", kinds: ["what_happened", "why", "amount"], fallbackFields: ["reason", "explanation", "amount"] },
  { heading: "Deadline", kinds: ["deadline"], fallbackFields: ["deadline"] },
  { heading: "What to bring", kinds: ["action"], fallbackFields: [] },
  { heading: "Where to go", kinds: ["contact"], fallbackFields: ["phone", "contact_name"] },
];

export function buildPrintCard(
  documentType: string,
  verified: Claim[],
  absent: { field: AbsentField; note: string }[],
): PrintCardData {
  const sections: PrintCardSection[] = [];

  for (const spec of SECTION_SPECS) {
    const claimLines = verified.filter((c) => spec.kinds.includes(c.kind)).map((c) => c.statement);

    if (claimLines.length > 0) {
      sections.push({ heading: spec.heading, lines: claimLines });
      continue;
    }

    const fallbackLines = absent.filter((a) => spec.fallbackFields.includes(a.field)).map((a) => a.note);
    if (fallbackLines.length > 0) {
      sections.push({ heading: spec.heading, lines: fallbackLines });
    }
    // Otherwise: nothing was verified and nothing was flagged absent either.
    // Say nothing rather than guess — the section is simply left off the card.
  }

  return { documentType, sections };
}
