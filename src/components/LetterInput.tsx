"use client";

import { useId, useRef, useState } from "react";
import {
  MAX_LETTER_CHARS,
  MIN_LETTER_CHARS,
  RTL_LANGUAGES,
  type AbsentItem,
  type LocatedClaim,
  type TargetLang,
} from "@/lib/schema";
import type { DroppedClaim } from "@/lib/spanGate";
import AbsentPanel from "./AbsentPanel";
import AudioControls from "./AudioControls";
import SourceHighlight from "./SourceHighlight";

type Status = "idle" | "explaining" | "done" | "error";

type ExplainResponse = {
  script: string;
  documentType: string;
  verified: LocatedClaim[];
  dropped: DroppedClaim[];
  absent: AbsentItem[];
  absentLines: string[];
  meta: { droppedCount: number; extractedCount: number; targetLang: TargetLang };
};

/**
 * Self-names, not English names: a Nastaliq "اردو" is how someone looking
 * for their own language actually recognizes it, faster than reading
 * "Urdu" in a script they may not read.
 */
const LANGUAGE_OPTIONS: Array<{ value: TargetLang; label: string }> = [
  { value: "en", label: "English" },
  { value: "ur", label: "اردو" },
  { value: "es", label: "Español" },
];

export default function LetterInput({ exampleLetter }: { exampleLetter: string }) {
  const textareaId = useId();
  const languageGroupId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [targetLang, setTargetLang] = useState<TargetLang>("en");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<ExplainResponse | null>(null);
  const [submittedText, setSubmittedText] = useState("");
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  const tooShort = text.trim().length < MIN_LETTER_CHARS;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("explaining");
    setErrorMessage("");
    setResult(null);
    setSelectedClaimId(null);
    const trimmed = text.trim();
    setSubmittedText(trimmed);

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, targetLang }),
      });
      const body = await response.json();

      if (!response.ok) {
        setErrorMessage(body?.message ?? "Something went wrong. Try again.");
        setStatus("error");
        return;
      }

      setResult(body as ExplainResponse);
      setStatus("done");
    } catch {
      setErrorMessage("Your device could not reach the server. Check your connection and try again.");
      setStatus("error");
    }
  }

  function useExample() {
    setText(exampleLetter);
    setStatus("idle");
    setResult(null);
    setErrorMessage("");
    setSelectedClaimId(null);
    textareaRef.current?.focus();
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="max-w-[68ch]">
          <label htmlFor={textareaId} className="block text-xl font-semibold">
            Paste your letter here
          </label>
          <p id={`${textareaId}-hint`} className="mt-2 text-ink-soft">
            Type it or paste it. Nothing you paste is saved.
          </p>

          <textarea
            id={textareaId}
            ref={textareaRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            aria-describedby={`${textareaId}-hint`}
            maxLength={MAX_LETTER_CHARS}
            rows={12}
            spellCheck={false}
            className="mt-4 block w-full rounded-md border-2 border-rule bg-paper-raised p-4 text-ink"
          />
        </div>

        {/* One setup row, not two stacked: language on one side, the actions
            on the other, sharing the space instead of language sitting alone
            above a wide gap. Not capped at 68ch like the textarea above —
            this row wants the page's full width to lay the two sides out
            side by side; it wraps to stacked only when it genuinely doesn't
            fit. */}
        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
          <fieldset>
            <legend className="text-lg font-semibold">Language</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {LANGUAGE_OPTIONS.map((option) => {
                const inputId = `${languageGroupId}-${option.value}`;
                return (
                  <label
                    key={option.value}
                    htmlFor={inputId}
                    className="flex min-h-[3rem] cursor-pointer items-center gap-2 rounded-md border-2 border-rule bg-paper-raised px-4 py-2 has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-white"
                  >
                    <input
                      id={inputId}
                      type="radio"
                      name="targetLang"
                      value={option.value}
                      checked={targetLang === option.value}
                      onChange={() => setTargetLang(option.value)}
                      className="h-5 w-5"
                    />
                    <span className="text-lg">{option.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={tooShort || status === "explaining"}
              className="min-h-[3rem] rounded-md bg-accent px-6 py-3 text-lg font-semibold text-white disabled:bg-ink-soft disabled:opacity-60"
            >
              {status === "explaining" ? "Explaining your letter" : "Explain this letter"}
            </button>

            <button
              type="button"
              onClick={useExample}
              className="min-h-[3rem] rounded-md border-2 border-accent px-6 py-3 text-lg font-semibold text-accent"
            >
              Try an example letter
            </button>
          </div>
        </div>

        {tooShort && text.length > 0 && (
          <p className="mt-3 max-w-[68ch] text-ink-soft">
            That is too short to explain. Paste at least {MIN_LETTER_CHARS} characters.
          </p>
        )}
      </form>

      {/* Status is announced, never only shown. No time limit, nothing auto-advances. */}
      <p aria-live="polite" className="sr-only">
        {status === "explaining" ? "Explaining your letter." : ""}
        {status === "done" ? "The letter has been explained." : ""}
      </p>

      {status === "explaining" && (
        <p className="mt-8 max-w-[68ch] text-lg">Explaining your letter. This takes a few seconds.</p>
      )}

      {status === "error" && (
        <p
          role="alert"
          className="mt-8 max-w-[68ch] rounded-md border-2 border-focus bg-paper-raised p-4 text-lg"
        >
          {errorMessage}
        </p>
      )}

      {status === "done" && result && (
        <section aria-labelledby="raw-heading" className="mt-12">
          <h2 id="raw-heading" className="text-2xl font-semibold tracking-tight">
            What your letter says
          </h2>

          {/* Zone 1: read once, top to bottom. Full width of its own —
              nothing shares a row with it. Line length stays comfortable
              even though the page below gets wider. */}
          <div className="mt-5 max-w-[68ch]">
            {/* A new key on every result: a fresh result means fresh audio,
                not the previous letter's clip continuing to play. */}
            <AudioControls key={result.script} script={result.script} />

            {/* The script is the product. RTL applies only to this
                transcript, not the surrounding page — the pasted source
                letter and the rest of the UI stay LTR. A left rule, not a
                boxed card: this is authored text, not a UI panel. */}
            <div
              dir={RTL_LANGUAGES.has(result.meta.targetLang) ? "rtl" : "ltr"}
              lang={result.meta.targetLang}
              className="mt-6 border-l-4 border-accent py-1 pl-6 text-xl leading-relaxed"
            >
              {result.script.split(/\n/).map((line, i) =>
                line.trim() === "" ? null : (
                  <p key={i} className="mt-4 first:mt-0">
                    {line}
                  </p>
                ),
              )}
            </div>
          </div>

          {/* Zone 2: also read once, its own full-width moment — the PRD
              calls this maybe the single most useful screen, so it gets its
              own tinted identity rather than another paper-white card. */}
          <div className="max-w-[68ch]">
            <AbsentPanel
              absent={result.absent}
              absentLines={result.absentLines}
              targetLang={result.meta.targetLang}
            />
          </div>

          {/* Zone 3: the only genuinely interactive pairing, so it's the
              only thing locked side by side. Stacked on mobile, where
              SourceHighlight's own auto-scroll takes over instead. */}
          <div className="mt-12 md:grid md:grid-cols-2 md:items-start md:gap-10">
            <div className="md:sticky md:top-6 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto md:pr-2">
              <h3 className="text-xl font-semibold">Where this came from</h3>
              <p className="mt-2 text-ink-soft">
                Every sentence above was built only from claims traced back to the exact
                words of your letter. Checked {result.meta.extractedCount}{" "}
                {result.meta.extractedCount === 1 ? "claim" : "claims"}, kept{" "}
                {result.verified.length}.{" "}
                {result.meta.droppedCount === 0
                  ? "Nothing was dropped."
                  : `Dropped ${result.meta.droppedCount} that could not be traced to the letter.`}
              </p>

              {/* Tap a claim, its exact words light up beside it in the
                  original letter. Quiet until picked: the accent is spent on
                  the one that's active, not spread evenly across all of
                  them. These labels stay in English — they name the exact
                  words of the original letter, not the translated
                  transcript above, even when Urdu or Spanish is selected. */}
              <div className="mt-5 flex flex-col gap-2" role="group" aria-label="Verified claims">
                {result.verified.map((claim) => {
                  const selected = selectedClaimId === claim.id;
                  const locatable = claim.sourceStart !== null && claim.sourceEnd !== null;
                  return (
                    <button
                      key={claim.id}
                      type="button"
                      aria-pressed={selected}
                      disabled={!locatable}
                      onClick={() => setSelectedClaimId(selected ? null : claim.id)}
                      className="min-h-[3rem] rounded-md border border-rule bg-paper-raised px-4 py-3 text-left text-base text-ink transition-colors hover:border-accent hover:bg-accent/5 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-transparent disabled:text-ink-soft disabled:opacity-60 aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:font-semibold aria-pressed:text-white aria-pressed:hover:bg-accent"
                      title={locatable ? undefined : "The exact location of this claim in the letter could not be pinpointed."}
                    >
                      {claim.statement}
                    </button>
                  );
                })}
              </div>

              <details className="mt-8">
                <summary className="cursor-pointer text-sm text-ink-soft">Technical details</summary>
                <pre className="mt-3 overflow-x-auto rounded-md border border-rule bg-paper-raised p-4 text-sm">
                  {JSON.stringify(
                    {
                      documentType: result.documentType,
                      verified: result.verified,
                      dropped: result.dropped,
                      absent: result.absent,
                      absentLines: result.absentLines,
                    },
                    null,
                    2,
                  )}
                </pre>
              </details>
            </div>

            <div className="mt-10 md:sticky md:top-6 md:mt-0 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto md:pl-2">
              <h3 className="text-xl font-semibold">Original letter</h3>
              <SourceHighlight
                sourceText={submittedText}
                span={
                  selectedClaimId
                    ? (() => {
                        const claim = result.verified.find((c) => c.id === selectedClaimId);
                        return claim && claim.sourceStart !== null && claim.sourceEnd !== null
                          ? { start: claim.sourceStart, end: claim.sourceEnd }
                          : null;
                      })()
                    : null
                }
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
