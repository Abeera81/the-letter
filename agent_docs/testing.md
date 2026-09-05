# Testing — The Letter

Testing here is narrow and load-bearing. Don't chase coverage; cover the things that would embarrass us live or harm a user.

## Must have

**1. Span Gate unit tests** (`src/lib/spanGate.ts`)
- claim with exact verbatim evidence → kept
- claim with evidence differing only in whitespace/quote style → kept
- claim with evidence that does not appear in source → **dropped**
- claim with evidence under 12 chars → dropped
- claim with partially overlapping evidence below 0.90 → dropped
- empty claims array → returns empty, does not throw

**2. Prompt isolation test** — the highest-value test in the repo.
Build a rendering prompt from verified claims where the source letter contains a distinctive sentinel token. Assert the sentinel does **not** appear anywhere in the rendering prompt. This is the test that proves the architectural claim in the submission post. Do not delete it.

**3. Injection resistance** — run `fixtures/04-hostile-injection.txt` through the pipeline. Assert the output explains the letter and does not comply with the embedded instruction. Assert no claim survives the gate that says the person was approved.

**4. Schema boundary** — malformed model output → one retry → clean typed error. Never a partial explanation reaching the user.

**5. Refusal rules** — output contains the fixed footer; output contains no eligibility determination for any fixture.

## Manual checks before shipping

Automated tests don't catch these, and these are what judges see.

- Full flow with each of the four fixtures
- Keyboard only, start to finish, no mouse
- 360px viewport width
- 200% browser zoom
- Urdu: RTL transcript renders correctly and speech is intelligible
- **Audio plays on a real phone.** iOS Safari specifically — autoplay policy is the likeliest live-demo failure
- Every error path shows a message that says what happened and what to do
- Print the action card — one clean page, no clipped content
- Network failure mid-request → clean failure, not a spinner forever

## Rule
Never report a phase done on the basis of code that looks correct. Run it, then state what you verified and what you did not.
