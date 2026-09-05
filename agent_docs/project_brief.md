# Project Brief — The Letter

## In one sentence
The Letter takes an official letter someone can't read — a benefits denial, a clinic bill, a housing notice — and speaks back, in their own language, only what the letter actually says, what the deadline is, and what to do next.

## Who it's for
A person holding an envelope they're afraid of. Assume: may not read well in any language, may not read at all, may be on a cheap Android phone in bad lighting, may be frightened. Secondary user: the adult child, neighbour, or volunteer who reads these letters aloud one at a time today.

**Not for donors.** No feature serves someone who wants to give money.

## Why it matters
Aid fails at comprehension, not eligibility. In 2023, 29.4 million SNAP-eligible people did not receive benefits, largely for informational reasons. An estimated $58 billion in benefits goes unclaimed annually by older adults. The money is already appropriated. It stops at a sheet of paper.

## The thesis
Every other project in this competition asks "how do I give?" This one asks "why doesn't the giving land?"

## The engineering spine
Two Gemini calls with a deterministic verification layer between them:
1. Extract claims, each carrying a verbatim quote from the letter.
2. **Span Gate** (plain TypeScript) discards any claim whose quote can't be located in the source.
3. Render surviving claims into plain language — and this second call **never sees the letter**, so it cannot invent anything that was in it.
4. ElevenLabs speaks the result.

The product is defined by what it refuses to say.

## Tone
Calm. Never alarming, never condescending, never chirpy. This is someone receiving bad news. The interface should feel like a person sitting beside them, not like a product.
