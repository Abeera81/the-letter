# The Letter

Paste the letter you're afraid of. Hear what it actually says.

*(Starter README — expand at P11. Judges will read this. It should explain the Span Gate,
credit any borrowed open-source code, and note any post-deadline commits.)*

## What it does

Takes an official letter someone can't read — a benefits denial, a clinic bill, a housing
notice — and speaks back, in their language, only what the letter actually says, what the
deadline is, and what to do next.

## How it refuses to lie

Two model calls with a deterministic gate between them:

1. **Extract** — Gemini returns claims, each carrying a verbatim quote from the letter.
2. **The Span Gate** — plain TypeScript confirms each quote genuinely appears in the source.
   Anything unverifiable is deleted before it is ever spoken.
3. **Render** — a second Gemini call rewrites the surviving claims in plain language.
   **This call never receives the letter.** It cannot invent letter content because it has
   never read it.
4. **Speak** — ElevenLabs reads it aloud, with slow replay for anyone who needs it.

See `src/lib/spanGate.ts`.

## What it will not do

It never states or implies whether you qualify for anything. It never recommends appealing.
It never adds a date, amount, or phone number that isn't in your letter. Every result ends
with the same line, written by code and not by a model:

> This explains the letter. It is not advice about your case.

## Privacy

Nothing you paste is stored. No database, no accounts, no logs of letter content.

## Run locally

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY, ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID
npm run dev
```

## Built for

DEV Weekend Challenge: Generosity Edition — Best Use of ElevenLabs, Best Use of Google AI.
