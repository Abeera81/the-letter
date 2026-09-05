# Kickoff prompt for Claude Code

Copy the block below as your **first message** in Claude Code, from the project root, after placing all these files in it.

---

```
Read AGENTS.md in full, then docs/PRD-TheLetter-MVP.md, docs/TechDesign-TheLetter-MVP.md,
and MEMORY.md.

Then, before writing any code:

1. Summarize back to me in one paragraph what we are building and who for.
2. State what the Span Gate is and why the second Gemini call must not receive the
   source letter. If you cannot explain this clearly, re-read the PRD before continuing.
3. Confirm the deadline and what phase we are on.
4. Propose a Phase 0 + Phase 1 plan only. Do not plan beyond P1.

Then stop and wait for my approval. Do not write code yet.
```

---

## Per-phase prompt (reuse for P2 onward)

```
Update MEMORY.md with where we finished, then propose the plan for Phase [N] only.
Wait for approval before coding. When done: run npm run build and npm run test,
tell me exactly what you verified and what you did not, and commit.
```

## Corrective prompts, for when it drifts

**Scope creep:**
```
That is not in the PRD feature list. Scope is closed — see AGENTS.md section 3.
Drop it and return to Phase [N].
```

**Over-engineering:**
```
Take the simpler implementation. We have a hard deadline and you are adding
abstraction we will never use. Simplest thing that passes the phase gate.
```

**Claiming done without verifying:**
```
You have not run it. Run npm run build and npm run test, exercise the flow in a
browser, then tell me specifically what you verified and what you did not.
```

**The critical one — if it starts passing the letter into call #2:**
```
Stop. The rendering call must not receive the source letter under any circumstances,
including "for context." That isolation is the entire point of this project.
Revert that change and make the prompt-isolation test pass.
```

**If you fall behind:**
```
We are behind schedule. Apply the cut list in PRD section 13 in order. Do not add
anything new. Get to P10 (polish and error states) and P11 (submission).
```
