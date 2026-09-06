import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FIXED_FOOTERS, RenderError, buildRenderRequest, renderExplanation, __testables } from "./render";
import { runSpanGate } from "./spanGate";
import type { AbsentItem, Claim } from "./schema";

// Hoisted by Vitest to the top of the file regardless of where it's written,
// so it lives here, at true module scope, to say so honestly.
//
// A real class, not vi.fn().mockImplementation(() => ({...})): render.ts
// calls this with `new`, and an arrow-function mock implementation cannot
// be used as a constructor — it silently produced a broken instance instead
// of a clean type error, which is worth knowing if this pattern is reused.
const mockCreate = vi.fn();
vi.mock("@google/genai", () => {
  class MockGoogleGenAI {
    interactions = { create: mockCreate };
  }
  return { GoogleGenAI: MockGoogleGenAI };
});

/**
 * ══ THE PROMPT ISOLATION TEST ══
 *
 * This is the evidence for the strongest sentence in the submission post:
 * the second model never sees the letter, so it cannot invent anything that
 * was in it.
 *
 * It works by putting a sentinel string into the source letter, running the
 * real pipeline shape over it, and asserting the sentinel appears NOWHERE in
 * the fully serialized request that would go to Gemini — not merely absent
 * from the prompt string, absent from the entire body, every field of it.
 *
 * Do not delete this test. Do not weaken it to check only the prompt.
 */

const SENTINEL = "XYZZY-PLUGH-7431-CORRELATION-HORIZON";

const SOURCE_LETTER = `NOTICE OF ADVERSE ACTION

Your case has been closed. ${SENTINEL}

You must submit the requested documentation no later than September 26, 2026.

Benefits will terminate effective September 30, 2026.`;

const claims: Claim[] = [
  {
    id: "c1",
    kind: "what_happened",
    statement: "The case has been closed.",
    evidence: `Your case has been closed. ${SENTINEL}`,
  },
  {
    id: "c2",
    kind: "deadline",
    statement: "Documents must be sent by September 26, 2026.",
    evidence: "You must submit the requested documentation no later than September 26, 2026.",
  },
];

const absent: AbsentItem[] = [
  { field: "phone", note: "The letter does not give a phone number." },
];

describe("prompt isolation — call #2 never receives the letter", () => {
  it("keeps the sentinel out of the entire serialized request body", () => {
    // The claims are gated first, exactly as the route does it, so the claim
    // carrying the sentinel in its evidence is a genuinely verified claim.
    const { verified } = runSpanGate(claims, SOURCE_LETTER);
    expect(verified).toHaveLength(2);

    const request = buildRenderRequest(verified, absent, "en");
    const serialized = JSON.stringify(request);

    expect(serialized).not.toContain(SENTINEL);
    // Case-insensitive too, in case anything downstream normalizes.
    expect(serialized.toLowerCase()).not.toContain(SENTINEL.toLowerCase());
  });

  it("carries no evidence field at all, since evidence is letter text", () => {
    const { verified } = runSpanGate(claims, SOURCE_LETTER);
    const serialized = JSON.stringify(buildRenderRequest(verified, absent, "en"));

    expect(serialized).not.toContain("evidence");
    for (const claim of verified) {
      expect(serialized).not.toContain(claim.evidence);
    }
  });

  it("has no parameter through which a letter could be passed", () => {
    // buildRenderRequest(claims, absent, targetLang) — three parameters, none
    // of which is source text. This is the guarantee, enforced by shape.
    expect(buildRenderRequest.length).toBe(3);
  });

  it("does not leak the letter through a real fixture either", () => {
    const fixture = readFileSync(
      join(process.cwd(), "fixtures", "01-snap-closure.txt"),
      "utf8",
    );
    const fixtureClaims: Claim[] = [
      {
        id: "c1",
        kind: "why",
        statement: "The household did not return the Interim Report Form.",
        evidence:
          "The reason for this action is that the household failed to return the Interim Report\nForm mailed to the address of record on August 14, 2026.",
      },
    ];
    const { verified } = runSpanGate(fixtureClaims, fixture);
    expect(verified).toHaveLength(1);

    const serialized = JSON.stringify(buildRenderRequest(verified, [], "en"));

    // Distinctive phrases that exist only in the letter, never in a statement.
    for (const phrase of [
      "administratively",
      "DIVISION OF FAMILY ASSISTANCE",
      "address of record",
      "SYNTHETIC",
    ]) {
      expect(serialized).not.toContain(phrase);
    }
  });

  it("passes the statement through, because that is all it is allowed to see", () => {
    const serialized = JSON.stringify(buildRenderRequest(claims, absent, "en"));
    expect(serialized).toContain("The case has been closed.");
    expect(serialized).toContain("The letter does not give a phone number.");
  });
});

describe("rendering instructions", () => {
  const { SYSTEM_INSTRUCTION } = __testables;

  it("tells the model it has not seen the letter", () => {
    expect(SYSTEM_INSTRUCTION).toContain("You have not seen the letter");
  });

  it("permits reporting an appeal option but forbids recommending it", () => {
    expect(SYSTEM_INSTRUCTION).toContain("Report the option; never recommend it");
    expect(SYSTEM_INSTRUCTION).toContain("Never recommend appealing");
  });

  it("keeps an optional right like a hearing separate from required actions", () => {
    expect(SYSTEM_INSTRUCTION).toContain(
      "Keep it separate from the required actions below — it is something the letter mentions, not a step to take.",
    );
    expect(SYSTEM_INSTRUCTION).toContain(
      "anything else the letter mentions that is not a required step",
    );
  });

  it("carries the remaining refusal rules", () => {
    expect(SYSTEM_INSTRUCTION).toContain("Never introduce a date, amount, name, address, or phone number");
    expect(SYSTEM_INSTRUCTION).toContain("Never state or imply whether the person qualifies");
    expect(SYSTEM_INSTRUCTION).toContain("Never predict what will happen");
  });

  it("asks for speech, not prose", () => {
    expect(SYSTEM_INSTRUCTION).toContain("grade five reading level");
    expect(SYSTEM_INSTRUCTION).toContain("No bullet points");
    expect(SYSTEM_INSTRUCTION).toContain("Write dates in full, as words");
  });

  it("names the target language in the request", () => {
    expect(JSON.stringify(buildRenderRequest(claims, absent, "ur"))).toContain("Urdu");
    expect(JSON.stringify(buildRenderRequest(claims, absent, "es"))).toContain("Spanish");
  });
});

describe("the fixed footer", () => {
  it("is the exact English sentence the PRD specifies", () => {
    expect(FIXED_FOOTERS.en).toBe("This explains the letter. It is not advice about your case.");
  });

  it("has one fixed translation per supported language", () => {
    for (const lang of ["en", "ur", "es"] as const) {
      expect(FIXED_FOOTERS[lang].length).toBeGreaterThan(0);
    }
  });

  it("is never asked of the model, in any language", () => {
    for (const lang of ["en", "ur", "es"] as const) {
      const serialized = JSON.stringify(buildRenderRequest(claims, absent, lang));
      expect(serialized).not.toContain(FIXED_FOOTERS[lang]);
    }
  });
});

/**
 * `absent` above has exactly one item, so a valid mocked response needs
 * exactly one entry in absentLines to satisfy the length-parity check.
 */
function mockValidResponse(script = "The mocked spoken script.", absentLines = ["Mocked absent line."]) {
  mockCreate.mockResolvedValueOnce({
    output_text: JSON.stringify({ script, absentLines }),
  });
}

describe("renderExplanation — the happy path", () => {
  // The model is mocked here on purpose. Which footer gets appended, and
  // whether the two arrays line up, is pure TypeScript that runs after the
  // model has already answered — it needs zero live calls to verify, and
  // after a Gemini quota wall was hit mid verification of an earlier fix,
  // that is the point: exactly the kind of check the API budget rule in
  // AGENTS.md asks for instead.
  beforeEach(() => {
    mockCreate.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it.each(["en", "ur", "es"] as const)("appends the %s footer, not English by default", async (lang) => {
    mockValidResponse();
    const { script } = await renderExplanation(claims, absent, lang);
    expect(script.endsWith(FIXED_FOOTERS[lang])).toBe(true);
  });

  it("never appends a different language's footer", async () => {
    mockValidResponse();
    const { script } = await renderExplanation(claims, absent, "ur");
    expect(script).not.toContain(FIXED_FOOTERS.en);
    expect(script).not.toContain(FIXED_FOOTERS.es);
  });

  it("returns absentLines separately from the spoken script", async () => {
    mockValidResponse("The spoken script.", ["The letter does not give a phone number, translated."]);
    const { script, absentLines } = await renderExplanation(claims, absent, "en");
    expect(absentLines).toEqual(["The letter does not give a phone number, translated."]);
    // The footer is appended to script only; absentLines is untouched by it.
    expect(absentLines[0]).not.toContain(FIXED_FOOTERS.en);
    expect(script).toContain("The spoken script.");
  });

  it("succeeds with an empty absentLines array when there is nothing missing", async () => {
    mockValidResponse("All present.", []);
    const { absentLines } = await renderExplanation(claims, [], "en");
    expect(absentLines).toEqual([]);
  });
});

describe("renderExplanation fails closed — never a broken or mismatched panel", () => {
  beforeEach(() => {
    mockCreate.mockReset();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("retries once on malformed JSON, then succeeds if the second attempt is valid", async () => {
    mockCreate.mockResolvedValueOnce({ output_text: "not valid json at all" });
    mockValidResponse();
    const result = await renderExplanation(claims, absent, "en");
    expect(result.script).toContain("The mocked spoken script.");
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("throws malformed_render after two malformed attempts, never a third", async () => {
    mockCreate.mockResolvedValue({ output_text: "still not json" });
    await expect(renderExplanation(claims, absent, "en")).rejects.toMatchObject({
      code: "malformed_render",
    });
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("rejects a response with the right shape but missing a required field", async () => {
    mockCreate.mockResolvedValue({ output_text: JSON.stringify({ script: "only a script" }) });
    await expect(renderExplanation(claims, absent, "en")).rejects.toMatchObject({
      code: "malformed_render",
    });
  });

  it("rejects absentLines of the wrong type entirely", async () => {
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify({ script: "ok", absentLines: "not an array" }),
    });
    await expect(renderExplanation(claims, absent, "en")).rejects.toMatchObject({
      code: "malformed_render",
    });
  });

  it("rejects a length mismatch even though the JSON is perfectly valid", async () => {
    // `absent` has one item; returning two (or zero) lines cannot be safely
    // mapped back to which fact is which, so it must fail rather than guess.
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify({
        script: "ok",
        absentLines: ["one", "two, which should not be here"],
      }),
    });
    await expect(renderExplanation(claims, absent, "en")).rejects.toMatchObject({
      code: "malformed_render",
    });
  });

  it("rejects zero absentLines when one was expected", async () => {
    mockCreate.mockResolvedValue({ output_text: JSON.stringify({ script: "ok", absentLines: [] }) });
    await expect(renderExplanation(claims, absent, "en")).rejects.toMatchObject({
      code: "malformed_render",
    });
  });

  it("classifies a 401/403 as auth_failed and does not retry", async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error("nope"), { status: 401 }));
    await expect(renderExplanation(claims, absent, "en")).rejects.toMatchObject({
      code: "auth_failed",
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("classifies a 429 as quota_exceeded and does not retry", async () => {
    mockCreate.mockRejectedValue(Object.assign(new Error("nope"), { status: 429 }));
    await expect(renderExplanation(claims, absent, "en")).rejects.toMatchObject({
      code: "quota_exceeded",
    });
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("throws missing_api_key immediately, before ever calling the model", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(renderExplanation(claims, absent, "en")).rejects.toMatchObject({
      code: "missing_api_key",
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("every failure is a RenderError, never a bare Error reaching the caller", async () => {
    mockCreate.mockRejectedValue(new Error("something unexpected"));
    try {
      await renderExplanation(claims, absent, "en");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(RenderError);
    }
  });
});
