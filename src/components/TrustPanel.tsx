/**
 * The Span Gate, explained to the person about to paste a letter.
 *
 * Every line here is a literal description of what the code does, not a
 * marketing claim — that constraint is the point. "Every fact is quoted" is
 * F7's tappable source highlighting. "Verified before it's shown" is
 * spanGate.ts, deterministic TypeScript, running before anything reaches
 * either the screen or ElevenLabs. If any of these sentences ever stops
 * being true of the pipeline, this panel is wrong and must change with it.
 *
 * It sits beside the input rather than after the result because the person
 * deciding whether to trust this with their letter is deciding *before* they
 * paste, not after.
 */

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z" />
    </svg>
  );
}

const PROMISES = [
  {
    icon: <ShieldIcon />,
    title: "Only what's in your letter",
    body: "Nothing is added. No dates, amounts or names that your letter does not contain.",
  },
  {
    icon: <QuoteIcon />,
    title: "Every fact is quoted",
    body: "Tap any fact and the exact words it came from light up in your own letter.",
  },
  {
    icon: <CheckIcon />,
    title: "Verified before it's shown",
    body: "Code, not the AI, checks each quote really appears in your letter. Anything it cannot find is thrown away before you see or hear it.",
  },
];

export default function TrustPanel() {
  return (
    <aside
      aria-labelledby="trust-heading"
      className="rounded-2xl border border-rule bg-paper-raised p-6 shadow-card sm:p-8"
    >
      <p className="inline-flex items-center gap-2 rounded-full bg-accent/[0.08] px-3 py-1 text-base font-semibold text-accent-strong">
        <span aria-hidden="true" className="text-accent">
          <ShieldIcon />
        </span>
        Safe and verified
      </p>

      <h2 id="trust-heading" className="mt-4 text-2xl font-semibold tracking-tight">
        Accurate. Verified. In plain language.
      </h2>

      <p className="mt-3 text-ink-soft">
        Two separate AI steps, with a verification layer between them. The first
        pulls out facts and must quote your letter word for word. Code then
        checks every quote is genuinely there. The second step only ever sees
        the quotes that passed — it never sees your letter at all, so it cannot
        invent anything from it.
      </p>

      <ul className="mt-8 flex flex-col gap-6">
        {PROMISES.map((promise) => (
          <li key={promise.title} className="flex gap-4">
            <span
              aria-hidden="true"
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/[0.08] text-accent"
            >
              {promise.icon}
            </span>
            <span>
              <span className="block text-lg font-semibold">{promise.title}</span>
              <span className="mt-1 block text-base text-ink-soft">{promise.body}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex gap-4 border-t border-rule pt-6">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent/[0.08] text-accent"
        >
          <GlobeIcon />
        </span>
        <span>
          <span className="block text-lg font-semibold">Available in</span>
          <span className="mt-1 block text-base text-ink-soft">
            English, Urdu and Spanish — spoken aloud, not just written.
          </span>
        </span>
      </div>
    </aside>
  );
}
