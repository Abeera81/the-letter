# MEMORY.md — The Letter

Durable project state. Update at the end of every session. The next session starts here.

---

## Current status
**Phase:** P1 — code complete, gate NOT yet passed (needs a live Gemini call)
**Next action:** add GEMINI_API_KEY to .env.local, run fixture 1 through /api/explain,
confirm schema-valid claims come back. Then P2 (Span Gate).
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

## KNOWN HOLE IN THE SPAN GATE — decide before P3 ships
Found at P2 by corrupting live claims and measuring. The exact-match path is sound;
the **token-overlap fallback is weaker than the Tech Design intends**.

It compares the evidence against the source's whole word SET, ignoring word order and
position. Measured on fixture 1:

| corruption | overlap | outcome |
|---|---|---|
| short quote, "September 26, 2026" -> "October 15, 2026" (12 words) | 0.833 | correctly DROPPED |
| long quote, "thirty days" -> "sixty days" (26 words) | 0.962 | **wrongly KEPT** |
| long quote, "ninety days" -> "thirty days" (21 words) | 1.000 | **wrongly KEPT** — "thirty" occurs elsewhere in the letter |

One invented word in a long quote is ~4% of its tokens, which clears a 0.90 bar. And a
set test cannot tell that "thirty" came from a different sentence. This is precisely the
harm PRD 5.2 forbids: an invented date or amount reaching a user who cannot check it.

**Proposed fix (prototyped and measured, awaiting approval):**
1. Compare against the best-matching CONTIGUOUS window of source words, positionally,
   instead of a document-wide set. Drops the fabricated-approval case from 0.636 to
   0.182 and the "ninety->thirty" case from 1.000 to 0.952.
2. Add a numeric guard: if any token that carries a number, date, or amount mismatches
   inside that window, drop regardless of ratio. Number-words ("ninety", "thirty") count.

Together these drop all three corruptions above and keep all six genuine live claims,
which match exactly at 1.0 and never touch the fallback at all.

## Open questions
- iOS Safari autoplay behaviour after the submit gesture — verify on a real device at P4.
- Urdu RTL transcript layout at 360px — verify at P5, not later.

## Session log
| Date | Phase | What shipped | Next |
|---|---|---|---|
| 2026-09-05 | P0 | Next 16 + React 19 + TS + Tailwind 4 + Zod 4 skeleton, Vitest on the node env, four synthetic fixtures, accessibility floor in globals.css, privacy statement on the page | Connect Vercel |
| 2026-09-05 | P1 | normalize.ts, schema.ts (Zod + generated JSON Schema), gemini.ts extraction call, /api/explain, LetterInput with example-letter empty state, raw JSON on screen. 29 tests green. | Live Gemini call to pass the P1 gate |
| 2026-09-05 | P2 | spanGate.ts (94 lines, no model), 13 gate tests, wired into /api/explain, drop count surfaced in the UI. Live run on gemini-3.5-flash: 6 claims, 0 dropped, all matched by exact normalized substring. Four corruptions all dropped. Found the overlap-fallback hole above. | Decide the fallback fix, then P3 |
| 2026-09-05 | P1 gate closed | Fixture 1 ran live, first attempt, no retry: 6 claims, 3 absent items. All 6 evidence fields were byte-exact substrings of the raw fixture, line breaks preserved. No eligibility or advice language in any statement. Absent list correctly omitted deadline/reason/appeal_route, all of which the letter does contain. | P2 Span Gate |
