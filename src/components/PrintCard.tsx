import { buildPrintCard } from "@/lib/printCard";
import type { AbsentItem, Claim } from "@/lib/schema";

/**
 * The printable action card — PRD F10. Rendered always, hidden on screen
 * (`hidden print:block`), so `window.print()` from the button beside it
 * needs no separate print-only route or window. Every other section of the
 * page carries `print:hidden` so this is the only thing that ends up on
 * paper.
 *
 * Always English, on purpose (see printCard.ts) — this is meant to be
 * handed to a caseworker or office worker, not read by the person
 * themselves. Plain black-on-white: this needs to survive a black-and-white
 * office printer without losing meaning, so nothing here depends on color.
 */
export default function PrintCard({
  documentType,
  verified,
  absent,
}: {
  documentType: string;
  verified: Claim[];
  absent: AbsentItem[];
}) {
  const card = buildPrintCard(documentType, verified, absent);

  return (
    <div className="hidden print:block" lang="en" dir="ltr">
      <h1 className="text-2xl font-semibold">The Letter — Action Card</h1>
      <p className="mt-1 text-base">
        Summary of a {card.documentType}. Not the original letter — bring or refer to
        that as well.
      </p>

      {card.sections.map((section) => (
        <section key={section.heading} className="mt-6 break-inside-avoid">
          <h2 className="text-lg font-semibold">{section.heading}</h2>
          <ul className="mt-1 list-disc pl-6">
            {section.lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      ))}

      <p className="mt-10 text-sm">This explains the letter. It is not advice about your case.</p>
    </div>
  );
}
