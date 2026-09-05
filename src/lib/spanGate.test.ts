import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runSpanGate, tokenOverlapRatio } from "./spanGate";
import { normalize } from "./normalize";
import type { Claim } from "./schema";

const SOURCE = readFileSync(
  join(process.cwd(), "fixtures", "01-snap-closure.txt"),
  "utf8",
);

function claim(evidence: string, overrides: Partial<Claim> = {}): Claim {
  return {
    id: "c1",
    kind: "deadline",
    statement: "A neutral restatement.",
    evidence,
    ...overrides,
  };
}

describe("the Span Gate", () => {
  it("keeps a claim whose evidence is exactly verbatim", () => {
    const c = claim("You must submit the requested documentation no later than September 26, 2026.");
    const { verified, dropped } = runSpanGate([c], SOURCE);
    expect(verified).toEqual([c]);
    expect(dropped).toEqual([]);
  });

  it("keeps evidence that differs only in whitespace and quote style", () => {
    const c = claim("Benefits   will\n terminate  effective September 30, 2026.");
    const { verified, dropped } = runSpanGate([c], SOURCE);
    expect(verified).toHaveLength(1);
    expect(dropped).toEqual([]);
  });

  it("drops a claim whose evidence does not appear in the source", () => {
    const c = claim("Your benefits have been approved and no further action is required.");
    const { verified, dropped } = runSpanGate([c], SOURCE);
    expect(verified).toEqual([]);
    expect(dropped).toHaveLength(1);
    expect(dropped[0].reason).toBe("overlap_below_threshold");
  });

  it("drops evidence shorter than twelve characters", () => {
    const c = claim("September");
    const { verified, dropped } = runSpanGate([c], SOURCE);
    expect(verified).toEqual([]);
    expect(dropped[0].reason).toBe("evidence_too_short");
  });

  it("drops a partial overlap that sits below the 0.90 threshold", () => {
    // Half the words are the letter's; the deadline in it is invented.
    const c = claim("You must submit the requested documentation no later than December 1, 2027 or lose everything.");
    const { verified, dropped } = runSpanGate([c], SOURCE);
    expect(verified).toEqual([]);
    expect(dropped).toHaveLength(1);
    expect(dropped[0].reason).toBe("overlap_below_threshold");
  });

  it("returns empty for an empty claims array without throwing", () => {
    expect(runSpanGate([], SOURCE)).toEqual({ verified: [], dropped: [] });
  });

  it("records evidence_not_found when the quote shares no words with the letter", () => {
    const c = claim("zzzz qqqq wwww vvvv xxxx yyyy");
    const { dropped } = runSpanGate([c], SOURCE);
    expect(dropped[0].reason).toBe("evidence_not_found");
  });

  it("separates a real claim from a fabricated one in the same batch", () => {
    const good = claim("Benefits will terminate effective September 30, 2026.", { id: "good" });
    const bad = claim("You have been approved for expedited benefits.", { id: "bad" });
    const { verified, dropped } = runSpanGate([good, bad], SOURCE);
    expect(verified.map((c) => c.id)).toEqual(["good"]);
    expect(dropped.map((d) => d.claim.id)).toEqual(["bad"]);
  });
});

describe("regression: the six claims Gemini actually returned for fixture 1", () => {
  // Captured from a live extraction run on 2026-09-05. All six evidence fields
  // were byte-exact substrings of the fixture, line breaks included.
  const LIVE_EVIDENCE = [
    "Your Supplemental Nutrition Assistance Program (SNAP) case has been administratively\nclosed pending verification of household composition.",
    "The reason for this action is that the household failed to return the Interim Report\nForm mailed to the address of record on August 14, 2026.",
    "Benefits will terminate effective September 30, 2026.",
    "You must submit the requested documentation no later than September 26, 2026.",
    "Required documentation includes proof of identity for each household member, proof of\ncurrent earned income for the preceding thirty days, and a completed Interim Report Form.",
    "If you disagree with this action you may request a fair hearing within ninety days of the\ndate of this notice.",
  ];

  it("keeps all six", () => {
    const claims = LIVE_EVIDENCE.map((evidence, i) => claim(evidence, { id: `c${i + 1}` }));
    const { verified, dropped } = runSpanGate(claims, SOURCE);
    expect(verified).toHaveLength(6);
    expect(dropped).toEqual([]);
  });

  it("drops one the moment its evidence is corrupted", () => {
    // The exact corruption the P2 gate calls for: a real quote with an invented date.
    const corrupted = LIVE_EVIDENCE[3].replace("September 26, 2026", "October 15, 2026");
    const claims = [claim(LIVE_EVIDENCE[2], { id: "intact" }), claim(corrupted, { id: "corrupted" })];
    const { verified, dropped } = runSpanGate(claims, SOURCE);
    expect(verified.map((c) => c.id)).toEqual(["intact"]);
    expect(dropped.map((d) => d.claim.id)).toEqual(["corrupted"]);
  });
});

describe("tokenOverlapRatio", () => {
  const words = new Set(normalize(SOURCE).split(" ").filter(Boolean));

  it("is 1 when every word is the letter's", () => {
    expect(tokenOverlapRatio(normalize("Benefits will terminate"), words)).toBe(1);
  });

  it("is 0 for words the letter never uses", () => {
    expect(tokenOverlapRatio("zzzz qqqq", words)).toBe(0);
  });

  it("is 0 for empty evidence rather than dividing by zero", () => {
    expect(tokenOverlapRatio("", words)).toBe(0);
  });
});
