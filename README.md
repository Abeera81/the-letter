# The Letter

**Paste the letter you're afraid of. Hear what it actually says.**

**Live:** https://the-letter-one.vercel.app/

Built for the [DEV Weekend Challenge: Generosity Edition](https://dev.to/challenges/weekend-2026-09-03).

---

## What it does

Takes an official letter someone can't read (a benefits denial, a clinic bill, a housing
notice) and speaks back, in their language, only what the letter actually says: what
happened, what the deadline is, and what they're being asked to bring.

Then it tells them what the letter *doesn't* say (no phone number, no named contact),
which is the list of things to ask about when they call.

The user is not a donor. They're a person holding an envelope they're afraid of. Aid
doesn't usually fail at eligibility; it fails at comprehension. The money is already
appropriated. It stops at a sheet of paper.

## How it refuses to lie

Every sentence this app speaks must be traceable to a verbatim span in the source letter,
verified by deterministic TypeScript, not by a model promising it was faithful.

1. **Extract** (Gemini call #1) returns strict JSON. Every claim must carry an
   `evidence` field holding a **verbatim quote** from the letter.
2. **The Span Gate** ([`src/lib/spanGate.ts`](src/lib/spanGate.ts)) is plain TypeScript
   with **no model in it**, and confirms each quote genuinely appears in the source.
   Anything it can't find is **deleted** before it is ever spoken.
3. **Render** (Gemini call #2) rewrites the surviving claims in plain language, in the
   target language. **This call never receives the letter.** It cannot invent letter
   content because it has never read it. That guarantee is enforced by the shape of the
   function, and asserted by a test that plants a sentinel string in the source and proves
   it appears nowhere in the outgoing request.
4. **Speak.** ElevenLabs reads it aloud, with 0.7× slow replay one tap away.

The gate does two non-obvious things, both of which exist because the naive version was
wrong:

- It matches the evidence against the best **contiguous** run of source words, position by
  position, not against the whole word set. A set comparison has no concept of *where* a
  word sits, and scored a quote with a changed deadline at a perfect 1.000.
- A **numeric guard overrides the ratio**. If a number or date isn't where the quote
  claims it is, the claim fails outright however well the rest of it scores. Spelled-out
  numbers count, because these letters write *"within ninety days"*, not *"within 90 days"*.

Letter text is treated as **untrusted data, never instructions**. A hostile fixture
carrying a prompt-injection payload
([`fixtures/04-hostile-injection.txt`](fixtures/04-hostile-injection.txt)) is a permanent
part of the test suite.

## What it will not do

It never states or implies whether you qualify for anything. It never recommends appealing
or not appealing. It never adds a date, amount, name, or phone number that isn't in your
letter. It **fails closed**: if verification leaves nothing behind, you get a clear error,
never a half-explained benefits letter.

Every result ends with the same line, written by code and not by a model:

> This explains the letter. It is not advice about your case.

That footer is hand-translated and hardcoded in all three languages. A test asserts the
model is never even *asked* for it.

## Accessibility

Treated as a build requirement, not a polish pass, because the user may not be able to
read: WCAG 2.2 AA contrast, full keyboard operation with visible focus, 48×48px minimum
touch targets, operable at 200% zoom and 360px width, `prefers-reduced-motion` respected,
no time limits, and an 18px body-text floor.

## Privacy

Nothing you paste is stored, logged, or written to disk, including in error logs. No
database, no accounts, no cookies, no `localStorage`. That's also why the app has no
navigation at all. API keys are server-side only; both routes are rate-limited per IP.

## Run locally

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
npm run dev
```

```bash
npm run test    # 121 tests across 12 files
npm run build
npm run lint
```

## Credits

**No borrowed open-source code.** Every line of application code in `src/` was written for
this challenge. There is no vendored code, no `third_party/` directory, no copied snippet,
and no adapted implementation from another project.

The dependencies are standard libraries, consumed as published packages rather than copied
in: Next.js, React, TypeScript, Tailwind CSS, Zod, Vitest, ESLint, PostCSS, and Google's
`@google/genai` SDK. Full list in [`package.json`](package.json), exact versions in
`package-lock.json`.

Worth noting explicitly, since these are the usual places uncredited code hides:

- **ElevenLabs** is called over plain `fetch` against the documented REST API. No SDK, no
  wrapper library, no copied client.
- **Icons** are hand-written inline SVG. No icon library.
- **Fonts** are the OS system stack (`ui-sans-serif, system-ui, …`). No webfont is loaded
  or bundled.
- **The Span Gate** is original. It is not a fork or adaptation of an existing
  fuzzy-matching or citation-verification library.

Voice: **Eric** (`cjVigY5qzO86Huf0OWal`, "Smooth, Trustworthy") from the ElevenLabs public
voice library, via `eleven_multilingual_v2`. Chosen from seven auditions across two rounds,
each reading the same real line of bad news.

The four letters in `fixtures/` are synthetic. They contain no real person, case, or
address.

## Challenge window

All code in this repository was written inside the challenge window. First commit:
**5 September 2026**. No pre-existing project was imported and no personal boilerplate was
copied in.

**Post-deadline commits:** none. *(If any commit lands after the deadline of 2026-09-07
06:59 UTC, it will be listed here with its hash and what it changed.)*

## Built for

DEV Weekend Challenge: Generosity Edition. **Best Use of ElevenLabs**, **Best Use of
Google AI**.

Remove the voice and this product ceases to exist for the person it's built for. Gemini is
used twice and constrained differently each time: once with structured output and a hard
verbatim-evidence requirement, verified by an external deterministic gate that can overrule
it, and once deliberately blinded to the source document.
