import type { DropReason, DroppedClaim } from "@/lib/spanGate";

/**
 * PRD F11 — shows what the Span Gate dropped and why, in plain language. This
 * is the human-facing counterpart to the raw dropped[] array already sitting
 * in the collapsed "Technical details" JSON: the same information, but
 * readable without knowing the code.
 *
 * Renders nothing when nothing was dropped — this panel exists to show a
 * real gap, not to reassure with an empty list.
 */
const REASON_TEXT: Record<DropReason, string> = {
  evidence_too_short: "the quoted text was too short to verify on its own",
  evidence_not_found: "the quoted text could not be found anywhere in the letter",
  overlap_below_threshold: "the quoted text did not closely enough match the letter's actual wording",
  numeric_mismatch: "a number or date in the quote did not match what the letter actually says",
};

export default function AuditPanel({ dropped }: { dropped: DroppedClaim[] }) {
  if (dropped.length === 0) return null;

  return (
    <section aria-labelledby="audit-heading" className="mt-8">
      <h3 id="audit-heading" className="text-xl font-semibold">
        What could not be verified
      </h3>
      <p className="mt-2 text-ink-soft">
        The model suggested {dropped.length} more{" "}
        {dropped.length === 1 ? "statement" : "statements"} about your letter. None of
        them could be traced back to its exact words, so none of them were kept or
        spoken.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {dropped.map(({ claim, reason }) => (
          <li key={claim.id} className="rounded-md border border-rule bg-paper-raised px-4 py-3">
            <p>{claim.statement}</p>
            <p className="mt-1 text-sm text-ink-soft">Dropped because {REASON_TEXT[reason]}.</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
