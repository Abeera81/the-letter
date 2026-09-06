"use client";

import { useEffect, useRef, useState } from "react";

type Status = "idle" | "loading" | "playing" | "blocked" | "error";

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
 * A second, unplanned exception showed up on iOS Safari during P4
 * verification: by the time this component calls `audio.play()`, the
 * original submit tap is two network round trips removed from it
 * (explain, then speak). Safari's autoplay policy does not treat that as
 * "still following a user gesture" the way desktop Chrome apparently does,
 * and `play()` rejects. That case gets its own status — "blocked" — rather
 * than being folded into "error": the audio loaded fine, nothing failed,
 * the browser is just withholding autoplay. The fix is the same one as
 * reduced-motion: let the user tap Play themselves.
 *
 * Loading the audio and playing it are therefore two separate try/catch
 * blocks. Collapsing them into one is what caused the original bug: a
 * Safari autoplay rejection got mislabeled as "your device could not reach
 * the server," which sent a real user chasing a network problem that never
 * existed.
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

    async function load() {
      setStatus("loading");
      setErrorMessage("");

      // Stage one: fetch and prepare the audio. Failures here are genuinely
      // about reaching the server or getting a usable response.
      let audio: HTMLAudioElement;
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

        audio = new Audio(url);
        audio.playbackRate = slow ? 0.7 : 1;
        audio.addEventListener("ended", () => setStatus("idle"));
        audioRef.current = audio;
      } catch {
        if (!cancelled) {
          setErrorMessage("Your device could not reach the server. Check your connection and try again.");
          setStatus("error");
        }
        return;
      }

      if (prefersReducedMotion) {
        setStatus("idle");
        return;
      }

      // Stage two: attempt autoplay. A rejection here is not a failure of
      // anything this app controls — it is the browser's own policy — so it
      // is never shown as an error. The audio is ready; only the automatic
      // start was declined.
      try {
        await audio.play();
        if (!cancelled) setStatus("playing");
      } catch {
        if (!cancelled) setStatus("blocked");
      }
    }

    load();

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

  async function play() {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      await audio.play();
      setStatus("playing");
    } catch {
      // A direct tap is about as strong a user gesture as exists, so this
      // should not happen — but if the browser still declines, say so
      // plainly rather than silently claiming to be playing.
      setStatus("blocked");
    }
  }

  function toggleSlow() {
    const next = !slow;
    setSlow(next);
    if (audioRef.current) audioRef.current.playbackRate = next ? 0.7 : 1;
  }

  return (
    <div>
      {/* flex + gap, not adjacent inline-block buttons with only a vertical
          margin between them: at sm+, where Play/Stop shrinks to its own
          width, the two buttons would otherwise sit on the same line with no
          horizontal space between them at all — cramped and easy to mis-tap. */}
      <div className="flex flex-wrap items-start gap-4">
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
          className="min-h-[3rem] rounded-md border-2 border-accent px-5 py-3 text-lg font-semibold text-accent"
        >
          {slow ? "Normal speed" : "Slow replay"}
        </button>
      </div>

      <p aria-live="polite" className="sr-only">
        {status === "loading" ? "Loading voice." : ""}
        {status === "playing" ? "Playing." : ""}
        {status === "blocked" ? "Voice is ready. Press play to hear it." : ""}
      </p>

      {status === "blocked" && (
        <p className="mt-3 text-ink-soft">
          Your browser needs a tap before it will play sound. The voice is
          ready — press play above.
        </p>
      )}

      {status === "error" && (
        <p role="alert" className="mt-3 rounded-md border-2 border-focus bg-paper-raised p-4">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
