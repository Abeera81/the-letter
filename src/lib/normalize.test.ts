import { describe, expect, it } from "vitest";
import { normalize } from "./normalize";

const ch = (code: number) => String.fromCodePoint(code);
const ZERO_WIDTH_SPACE = ch(0x200b);
const BOM = ch(0xfeff);
const SOFT_HYPHEN = ch(0x00ad);
const NON_BREAKING_SPACE = ch(0x00a0);

describe("normalize", () => {
  it("collapses every run of whitespace to one space", () => {
    expect(normalize("a\n\n  b\tc")).toBe("a b c");
  });

  it("trims the ends", () => {
    expect(normalize("  padded  ")).toBe("padded");
  });

  it("lowercases", () => {
    expect(normalize("NOTICE OF ADVERSE ACTION")).toBe("notice of adverse action");
  });

  it("folds curly quotes to ASCII", () => {
    expect(normalize("“household” and ‘composition’")).toBe(
      "\"household\" and 'composition'",
    );
  });

  it("folds every dash variant to a plain hyphen", () => {
    for (const dash of [0x2010, 0x2011, 0x2013, 0x2014, 0x2212]) {
      expect(normalize(`thirty${ch(dash)}day`)).toBe("thirty-day");
    }
  });

  it("strips zero-width characters that survive a PDF copy-paste", () => {
    expect(normalize(`dead${ZERO_WIDTH_SPACE}line${BOM}`)).toBe("deadline");
    expect(normalize(`Sep${SOFT_HYPHEN}tember`)).toBe("september");
  });

  it("folds a non-breaking space like any other whitespace", () => {
    expect(normalize(`September${NON_BREAKING_SPACE}30`)).toBe("september 30");
  });

  it("makes a faithful but reformatted quote match its source", () => {
    const source = "Benefits will terminate\n   effective September 30, 2026.";
    const quote = "Benefits will terminate effective September 30, 2026.";
    expect(normalize(source)).toContain(normalize(quote));
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(normalize("   \n\t ")).toBe("");
  });
});
