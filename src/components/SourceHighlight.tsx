"use client";

import { useEffect, useRef } from "react";

/**
 * The nearest ancestor that actually scrolls internally, if one exists. The
 * desktop side-by-side layout puts this inside a `position: sticky` column
 * with its own `overflow-y: auto` — and Chromium's native `scrollIntoView`
 * does not reliably scroll a sticky ancestor's own scroll box, so that case
 * is handled by hand. Returns null on mobile, where the column has no
 * internal scroll and the page itself is what needs to move.
 */
function nearestScrollableAncestor(el: Element): HTMLElement | null {
  let node = el.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/**
 * Renders the pasted letter, read-only, with one claim's evidence span
 * highlighted at a time. Always LTR: this shows the original letter exactly
 * as pasted, never the translated transcript.
 *
 * Scrolls the highlight into view the instant it appears. On desktop the two
 * zones sit side by side and this keeps a highlight from landing outside the
 * letter column's own scroll window; on mobile, where the zones stack, it is
 * the whole point — without it a tap produces a highlight the user has to go
 * hunting for below the fold.
 */
export default function SourceHighlight({
  sourceText,
  span,
}: {
  sourceText: string;
  span: { start: number; end: number } | null;
}) {
  const markRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const mark = markRef.current;
    if (!span || !mark) return;

    // Instant, not smooth: Chromium silently drops a smooth scrollTo on a
    // position: sticky element's own overflow box (reproduced directly —
    // behavior: "auto" moves it, "smooth" leaves scrollTop untouched). An
    // instant jump also matches this app's existing rule that motion should
    // only ever serve a purpose, never decorate.
    const scrollParent = nearestScrollableAncestor(mark);
    if (!scrollParent) {
      mark.scrollIntoView({ behavior: "auto", block: "center" });
      return;
    }

    const markRect = mark.getBoundingClientRect();
    const parentRect = scrollParent.getBoundingClientRect();
    const target =
      scrollParent.scrollTop +
      (markRect.top - parentRect.top) -
      scrollParent.clientHeight / 2 +
      markRect.height / 2;
    scrollParent.scrollTo({ top: target, behavior: "auto" });
    // Depend on the offsets, not the span object: LetterInput builds a new
    // object each render, and re-scrolling on every unrelated re-render would
    // fight the user if they scroll manually right after tapping a claim.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [span?.start, span?.end]);

  return (
    <div
      dir="ltr"
      lang="en"
      className="mt-4 whitespace-pre-wrap rounded-md border-2 border-rule bg-paper-raised p-5 text-lg leading-relaxed"
    >
      {span ? (
        <>
          {sourceText.slice(0, span.start)}
          <mark
            ref={markRef}
            className="rounded bg-accent px-1 py-0.5 text-white"
          >
            {sourceText.slice(span.start, span.end)}
          </mark>
          {sourceText.slice(span.end)}
        </>
      ) : (
        sourceText
      )}
    </div>
  );
}
