"use client";

import { useId, useRef, useState } from "react";
import { MAX_LETTER_CHARS, MIN_LETTER_CHARS, type ExtractionResult } from "@/lib/schema";

type Status = "idle" | "reading" | "done" | "error";

type ExplainResponse = {
  extraction: ExtractionResult;
  meta: { targetLang: string };
};

export default function LetterInput({ exampleLetter }: { exampleLetter: string }) {
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [result, setResult] = useState<ExplainResponse | null>(null);

  const tooShort = text.trim().length < MIN_LETTER_CHARS;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("reading");
    setErrorMessage("");
    setResult(null);

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // P5 adds the language selector. Until then this path is English.
        body: JSON.stringify({ text: text.trim(), targetLang: "en" }),
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

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={tooShort || status === "reading"}
            className="min-h-[3rem] rounded-md bg-accent px-6 py-3 text-lg font-semibold text-white disabled:bg-ink-soft disabled:opacity-60"
          >
            {status === "reading" ? "Reading the letter" : "Read this letter to me"}
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
            That is too short to read. Paste at least {MIN_LETTER_CHARS} characters.
          </p>
        )}
      </form>

      {/* Status is announced, never only shown. No time limit, nothing auto-advances. */}
      <p aria-live="polite" className="sr-only">
        {status === "reading" ? "Reading the letter." : ""}
        {status === "done" ? "The letter has been read." : ""}
      </p>

      {status === "reading" && (
        <p className="mt-8 text-lg">Reading the letter. This takes a few seconds.</p>
      )}

      {status === "error" && (
        <p role="alert" className="mt-8 rounded-md border-2 border-focus bg-paper-raised p-4 text-lg">
          {errorMessage}
        </p>
      )}

      {status === "done" && result && (
        <section aria-labelledby="raw-heading" className="mt-10">
          <h2 id="raw-heading" className="text-xl font-semibold">
            What the letter says, as extracted
          </h2>
          <p className="mt-2 text-ink-soft">
            This is the raw result of the extraction step, before verification and
            before it is rewritten in plain words. Both of those come next.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-md border-2 border-rule bg-paper-raised p-4 text-base">
            {JSON.stringify(result.extraction, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
