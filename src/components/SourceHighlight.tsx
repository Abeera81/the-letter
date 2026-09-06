"use client";

/**
 * Renders the pasted letter, read-only, with one claim's evidence span
 * highlighted at a time. Always LTR: this shows the original letter exactly
 * as pasted, never the translated transcript.
 */
export default function SourceHighlight({
  sourceText,
  span,
}: {
  sourceText: string;
  span: { start: number; end: number } | null;
}) {
  if (!span) {
    return (
      <div
        dir="ltr"
        lang="en"
        className="mt-4 whitespace-pre-wrap rounded-md border-2 border-rule bg-paper-raised p-5 text-lg leading-relaxed"
      >
        {sourceText}
      </div>
    );
  }

  const before = sourceText.slice(0, span.start);
  const match = sourceText.slice(span.start, span.end);
  const after = sourceText.slice(span.end);

  return (
    <div
      dir="ltr"
      lang="en"
      className="mt-4 whitespace-pre-wrap rounded-md border-2 border-rule bg-paper-raised p-5 text-lg leading-relaxed"
    >
      {before}
      <mark className="rounded bg-accent/30 px-0.5 text-ink underline decoration-accent decoration-2 underline-offset-2">
        {match}
      </mark>
      {after}
    </div>
  );
}
