# MEMORY.md — The Letter

Durable project state. Update at the end of every session. The next session starts here.

---

## Current status
**Phase:** P3 committed — rendering call shipped, one item needs same-model live
confirmation. See "OPEN: fixture-2 fix needs same-model verification" below.
**Next action:** budget-permitting, one live call against gemini-3.5-flash on fixture 2
to confirm the `explanation` absent field actually fires on the shipped model, THEN P4.
**Deadline:** 2026-09-07 06:59 UTC (11:59 AM PKT)

## Decisions locked (do not relitigate)
- Recipient-side, not donor-side. The user is holding an envelope, not a wallet.
- Span Gate is non-negotiable and is the competition differentiator.
- Gemini call #2 never receives the source letter.
- No database, no auth, no persistence — deliberate product decisions.
- Prize categories: ElevenLabs (primary), Google AI (secondary). Not Snowflake, not Solana.
- Languages: English, Urdu, Spanish. Urdu is first-class, not decorative.
- Paste is the primary input path. Photo/OCR is stretch-only and must never become primary.

## To record as you go
- Exact Gemini model identifier used (verified against docs, not memory):
  **`gemini-3.5-flash`** — checked against ai.google.dev/gemini-api/docs/models on
  2026-09-05. The Flash tier now runs a 3.x series (3.8 / 3.7 / 3.6 / 3.5, plus lites);
  2.5-flash still exists but is the older generation.
  **Chosen over `gemini-3.8-flash` deliberately.** Two days from the deadline, the newest
  model in a series is where undocumented quirks live, and 3.5-flash is recent enough to
  stand up for the Google AI category. Do not "upgrade" this without a reason.
- Exact ElevenLabs model identifier used: _TBD at P4_
- ElevenLabs voice ID chosen + why (this is submission-post material): _TBD at P4_
- Any open-source code borrowed (must be credited in the post): _none yet_

## Verified library facts (do not re-derive from memory)
- `@google/genai` **2.21.0** uses a new **`client.interactions.create()`** API, NOT the
  older `models.generateContent`. Confirmed by reading `dist/genai.d.ts`, not from memory.
  - Shape: `{ model, system_instruction, input, response_format: { type: "text",
    mime_type: "application/json", schema } }`
  - Response text is `interaction.output_text`.
  - Top-level `response_mime_type` and `response_modalities` are deprecated.
- Zod 4 `z.toJSONSchema()` emits a `$schema` key; it is stripped before the schema is
  sent to Gemini.
- **ESLint pinned to 9.x.** `eslint-config-next@16` bundles an `eslint-plugin-react`
  that crashes on ESLint 10 (`contextOrFilename.getFilename is not a function`).
- Next 16 rewrites a managed block into `AGENTS.md` on `next dev`. It is genuine
  (`node_modules/next/dist/server/lib/generate-agent-files.js`) and is committed so the
  tree stays clean. Next 16 docs ship in `node_modules/next/dist/docs/`.
- Backslash-u escapes written into source through the agent tooling land as literal
  invisible characters. `src/lib/normalize.ts` therefore builds its character classes
  from numeric code points. Keep it that way.

## Constraints carried forward to later phases
- **P3 rendering — do not turn reporting into advice.** Fixture 1 produced claim c6:
  "A fair hearing may be requested within ninety days ... if there is disagreement",
  quoting the letter verbatim. That is neutral reporting of an option the letter states,
  and it is allowed. It must never be rendered as a recommendation to appeal — not
  "you should appeal", not "you can fight this", not framing the hearing as the
  expected next step. PRD 5.2 forbids recommending appealing, not appealing, or any
  legal strategy. The rendering prompt must state this explicitly, and the phrasing
  needs checking against real output, because the drift is subtle and one word wide.

## Why the Span Gate uses windowed matching (submission-post material)
The first implementation followed Tech Design v1: exact normalized substring match, then
a token-overlap fallback at 0.90 against the source's whole word SET. It passed every
unit test. It was still wrong, and the corruption testing at P2 is what found it.

A set comparison ignores word order and position, so a quote can be assembled from words
scattered anywhere in the letter. Measured against real Gemini output on fixture 1:

| corruption | whole-set overlap | outcome |
|---|---|---|
| 12-word quote, "September 26, 2026" -> "October 15, 2026" | 0.833 | correctly dropped |
| 26-word quote, "thirty days" -> "sixty days" | 0.962 | **wrongly KEPT** |
| 21-word quote, "ninety days" -> "thirty days" | **1.000** | **wrongly KEPT** |
| fabricated "your application has been approved" | 0.636 | dropped, but only just |

The 1.000 is the one to tell in the post: "thirty" appeared in an unrelated sentence of
the letter, so a set test could not tell the number had been moved into a place it never
occupied. And one invented word inside a long quote is only ~4% of its tokens, which
clears a 0.90 bar on score alone. The gate would have spoken an invented deadline to
someone who could not read the letter to catch it — the exact harm the project exists
to prevent.

**Replaced with (shipped at P2):**
1. **Windowed matching** — compare the evidence against the best-matching CONTIGUOUS run
   of source words, position by position. Fabricated-approval fell 0.636 -> 0.182;
   "ninety->thirty" fell 1.000 -> 0.952.
2. **A numeric guard that overrides the ratio** — any positional mismatch on a token
   carrying a number, date or amount drops the claim outright, however well the rest
   scores. Number-words count, because these letters write "within ninety days", not 90.

Windowing alone was not enough: both single-number swaps still scored above 0.90 after
it. The guard alone was not enough either: "ninety->thirty" still passed, because
"thirty" is somewhere in the document. Both were needed, which is why the full fix
shipped rather than half of it.

All six genuine live claims match exactly at 1.0 and never touch the fallback at all.
The `ninety->thirty` and fabricated-approval cases are permanent regression tests in
`src/lib/spanGate.test.ts`. Do not delete them.

## OPEN: fixture-2 fix needs same-model live confirmation
Do this FIRST next session, before anything else, budget permitting (see the API budget
rule below — this is exactly the kind of "genuinely needs a fresh call" case it allows).

At P3, fixture 2's absent-info gap ("the letter does not explain what this charge is
for") had no schema field to land in — `reason` only covers why an ACTION was taken.
Added `explanation` as its own ABSENT_FIELDS value and sharpened the extraction prompt
with a concrete example matching fixture 2's own "DETAIL OF CHARGES" line items.

**This was never confirmed live on the shipped model (`gemini-3.5-flash`).** The
20-requests/day quota ran out mid-verification — see the incident below. The only signal
gathered was a diagnostic run against `gemini-2.5-flash` (a separate quota bucket, NOT
the shipped model), which does not honor structured output cleanly (wraps JSON in a
markdown fence) but did spontaneously produce the phrase "explanation for charges
(beyond category)" in free text — evidence the prompt wording communicates the right
concept, not proof the schema-conformant version works on 3.5-flash.

Risk is judged small: nothing is built on top of this yet, and the fair-hearing ordering
fix from the same P3 session IS live-verified and unaffected. Committed anyway rather
than burn ~half a day's budget waiting for the quota to reset. First live call next
session should be exactly this: run fixture 2 through /api/explain, confirm
`absent` includes `{ field: "explanation", ... }`. If it doesn't fire, strengthen the
extraction prompt further before touching anything else.

## INCIDENT: ran the Gemini free-tier quota dry mid-P3
`gemini-3.5-flash` free tier is **20 requests/day per project**, resetting at midnight
Pacific (confirmed against ai.google.dev/gemini-api/docs/rate-limits, not assumed). A new
API key does not help — the cap is per-project, not per-key. Repeated live re-runs and
corruption checks across P2 and P3 burned through it mid-verification of the fixture-2
fix, forcing the tradeoff logged above. **New standing rule, also in AGENTS.md: budget
live calls.** Verify against saved model output where possible; spend a live call only
on the one or two things that genuinely need a fresh one.

## Open questions
- iOS Safari autoplay behaviour after the submit gesture — verify on a real device at P4.
- Urdu RTL transcript layout at 360px — verify at P5, not later.

## Session log
| Date | Phase | What shipped | Next |
|---|---|---|---|
| 2026-09-05 | P0 | Next 16 + React 19 + TS + Tailwind 4 + Zod 4 skeleton, Vitest on the node env, four synthetic fixtures, accessibility floor in globals.css, privacy statement on the page | Connect Vercel |
| 2026-09-05 | P1 | normalize.ts, schema.ts (Zod + generated JSON Schema), gemini.ts extraction call, /api/explain, LetterInput with example-letter empty state, raw JSON on screen. 29 tests green. | Live Gemini call to pass the P1 gate |
| 2026-09-05 | P2 | spanGate.ts (94 lines, no model), 13 gate tests, wired into /api/explain, drop count surfaced in the UI. Live run on gemini-3.5-flash: 6 claims, 0 dropped, all matched by exact normalized substring. Four corruptions all dropped. Found the overlap-fallback hole above. | Decide the fallback fix, then P3 |
| 2026-09-05 | Span Gate fix | Windowed matching + numeric guard, replacing the whole-word-set overlap. Live-verified on fixtures 1 and 2 (6/6, 4/4 kept, 0 false drops) plus a 6-case corruption sweep, all correctly dropped. 45 tests green. | Continue to P3 |
| 2026-09-05 | P3 | render.ts (Gemini call #2, never receives the letter), prompt isolation test asserted against the full serialized request body, fixed footer appended by code, wired into /api/explain. Fair-hearing-vs-action-step ordering fixed and live-verified on fixture 1. Added the `explanation` absent field for fixture 2's schema gap — NOT yet live-confirmed on gemini-3.5-flash, see OPEN item above. Ran the daily API quota dry mid-verification — see INCIDENT above. 60 tests green. | Live-confirm the explanation field (budget permitting), then P4 |
| 2026-09-05 | P1 gate closed | Fixture 1 ran live, first attempt, no retry: 6 claims, 3 absent items. All 6 evidence fields were byte-exact substrings of the raw fixture, line breaks preserved. No eligibility or advice language in any statement. Absent list correctly omitted deadline/reason/appeal_route, all of which the letter does contain. | P2 Span Gate |
