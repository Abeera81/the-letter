"use client";

import { useEffect, useRef, useState } from "react";

type Status = "idle" | "loading" | "playing" | "paused" | "error";

/**
 * Voice playback for the rendered script.
 *
 * Auto-plays on arrival, per PRD §7 — audio follows the submit click in the
 * same task chain, which is what lets browsers allow it without a further
 * gesture. The one exception: a visitor whose browser reports
 * prefers-reduced-motion never gets audio started for them automatically.
 * Unexpected sound is the audio equivalent of unexpected motion for someone
 * already in a stressed state, and the full script is already on screen, so
 * nothing is lost by making them tap play themselves.
 *
 * Stop is deliberately the largest, first-reached control (Tech Design §7).
 * If voice fails, the explanation text above is already complete and
 * verified — a silent page is a degraded feature, not a degraded
 * explanation, so it never blocks reading.
 */
export default function AudioControls({ script }: { script: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    async function loadAndMaybePlay() {
      setStatus("loading");
      setErrorMessage("");

      try {
        const response = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ script }),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          if (cancelled) return;
          setErrorMessage(body?.message ?? "The voice could not be loaded.");
          setStatus("error");
          return;
        }

        const blob = await response.blob();
        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audio.playbackRate = slow ? 0.7 : 1;
        audio.addEventListener("ended", () => setStatus("idle"));
        audioRef.current = audio;

        if (prefersReducedMotion) {
          setStatus("idle");
          return;
        }

        await audio.play();
        if (!cancelled) setStatus("playing");
      } catch {
        if (!cancelled) {
          setErrorMessage("Your device could not reach the server. Check your connection and try again.");
          setStatus("error");
        }
      }
    }

    loadAndMaybePlay();

    return () => {
      cancelled = true;
      audioRef.current?.pause();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
    // The script this loads for never changes without a new result arriving,
    // and a new result unmounts and remounts this component with a new key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stop() {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.currentTime = 0;
    setStatus("idle");
  }

  function play() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play();
    setStatus("playing");
  }

  function toggleSlow() {
    const next = !slow;
    setSlow(next);
    if (audioRef.current) audioRef.current.playbackRate = next ? 0.7 : 1;
  }

  return (
    <div>
      {/* The single largest control on the page. */}
      {status === "playing" ? (
        <button
          type="button"
          onClick={stop}
          className="min-h-[3.5rem] w-full rounded-md bg-accent px-6 py-4 text-xl font-semibold text-white sm:w-auto"
        >
          Stop
        </button>
      ) : (
        <button
          type="button"
          onClick={play}
          disabled={status === "loading" || status === "error"}
          className="min-h-[3.5rem] w-full rounded-md bg-accent px-6 py-4 text-xl font-semibold text-white disabled:opacity-60 sm:w-auto"
        >
          {status === "loading" ? "Loading voice…" : "Play"}
        </button>
      )}

      <button
        type="button"
        onClick={toggleSlow}
        aria-pressed={slow}
        className="mt-3 min-h-[3rem] rounded-md border-2 border-accent px-5 py-3 text-lg font-semibold text-accent"
      >
        {slow ? "Normal speed" : "Slow replay"}
      </button>

      <p aria-live="polite" className="sr-only">
        {status === "loading" ? "Loading voice." : ""}
        {status === "playing" ? "Playing." : ""}
      </p>

      {status === "error" && (
        <p role="alert" className="mt-3 rounded-md border-2 border-focus bg-paper-raised p-4">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
