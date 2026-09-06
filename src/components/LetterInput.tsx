"use client";

import { useId, useRef, useState } from "react";
import {
  MAX_LETTER_CHARS,
  MIN_LETTER_CHARS,
  type AbsentItem,
  type Claim,
  type TargetLang,
} from "@/lib/schema";
import type { DroppedClaim } from "@/lib/spanGate";
import AudioControls from "./AudioControls";

type Status = "idle" | "explaining" | "done" | "error";

type ExplainResponse = {
  script: string;
  documentType: string;
  verified: Claim[];
  dropped: DroppedClaim[];
  absent: AbsentItem[];
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

/** PRD §8 / Tech Design §7: the transcript reads right-to-left only for Urdu. */
const RTL_LANGUAGES: ReadonlySet<TargetLang> = new Set(["ur"]);

export default function LetterInput({ exampleLetter }: { exampleLetter: string }) {
  const textareaId = useId();
  const languageGroupId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [targetLang, setTargetLang] = useState<TargetLang>("en");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<ExplainResponse | null>(null);

  const tooShort = text.trim().length < MIN_LETTER_CHARS;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("explaining");
    setErrorMessage("");
    setResult(null);

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), targetLang }),
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
    textareaRef.current?.focus();
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
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

        <fieldset className="mt-5">
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

        <div className="mt-5 flex flex-wrap gap-3">
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

        {tooShort && text.length > 0 && (
          <p className="mt-3 text-ink-soft">
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
        <p className="mt-8 text-lg">Explaining your letter. This takes a few seconds.</p>
      )}

      {status === "error" && (
        <p role="alert" className="mt-8 rounded-md border-2 border-focus bg-paper-raised p-4 text-lg">
          {errorMessage}
        </p>
      )}

      {status === "done" && result && (
        <section aria-labelledby="raw-heading" className="mt-10">
          <h2 id="raw-heading" className="text-xl font-semibold">
            What your letter says
          </h2>

          {/* A new key on every result: a fresh result means fresh audio, not
              the previous letter's clip continuing to play. */}
          <div className="mt-4">
            <AudioControls key={result.script} script={result.script} />
          </div>

          {/* The script is the product. Everything below it is the evidence.
              RTL applies only to this transcript, not the surrounding page —
              the pasted source letter and the rest of the UI stay LTR. */}
          <div
            dir={RTL_LANGUAGES.has(result.meta.targetLang) ? "rtl" : "ltr"}
            lang={result.meta.targetLang}
            className="mt-6 rounded-md border-2 border-accent bg-paper-raised p-5 text-xl leading-relaxed"
          >
            {result.script.split(/\n/).map((line, i) =>
              line.trim() === "" ? null : (
                <p key={i} className="mt-4 first:mt-0">
                  {line}
                </p>
              ),
            )}
          </div>

          <h3 className="mt-10 text-lg font-semibold">Where this came from</h3>
          <p className="mt-2 text-ink-soft">
            Every sentence above was built only from claims traced back to the exact
            words of your letter.
          </p>

          <p className="mt-4 rounded-md border-2 border-rule bg-paper-raised p-4">
            Checked {result.meta.extractedCount}{" "}
            {result.meta.extractedCount === 1 ? "claim" : "claims"}. Kept{" "}
            {result.verified.length}.{" "}
            {result.meta.droppedCount === 0
              ? "Nothing was dropped."
              : `Dropped ${result.meta.droppedCount} that could not be traced to the letter.`}
          </p>

          <pre className="mt-4 overflow-x-auto rounded-md border-2 border-rule bg-paper-raised p-4 text-base">
            {JSON.stringify(
              {
                documentType: result.documentType,
                verified: result.verified,
                dropped: result.dropped,
                absent: result.absent,
              },
              null,
              2,
            )}
          </pre>
        </section>
      )}
    </div>
  );
}
