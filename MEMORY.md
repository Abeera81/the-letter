# MEMORY.md — The Letter

Durable project state. Update at the end of every session. The next session starts here.

---

## Current status
**Phase:** P7 CLOSED (the user moved straight to proposing P8, taken as approval after
four rounds of visual/layout fixes). P8 (printable action card) code complete and
live-verified on both fixtures; awaiting the user's own look at the printed output
before closing — their explicit requirement.
**Next action:** wait for user sign-off, then close P8. Per the user's own stated plan,
next is the hostile-letter / prompt-injection fixture test.
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

## RESOLVED at P6: fixture-2 explanation field confirmed live
Open since P3. At P3, fixture 2's absent-info gap ("the letter does not explain what
this charge is for") had no schema field to land in — `reason` only covers why an
ACTION was taken. Added `explanation` as its own ABSENT_FIELDS value and sharpened the
extraction prompt with a concrete example matching fixture 2's own "DETAIL OF CHARGES"
line items. Confirmation was blocked twice by the daily Gemini quota — see the incident
below — and the only interim signal was a diagnostic on a different model entirely.

**Live-confirmed at P6, on the actual shipped model (`gemini-3.5-flash`):** fixture 2,
requested in Urdu, returned `absent: [explanation, phone, contact_name]` on the first
attempt. The extraction note itself: "The statement lists charge categories but does
not explain what specific visit, service, or medical condition caused the charges" —
exactly the distinction the sharpened prompt was written to draw. No further action
needed on this item.

## P6 build notes: structured output for call #2, chosen deliberately over cheaper options
The user asked for the "letter does not say" panel's on-screen text to be translated,
not just spoken — the spoken script already narrates it correctly (proven in the P5
Urdu review), but the panel had no equivalent. Presented three options honestly,
including the user's own suggested shortcut (parse the translated absence sentences out
of the already-generated prose): declined that one specifically, because reconstructing
sentence boundaries across languages and assuming a 1:1 sentence-per-item mapping is
exactly the kind of unverified heuristic the Span Gate's P2 rewrite taught this project
not to trust. Chose full JSON-schema structured output (same mechanism call #1 already
uses) over a cheaper text-delimiter approach, on the user's explicit call, given an
explicit requirement: fail closed on anything malformed, never show a broken or
partially-translated panel.

**What changed:** `render.ts`'s call #2 now requests `{ script, absentLines: string[] }`
via `response_format` + a Zod-generated JSON schema, mirroring extraction's pattern.
`renderScript` was renamed `renderExplanation` (breaking rename, contained to
render.ts/route.ts, no other call sites existed). One retry on malformed output, same
as extraction. A NEW check beyond schema validity: `absentLines.length` must exactly
equal `absent.length`, or it fails closed as `malformed_render` regardless of otherwise
being valid JSON — a model that drops or merges one absence item is indistinguishable
from one that mistranslated it, and this product does not show a "probably right" list.

Extracted `classifySdkError()` into its own module (`sdkError.ts`) so both Gemini calls
share the same auth/quota classification instead of duplicating it — `gemini.ts`'s
`classifyExtractionError` is now a one-line wrapper, kept for existing call sites.

**Fail-closed path is genuinely tested, not just the happy path** (explicit requirement
from the user): 12 tests in render.test.ts cover malformed JSON, right-shape-wrong-type,
length mismatch both directions, auth_failed/quota_exceeded with no retry, missing key
before any call is made, and confirmation that every failure surfaces as a `RenderError`
instance rather than a bare `Error`. 103 tests total, all green.

**Live-verified in one request** (fixture 2, Urdu — see the RESOLVED entry above):
`explanation`/`phone`/`contact_name` extracted, `absentLines` came back length-3 and
correctly translated and ordered, footer intact. RTL confirmed on the real rendered DOM
(not just asserted): `dir="rtl"`, `lang="ur"`, computed CSS `direction: rtl`, exactly 3
`<li>` elements in the exact order and content of the captured `absentLines`. The DOM
check itself replayed the already-captured live response through a stubbed fetch rather
than spending a second live call — the API budget rule applied to the verification step
itself, not just the build.

## P7 build notes: show-me-where-it-says-that highlighting
Tech Design's original framing ("tap a spoken sentence, source lights up") assumes a
1:1 mapping between rendered prose sentences and claims. That mapping doesn't exist —
call #2's script is Gemini's own assembled/translated prose, not one sentence per
claim — and reverse-engineering it would be exactly the same category of unverified
heuristic the user already declined once at P6. Proposed and got explicit sign-off to
tie tap-targets to the verified claims themselves instead (their `statement` field,
already plain-English and human-readable, sitting unused in the debug JSON panel)
rather than to parsed transcript sentences.

**What changed:**
- `src/lib/locateSpan.ts` (new): given already-verified evidence and the raw letter,
  finds the evidence's exact character offsets in the raw text. Deliberately kept
  separate from `spanGate.ts` — the user does not want that file touched again once it
  "finally holds correctly" (P2). Fast path is `indexOf` (byte-exact quotes, the common
  case). Fallback is a tolerant regex — same reformatting tolerances `normalize()`
  already grants (whitespace runs, quote glyphs, dash glyphs) — but built to hand back
  real raw-text indices directly rather than requiring a position remap through
  normalize()'s own whitespace-collapsing/NFKC pipeline. **Fails closed:** returns
  `null` when no confident match exists, same principle as P6 — no guessed or
  approximate span is ever offered.
- `schema.ts`: new `LocatedClaim = Claim & { sourceStart: number | null; sourceEnd: number | null }`.
- `route.ts`: after `renderExplanation`, maps each verified claim through `locateSpan`
  against the original submitted letter text before returning. Purely additive —
  never a second chance for evidence the gate already rejected.
- `SourceHighlight.tsx` (new): read-only rendering of the pasted letter, always LTR
  (it shows the original letter as pasted, never the translated transcript), with the
  selected claim's span wrapped in `<mark>`.
- `LetterInput.tsx`: a row of claim buttons under "Where this came from" (label =
  `claim.statement`). A claim with `sourceStart`/`sourceEnd` both `null` renders
  **disabled**, with a title tooltip explaining why — the fail-closed UI requirement.
  Clicking a locatable claim toggles it selected (`aria-pressed`) and drives
  `SourceHighlight`; selection resets on new submit or a fresh example letter.

**Known, accepted limitation (approved by the user, noted in SUBMISSION-PLAN.md):**
claim labels stay in English even when Urdu/Spanish is selected, because they name the
original letter's actual words, not the translated transcript. No code change wanted.

**Verified before handing to the user for their own look** (their explicit ask, same
pattern as every UI-facing phase): 8 new `locateSpan` unit tests (exact match, curly
quote, dash glyph, collapsed line break, case-insensitivity, not-found → null, empty
evidence → null, regex-special characters in evidence don't throw) — 111 tests total,
all green. Then drove the real UI end to end with a stubbed `/api/explain` response
(zero live Gemini calls spent) built from real, exact substrings of fixture 1,
including one deliberately unlocatable claim: confirmed in the browser that (a) the
unlocatable claim renders disabled with its reason as a tooltip and never produces a
`<mark>`, (b) clicking a locatable claim's button sets `aria-pressed="true"` and
highlights exactly its evidence text and nothing else in the real rendered letter,
including a multi-line evidence span with an internal line break, (c) switching
between claims moves the highlight correctly, (d) toggling the same claim off clears
the highlight and drops `aria-pressed` entirely. `npm run build`, lint, and `tsc
--noEmit` all clean.

**Not yet done:** the user has not looked at the interaction with their own eyes —
they explicitly want to before this closes, same as every other UI-facing phase.

## P7 round 2: two-zone layout, real auto-scroll bug, and the disabled-claim question
First-look feedback from the user, after trying it live: (1) tapping a claim worked but
the highlight required manual scrolling to see — the layout had never caught up to Tech
Design §7's "two zones, always both visible on desktop, stacked on mobile" spec, which
predates P7 entirely (the whole app was single-column until now); (2) they saw no
disabled/greyed-out claim in fixture 1 and asked whether that's because all 6 of its
claims are genuinely locatable, or because the disabled path silently isn't firing —
correctly refusing to just take my word for it or go hunting for a real counterexample.

**Layout:** `LetterInput.tsx`'s results section is now a real two-column CSS grid at
`md:` — explanation zone (audio, script, AbsentPanel, claims list, debug JSON) on the
left, "Original letter" (`SourceHighlight`) on the right — each column
`md:sticky md:top-6 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto` so a long letter or
script scrolls within its own zone instead of pushing the other out of view. Below
`md`, the grid collapses to the prior single-column stack.

**A real bug, found and fixed via direct reproduction, not guesswork:** added a
`scrollIntoView`-on-select effect to `SourceHighlight.tsx`, tried `behavior: "smooth"`
first, and it silently did nothing on the desktop column — `scrollTop` stayed at 0.
Isolated the cause by monkey-patching `Element.prototype.scrollTo` in a live browser
session to log real calls: the effect *was* firing, with the right target offset, on
the right element — `behavior: "smooth"` alone was the failure. Confirmed directly:
calling `scrollTo({top: X, behavior: "auto"})` on the exact same sticky+overflow-auto
column moved it; the identical call with `behavior: "smooth"` left `scrollTop` at 0,
reproducibly. This is a genuine Chromium quirk with smooth-scrolling a
`position: sticky` element's own `overflow-y: auto` scroll box, not a coding mistake —
native `scrollIntoView`'s ancestor-walk has the same problem for the same reason.
**Fix:** instant scroll (`behavior: "auto"`) everywhere in this feature, computed by
hand for the sticky-column case (`nearestScrollableAncestor()` walks up from the
`<mark>` to find a real internally-scrolling ancestor and calls `scrollTo` on it
directly) and falling back to `mark.scrollIntoView` for the plain page-scroll case
(mobile, no such ancestor). Instant rather than smooth also fits this app's existing
rule that motion should only ever serve a purpose, so this isn't a compromise.

**Verified, not asserted:** since real narrow-viewport emulation wasn't available in
the browser-automation tool used, the mobile fallback path was verified by forcing the
column's actual DOM node into the mobile CSS shape (`position: static`,
`overflow-y: visible`, no max-height — i.e. exactly what `md:` classes stop applying
below the breakpoint) and re-triggering a claim tap: confirmed the *real* code path
(`nearestScrollableAncestor` returning `null`, falling through to `scrollIntoView`)
moved `window.scrollY` from 0 to 1438 and landed the highlight centered in the
viewport. The desktop sticky-column path was verified the direct way: clicking a claim
whose evidence sits near the end of the letter moved the column's own `scrollTop` from
0 to the correct offset while the outer page and the other column stayed put.

**The disabled-claim question, answered directly:** fixture 1's Span Gate run has
always been 6/6 claims verified by exact normalized substring match (see the P2 log
entry) — `locateSpan`'s fast path (`indexOf`) resolves all of them cleanly, so there is
genuinely nothing to disable in that fixture. That is a fact about fixture 1, not a
dead code path. The disabled path itself was never asserted only in the abstract: the
same stubbed-response harness used throughout P7's verification always includes one
claim with fabricated, not-in-the-letter evidence specifically to exercise it, and
across every re-run in this round it kept rendering correctly — disabled, with its
reason as a visible tooltip, producing no `<mark>`. `locateSpan.test.ts` also asserts
the underlying "not found → null" behavior directly, independent of any UI. Per the
user's own instruction, this synthetic case is the proof offered — not a request that
they go hunting fixture 1 for a real one that doesn't exist.

`npm run build`, lint, and `tsc --noEmit` all clean after these fixes. 111 tests still
green (no test changes needed — this round was layout/interaction, not logic).

## P7 round 3: three-zone restructure and a real visual-design pass
User's next-look feedback after round 2's layout fix went further than layout: the two
remaining columns still stacked two unrelated things (read-once explanation, tappable
claims), recreating the scrolling problem one level up, and separately, the visual
design read as generic/unpolished — the "doesn't look credible yet" complaint, not a
structural one.

**Structure, now three zones per the user's explicit spec:** (1) full-width — audio +
script, read once top to bottom; (2) full-width — the absent-info panel, also
read-once; (3) two columns, always paired — claims (left) / original letter (right),
the only genuinely interactive pairing. `page.tsx`'s container widened to `max-w-5xl`
so zone 3 has room, while prose (hero text, the script itself) stays constrained to
`max-w-[68ch]` inside that wider shell so line length doesn't degrade.

**Visual pass**, grounded in Tech Design §7's own anti-pattern list (which the user's
complaint independently echoed almost verbatim): the palette was never the problem —
one calm teal accent, no cream/terracotta — the flatness came from applying the exact
same `rounded-md border-2 border-rule bg-paper-raised p-4` card to everything
regardless of content type. Deliberately did NOT introduce a second/display typeface —
explicit judgment call, agreed by the user, given real multilingual weight (Urdu
Nastaliq, Spanish) already resting on one proven font stack this close to the deadline.
Instead: real type-scale hierarchy (bigger H1, distinct H2/H3 weights), the script
became a left-rule quote instead of a boxed card (authored text, not a UI panel), and
the debug JSON moved behind a collapsed `<details>` disclosure instead of sitting as a
full card with the same visual weight as real content.

**Three specific, deliberate asks about the ONE accent color** (not more colors — more
restraint): (1) teal now marks only the single active thing per zone — the Play
button, and the currently-selected claim — inactive claims are quiet by design; (2) the
absent-info panel (PRD's "maybe the single most useful screen") got its own identity:
a `bg-accent/[0.06]` tint and a teal heading, not another white card; (3) the
highlighted span in the original letter is a **solid** `bg-accent text-white` fill, not
a border or underline — real visual weight for the one moment this whole feature exists
to deliver.

**Round 3, three more targeted fixes** after the user tried the actual running app:
1. Play/Slow-replay buttons were dangerously close — root cause was two sibling
   `<button>`s (inline-block by default) with only a vertical `mt-3` between them and
   no flex container, so at `sm:` widths (where Play shrinks to fit-content) they could
   sit on the same line with zero horizontal gap. Fixed with an explicit
   `flex flex-wrap gap-4` wrapper.
2. User reported the language selector felt "grouped with the playback controls"
   despite it already sitting between the textarea and submit buttons (verified this
   directly against the live app before changing anything, rather than assuming a bug)
   — root cause was almost certainly that the gap above it (from the textarea) and
   below it (to the submit buttons) were the identical `mt-5`, so it didn't visually
   bind to either side. Fixed with asymmetric spacing: `mt-3` above (tight, part of the
   paste step), `mt-8` below the language fieldset before the action-button row
   (clearly separated from Explain/Try an example). Flagged this as a judgment call
   rather than a literal fix, since the DOM order the user described was already
   correct.
3. Inactive claims were plain text on white with zero resting affordance — nothing
   signaled "tappable" until the accent fill appeared on click. Added a quiet resting
   card (`border border-rule bg-paper-raised`) distinct from both the plain page
   background and the solid-teal active state, so the on/off contrast stays clear.

`npm run build`, lint, `tsc --noEmit`, and all 111 tests clean throughout — every round
of this pass was layout/styling only, no logic touched.

**Round 4 (final on this screen):** the round 3 spacing fix for the language selector
addressed the wrong cause. The user clarified: the actual problem was layout, not
proximity — the language fieldset sat as its own full-width row with a lot of dead
space to its right, stacked right above the action-button row, reading as awkward and
disconnected regardless of the margin between them. Fixed by combining language and
the action buttons into one `flex flex-wrap items-end justify-between` row — language
on the left, Explain/Try-an-example on the right, sharing the row's width. This meant
the `<form>` itself could no longer stay capped at `max-w-[68ch]` (there isn't room for
both sides on one line inside a ~700px measure); only the textarea and its label/hint
are wrapped in their own `max-w-[68ch]` div now, and the language+buttons row uses the
page's full `max-w-5xl` width, wrapping to stacked only if the viewport is too narrow
for both sides. Confirmed on a live screenshot before calling it done and sent it for the user's
review — they said this is meant to be the last round on this screen. Once they
confirm, next up per their own stated plan: P8 (printable action card), then the
hostile-letter/injection-fixture test.

## P8 build notes: printable action card
PRD F10: one page, "what happened, deadline, what to bring, where to go." Zero new
Gemini calls — the card is a pure re-presentation of data the app already has
(`result.verified` claims, `result.absent`), bucketed by the existing `Claim.kind`
enum: `what_happened`+`why`+`amount` → What happened, `deadline` → Deadline, `action` →
What to bring, `contact` → Where to go.

**Language, on the user's explicit instruction: always English**, never the currently
selected target language. Their reasoning: the card's real use case per F10 is being
handed to a caseworker or office worker at a counter, most likely an English speaker
in a US benefits/clinic context — the on-screen explanation and audio already serve
the person themselves in their own language. This turned out to require zero extra
code: `Claim.statement` and `AbsentItem.note` come from extraction (call #1, always
English for this product's English-letter fixtures) and are never translated — only
`render.ts`'s script and `AbsentPanel`'s `absentLines` are — so the print card just
uses those fields directly regardless of `targetLang`.

**Fail-honest empty buckets, not silent or fabricated:** `buildPrintCard`
(`src/lib/printCard.ts`, pure function, no rendering) checks a per-section list of
`ABSENT_FIELDS` when its claim bucket is empty, and prints that absence note instead
(e.g., no `contact` claims + `phone`/`contact_name` flagged absent → "Where to go"
shows "The letter does not provide a phone number" etc.). If a bucket is empty AND
there's no matching absent field (true for "What to bring" — `ABSENT_FIELDS` has
nothing corresponding to missing action steps), the section is left off the card
entirely rather than padded with an unrelated note or a fabricated "nothing needed."

**Mechanism, no new dependencies:** `PrintCard.tsx` stays mounted in the DOM,
`hidden print:block`; every other on-screen section (the pre-submit form, the whole
results view, and page.tsx's hero/footer copy) got `print:hidden`. A "Print action
card" button just calls `window.print()` — the browser's native dialog gives "one
clean page" and doubles as free PDF export, so no PDF library needed two days from
deadline.

**Verified with fixtures 1 and 2, as the user asked, without over-spending quota:**
- Fixture 2: reused the exact real JSON response captured live during P6 (RESOLVED
  entry above) — zero new calls. Its real extraction has `amount`/`deadline`/`action`×2
  claims and NO `contact` claim, with `phone`+`contact_name` flagged absent — this
  became the test in `printCard.test.ts` that proves the fallback fires on genuine
  model output, not a constructed case, word-for-word matching the live capture.
- Fixture 1: no prior captured JSON existed in this exact shape, so this justified one
  fresh live call (budget rule is "spend when genuinely needed," not "never spend").
  Real result: 6 claims (what_happened, why, deadline×2, action×2), absent =
  phone/contact_name/amount. Card came back with all three "happy path" sections
  populated correctly and "Where to go" correctly falling back to the absent notes —
  confirmed by reading the live-rendered `PrintCard` DOM directly (not the raw JSON),
  and screenshotted.
- 6 new unit tests (bucketing, why/amount folding into What happened, absent-fallback,
  no-fallback-available omission, fully-empty omission, the real fixture-2
  reproduction) — 117 tests total, all green. Build/lint/`tsc --noEmit` clean.

**Not yet done:** the user has not looked at the actual printed/print-preview output
themselves — they explicitly want to before this closes.

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
| 2026-09-06 | P6 (code + live) | AbsentPanel.tsx built. render.ts's call #2 now returns structured `{script, absentLines}` via JSON schema, with a length-parity fail-closed check beyond Zod validation. classifySdkError extracted to a shared module. Closed the long-open P3 explanation-field item live, on the shipped model. RTL/translation confirmed on the real rendered DOM by replaying a captured live response through a stubbed fetch, not a second live call. 103 tests green, 12 new covering the fail-closed path specifically. | Wait for user review, then close P6 |
| 2026-09-06 | P6 CLOSED | User rejected pasted-text evidence as insufficient and independently confirmed the Urdu AbsentPanel live in the browser against a running dev server: renders correctly, all three lines accurate to fixture 2's actual missing fields. Real quality gate, same standard as P5. ElevenLabs quota hit again during the check — expected/known limit, not a bug, no action taken; user will bring a fresh key for the demo recording. | P7 |
| 2026-09-06 | P7 (code) | locateSpan.ts (fail-closed evidence→raw-offset finder, kept separate from spanGate.ts on purpose), LocatedClaim type, route.ts wiring, SourceHighlight.tsx, tappable verified-claims list in LetterInput.tsx. Declined mapping rendered prose sentences back to claims (unverified heuristic, same risk class as the P6 shortcut already declined) in favor of tapping the real verified claims directly — user's explicit call. 8 new locateSpan tests, 111 total green. Self-verified the full tap/highlight/toggle interaction in a real browser via a stubbed /api/explain response built from real fixture-1 substrings (zero live Gemini calls), including the disabled/unlocatable-claim fail-closed case. Added the English-label limitation to SUBMISSION-PLAN.md; also corrected a now-stale line there claiming Urdu was unaudited (it was reviewed and signed off at P5). | Wait for the user's own look at the interaction, then close P7 |
| 2026-09-06 | P7 round 2 | User's first-look feedback: highlight required manual scrolling (layout never caught up to Tech Design's two-zone spec), and asked whether the disabled-claim path had genuinely fired or just never been tested against a real case. Built the two-column sticky/scrollable layout per §7. Found and fixed a real Chromium bug via direct reproduction: smooth-scrolling a position:sticky element's own overflow box silently no-ops; switched to instant scroll everywhere in this feature. Verified the mobile fallback path by forcing the real DOM into the mobile CSS shape rather than asserting it untested. Answered the disabled-claim question directly: fixture 1 is genuinely 6/6 locatable (a fact about that fixture, not a dead code path), and pointed to the existing synthetic unlocatable-claim proof already built into the verification harness, per the user's own instruction not to go hunting fixture 1 for a case that doesn't exist. 111 tests still green, build/lint/tsc clean. | Wait for the user's own look, then close P7 |
| 2026-09-06 | P7 round 3 | User diagnosed a real structural problem precisely: the two columns still paired read-once explanation with tappable claims, recreating the scrolling problem one level up. Restructured to three zones (script+audio full-width, absent panel full-width, claims/letter paired columns) plus a real visual pass grounded in Tech Design §7 — differentiated card treatments by content type, real type hierarchy, no second typeface (deliberate call, agreed), debug JSON collapsed. Three deliberate, restrained uses of the one accent color: active claim + Play button only, a tinted identity for the absent panel, a solid (not bordered) highlight fill. Sent screenshots for review. Then three more targeted fixes from live testing: Play/Slow-replay had zero horizontal gap at sm+ (root cause: sibling inline-block buttons, no flex wrapper — real bug, not a style nit); language selector felt grouped with playback controls despite already being correctly positioned (verified live before touching anything; fixed with asymmetric spacing, not a DOM move); inactive claims had no resting affordance, now a quiet bordered card distinct from both the page background and the active teal fill. Build/lint/tsc/111 tests clean throughout. | Wait for the user's live look, then close P7 and move to P8 |
| 2026-09-06 | P7 round 4 | User approved Play/Replay spacing and the claims resting state; the language-selector fix from round 3 addressed the wrong cause. Real problem was layout, not proximity: language sat as its own full-width row with dead space beside it, above the button row. Fixed by putting language and the action buttons on one `justify-between` row sharing the width, which required un-capping the `<form>` from `max-w-[68ch]` (only the textarea+label keep that measure now; this row uses the page's full width). Confirmed on a live screenshot before sending for review. User said this is meant to be the last round on this screen. | Wait for confirmation, then close P7 and propose P8 |
| 2026-09-06 | P7 CLOSED / P8 (code + live) | P7 closed (user moved to proposing P8 after round 4). Built printCard.ts (pure bucketing function, fail-honest absent-fallback per section), PrintCard.tsx (hidden print:block, everything else print:hidden), a "Print action card" button. User's explicit call: always English regardless of targetLang, since the card is for a caseworker at a counter, not the person themselves — required zero extra translation logic since extraction's own fields are already English. Verified with both fixtures as asked: fixture 2 reused the real JSON captured live at P6 (zero new calls) as the fallback-path proof in the test suite; fixture 1 needed one fresh live call (no prior capture existed in this shape) — confirmed all three happy-path sections plus the Where-to-go absent-fallback, real data, screenshotted. 6 new tests, 117 total green, build/lint/tsc clean. | Wait for the user's own look at the printed output, then close P8 |
