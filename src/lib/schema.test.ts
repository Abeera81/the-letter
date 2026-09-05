import { describe, expect, it } from "vitest";
import {
  ClaimSchema,
  ExplainRequestSchema,
  ExtractionResultSchema,
  MAX_LETTER_CHARS,
  extractionJsonSchema,
} from "./schema";

const validClaim = {
  id: "c1",
  kind: "deadline",
  statement: "You must send documents by the twenty-sixth of September.",
  evidence: "You must submit the requested documentation no later than September 26, 2026.",
};

describe("schema boundary", () => {
  it("accepts a well-formed claim", () => {
    expect(ClaimSchema.parse(validClaim)).toEqual(validClaim);
  });

  it("rejects a claim with an invented kind", () => {
    expect(() => ClaimSchema.parse({ ...validClaim, kind: "eligibility" })).toThrow();
  });

  it("rejects a claim carrying no evidence at all", () => {
    expect(() => ClaimSchema.parse({ ...validClaim, evidence: "" })).toThrow();
  });

  it("rejects an extraction result missing its arrays", () => {
    expect(() => ExtractionResultSchema.parse({ documentType: "benefits notice" })).toThrow();
  });

  it("accepts an extraction result with empty arrays", () => {
    const parsed = ExtractionResultSchema.parse({
      documentType: "benefits notice",
      claims: [],
      absent: [],
    });
    expect(parsed.claims).toEqual([]);
  });

  it("holds the request to the documented length limits", () => {
    expect(() => ExplainRequestSchema.parse({ text: "too short", targetLang: "en" })).toThrow();
    expect(() =>
      ExplainRequestSchema.parse({ text: "x".repeat(MAX_LETTER_CHARS + 1), targetLang: "en" }),
    ).toThrow();
    expect(() =>
      ExplainRequestSchema.parse({ text: "x".repeat(200), targetLang: "fr" }),
    ).toThrow();
    expect(
      ExplainRequestSchema.parse({ text: "x".repeat(200), targetLang: "ur" }).targetLang,
    ).toBe("ur");
  });

  it("generates a JSON schema that names every field the gate depends on", () => {
    const json = JSON.stringify(extractionJsonSchema());
    for (const key of ["documentType", "claims", "absent", "evidence", "statement", "kind"]) {
      expect(json).toContain(key);
    }
  });
});

describe("json schema handed to the model", () => {
  it("omits the $schema document key the API does not expect", () => {
    expect(extractionJsonSchema()).not.toHaveProperty("$schema");
  });

  it("carries the verbatim-quote instruction on the evidence field", () => {
    const json = JSON.stringify(extractionJsonSchema());
    expect(json).toContain("character-for-character quote");
  });
});
