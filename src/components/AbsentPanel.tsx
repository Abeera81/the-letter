import { RTL_LANGUAGES, type AbsentItem, type TargetLang } from "@/lib/schema";

/**
 * "The letter does not say" — PRD §5.1.
 *
 * Called out in the PRD as possibly the single most useful screen in the
 * product: it tells someone exactly what to ask about when they call. Shown
 * in the language the user chose, not the letter's own language — `absent`
 * (from extraction, always source-language) exists here only as a length
 * reference and a fallback; `absentLines` (from rendering, translated, one
 * entry per absent item, in order) is what actually renders.
 *
 * render.ts refuses to return a mismatched pair — a length difference
 * between these two arrays fails the whole request closed before it ever
 * reaches this component. That guarantee is what makes indexing them
 * together here safe.
 */
export default function AbsentPanel({
  absent,
  absentLines,
  targetLang,
}: {
  absent: AbsentItem[];
  absentLines: string[];
  targetLang: TargetLang;
}) {
  if (absent.length === 0) return null;

  const rtl = RTL_LANGUAGES.has(targetLang);

  return (
    <section aria-labelledby="absent-heading" className="mt-10 rounded-2xl bg-accent/[0.06] p-6 sm:p-8">
      <h3 id="absent-heading" className="text-xl font-semibold text-accent-strong">
        The letter does not say
      </h3>
      <ul
        dir={rtl ? "rtl" : "ltr"}
        lang={targetLang}
        className="mt-4 list-disc space-y-2 pl-6 text-lg"
      >
        {absentLines.map((line, i) => (
          <li key={absent[i]?.field ?? i}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
