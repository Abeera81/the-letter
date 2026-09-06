# MEMORY.md — The Letter

Durable project state. Update at the end of every session. The next session starts here.

---

## Current status
**Phase:** P5 CLOSED. Native Urdu speaker (the user) signed off explicitly: translation
natural, no awkward phrasing, footer reads correctly, fair-hearing line does not read
as advice. This was a real review, not a rubber stamp — see "RESOLVED: native Urdu
sign-off" below for what was actually checked.
**Next action:** P6 — the "letter does not say" panel (PRD F8). Also folds in closing
the long-open P3 item: fixture 2's `explanation` field has never been confirmed live on
the shipped model, and P6's own gate (fixture 2 surfaces the missing explanation) is
the same question, so it gets answered as part of this phase rather than separately.
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
- Exact ElevenLabs model identifier used: **`eleven_multilingual_v2`** — the documented
  default, verified against elevenlabs.io/docs/api-reference/text-to-speech/convert on
  2026-09-05. Chosen because it's the multilingual model, needed for the Urdu and
  Spanish paths at P5 with the same voice.
- ElevenLabs voice ID chosen + why (this is submission-post material): **Eric**
  (`cjVigY5qzO86Huf0OWal`), catalog label "Smooth, Trustworthy". See "VOICE CHOSEN"
  below for the full audition story.
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

## VOICE CHOSEN (submission-post material): Eric
**`ELEVENLABS_VOICE_ID = cjVigY5qzO86Huf0OWal`** — Eric, ElevenLabs' premade catalog
label: "Smooth, Trustworthy" (american, conversational, middle-aged).

Auditioned 7 voices across two rounds, all reading the same real line from fixture 1's
rendered script — "Your Supplemental Nutrition Assistance Program case has been
administratively closed..." — so every candidate was judged delivering actual bad news,
not a neutral sample line.

Round 1 (picked by label — "calm" / "reassuring" / "comforting" were the closest matches
in the account's 24 premade voices): River, Sarah, Brian. Brian won on ear — "the
calmest of the three."

Round 2, Brian kept as the benchmark to beat, three more picked for the same soft/warm/
unhurried direction: George ("Warm, Captivating Storyteller"), Eric ("Smooth,
Trustworthy"), Lily ("Velvety Actress"). **Eric won** — calmest of the full set of seven,
and the user's own reasoning was that it holds up specifically for delivering hard news,
which is the one property a demo voice for this product cannot fake or fall back on.

The account swapped mid-audition: the original had 116 credits left (see the resolved
incident below) and could not have afforded this. The user created a fresh account with
a full free allotment specifically so this choice could be made by ear rather than by
label. All 7 audition clips (7 x 219-character syntheses across both rounds, one shot
each, no retries) succeeded on the first attempt.

## RESOLVED: the first ElevenLabs account ran out of credits mid-P4
The original account had 116 credits left against a ~1,200-character real script — not
enough for even one full playback. Confirmed live via a quota_exceeded error on
2026-09-05. Stopped before spending any of it; the user created a second account with a
fresh allotment rather than have this session guess with what little remained. Not an
issue with the code — `src/lib/elevenlabs.ts` and `/api/speak` were already built,
unit-tested (mocked, zero cost), and live-verified to fail closed cleanly with no voice
configured, before the account was swapped.

## RESOLVED: production outage on first deploy, and what it taught
First attempt on the deployed Vercel URL failed on both a laptop and an iPhone with a
generic "did not answer" message — no clue which of several possible causes it was,
because this app deliberately never logs an error's contents. Root cause was never
directly observed (never confirmed which of: a mismatched env-var value from manually
filling in the three previously-empty Vercel slots, or straightforward quota exhaustion
across a shared Gemini key already stressed by a full session of live testing). Didn't
matter which — fixed the actual gap instead of chasing the specific cause: Gemini SDK
errors aren't `instanceof`-checkable (the classes aren't exported) but every one carries
a numeric `.status`, confirmed by reading the installed package's compiled source.
Added `classifyExtractionError()` (10 unit tests, zero API calls) so `auth_failed` and
`quota_exceeded` are now their own codes with their own honest messages, instead of both
collapsing into the same "did not answer."

**Confirmed working after the fix, live, in production:** a web attempt succeeded fully.
An iPhone attempt returned the new, correctly-labelled "reached its limit for now" —
proof the classifier works, and proof the pipeline itself was never broken, only the
error reporting was blind. User is adding a fresh Gemini key (mirroring the ElevenLabs
account swap earlier in P4) for headroom during the demo recording, rather than spend
more of the current key's daily quota chasing this further.

**Still not confirmed:** real audio playing on iOS Safari specifically. The iPhone
attempt never got far enough to test autoplay — it hit the quota wall on the Gemini
call, before /api/speak was ever reached. This is the one gate P4 has not actually
closed yet.

## RESOLVED: a real bug the outage investigation surfaced — Safari autoplay mislabeled
With a fresh key in, the iPhone attempt got past the quota wall and reached
`/api/speak` — and hit a second, genuine bug: "Your device could not reach the server."
The explanation text HAD rendered (confirmed by the user before investigating further),
which meant `/api/explain` succeeded and the failure was inside `AudioControls.tsx`, not
a network problem at all.

**Root cause:** `AudioControls.tsx` wrapped `fetch("/api/speak")` AND `await
audio.play()` in one bare `catch`. `HTMLMediaElement.play()` returns a promise that
*rejects* when a browser's autoplay policy blocks it, and iOS Safari enforces that far
more strictly than desktop Chrome — user-gesture "activation" does not survive two
sequential network round trips (explain, then speak) the way Tech Design §6 assumed
("playback follows the submit click in the same task chain"). Safari's rejection was
real; the message describing it as a connectivity problem was not. This is exactly the
risk this project's own docs named by name as the single likeliest live-demo failure,
and exactly why it was checked before the demo recording rather than assumed to work
because desktop worked.

**Fix:** split loading the audio from playing it into two separate try/catches, and
gave autoplay-rejection its own status (`"blocked"`) instead of folding it into
`"error"`. On block, behavior now matches the existing reduced-motion path exactly: the
audio is ready, Play is enabled, and a calm (non-alert) message explains a tap is
needed — never framed as something broken. The manual Play button also now awaits and
handles a rejection instead of optimistically claiming "playing" before playback is
confirmed.

**Not yet verified live** — deliberately, since diagnosis came from reasoning about the
same-origin/HTTPS deploy (confirmed reachable, ruling out CORS/mixed-content) plus the
documented behavior of `HTMLMediaElement.play()`'s rejection contract, not from a phone
retry. There is currently zero test coverage of this component: Vitest is node-only
until P5 brings jsdom (a standing decision, not an oversight), and this fix's
correctness rests on the Web Audio spec, not an automated check. **The one phone check
still owed:** does the "blocked" state actually appear and does its Play button actually
work on real iOS Safari. This is the single verification worth spending on despite the
user's stated quota pause — it is the literal P4 gate.

**CONFIRMED on real iOS Safari, closing P4.** Explain succeeded, audio did not
auto-play (Safari's policy, as diagnosed), the "blocked" Play button appeared instead of
an error, tapping it started real audio, and slow replay worked. The user separately
noted that Stop-then-Play restarts from the beginning rather than resuming — accepted as
correct, ordinary audio-control behavior, explicitly not worth fixing.

## Copy fix: the submit button oversold what it does
The user's phone test also surfaced a real UX mismatch: the submit button read "Read
this letter to me," but the actual first result is the plain-language TEXT explanation
— voice is a separate, subsequent step (tap Play, or auto-play when the browser allows
it, which iOS Safari often will not). The label promised audio the button doesn't
deliver on its own.

Renamed throughout `LetterInput.tsx` for consistency, including the internal status
value, not just the label: "Read this letter to me" → "Explain this letter",
"Reading the letter" → "Explaining your letter", "The letter has been read." → "The
letter has been explained." This also better matches the product's own framing — the
fixed footer already says "This explains the letter."

## RESOLVED: native Urdu sign-off (P5 closed)
Sent the user real audio (Eric, via the actual /api/speak route) plus the exact Urdu
text for fixture 1, with five specific things to check: wording naturalness/register,
the hand-translated footer specifically, number/date phrasing ("تیس ستمبر دو ہزار
چھبیس" etc.), whether the fair-hearing sentence reads as neutral reporting rather than
a recommendation, and RTL rendering (confirmed programmatically — dir="rtl", lang="ur",
computed CSS direction rtl — but appearance is the user's call, not something I can
verify myself). Also flagged: the model returned Urdu as one unbroken paragraph, unlike
English's short-paragraph structure — asked whether that reads worse for this language.

**User's sign-off, verbatim substance:** overall translation understandable and natural,
no awkward phrasing; the hand-translated footer specifically confirmed natural and
correct; no issues with wording, register, or the fair-hearing line reading as advice.
The one-unbroken-paragraph question was not called out as a problem. Urdu is closed on
a real native-speaker review, not a rubber stamp — worth remembering as the standard
the rest of this project's language quality should be held to, including Spanish, which
has never had an equivalent check by anyone.

## Real bug found and fixed at P5: the fixed footer never localized
The mandatory footer ("This explains the letter. It is not advice about your case.")
was a single hardcoded English string in render.ts, appended regardless of targetLang.
Found by accident while pulling the live Urdu script for RTL verification — the footer
came back in English inside an otherwise-Urdu result. This is a product-requirement
gap (PRD 5.2 / AGENTS.md rule 4: this exact sentence must appear on every result), not
a translation nicety.

Fixed: `FIXED_FOOTERS: Record<TargetLang, string>`, one hand-translated line per
language, still appended by code and never asked of the model — the whole reason a
fixed footer exists is so it cannot drift, and letting a model translate it per-request
would have reopened exactly that risk in a different language. Urdu translation is
pending the native-speaker review above before it can be trusted the way the English
original already is; Spanish has not been independently checked by anyone yet.

**A real testing gotcha worth remembering:** verifying this required mocking
`@google/genai`'s `GoogleGenAI` class so `renderScript()`'s footer-append logic could be
tested without a live call. First attempt used `vi.fn().mockImplementation(() => ({...}))`
as the mocked constructor — Vitest warns, correctly, that an arrow-function
implementation cannot be used with `new`, and the mock silently failed instead of
erroring clearly. Fixed by mocking with a real `class` instead. If mocking a
constructor again, use a class from the start.

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
| 2026-09-05 | P4 (code) | elevenlabs.ts, /api/speak, AudioControls.tsx (auto-play, reduced-motion suppression, prominent Stop, slow replay). 16 new unit tests, mocked, zero credits spent. Fail-closed path live-verified with no voice configured. Hit a second quota wall: ElevenLabs account has 116 credits left, a real script needs ~1,200 — can't audition or verify end-to-end. 76 tests green. | User decides on ElevenLabs credits, see BLOCKED above |
| 2026-09-05 | P1 gate closed | Fixture 1 ran live, first attempt, no retry: 6 claims, 3 absent items. All 6 evidence fields were byte-exact substrings of the raw fixture, line breaks preserved. No eligibility or advice language in any statement. Absent list correctly omitted deadline/reason/appeal_route, all of which the letter does contain. | P2 Span Gate |
| 2026-09-06 | P4 CLOSED | Eric voice chosen and wired in (7 auditions, 2 rounds, see VOICE CHOSEN above). Production outage on first deploy diagnosed and fixed with classifyExtractionError (auth_failed/quota_exceeded, 10 tests, zero API calls). Second real bug found and fixed: Safari autoplay rejection was mislabeled as a network failure — split load/play into separate try/catches, added a "blocked" status matching the reduced-motion UX pattern. Confirmed live on real iOS Safari: blocked-state Play button, real audio, slow replay, all working. Submit button renamed ("Explain this letter") to stop overselling audio it doesn't directly control. 81 tests green. | Propose P5 |
| 2026-09-06 | P5 (code) | Language selector (self-named: English/اردو/Español), RTL transcript rendering (dir/lang scoped to just the script panel, confirmed live: dir="rtl" lang="ur" computed rtl), per-language FIXED_FOOTERS. Found and fixed a real bug: footer was hardcoded English regardless of targetLang. Live-verified body text via one Gemini call before the local key's daily quota ran out again; footer fix verified deterministically with a mocked SDK (5 new tests) rather than spending another live call. 86 tests green. Sent real audio + text to the user for native Urdu review — not closing until they sign off. | Wait for Urdu review, then close P5 |
| 2026-09-06 | P5 CLOSED | Native Urdu speaker (the user) reviewed real output and signed off explicitly: natural translation, correct register, footer reads correctly, fair-hearing line not read as advice. Real quality gate, not a formality. | P6 |
