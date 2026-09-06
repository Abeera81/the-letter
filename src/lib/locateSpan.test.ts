import { describe, expect, it } from "vitest";
import { locateSpan } from "./locateSpan";

describe("locateSpan", () => {
  it("finds a byte-exact quote", () => {
    const source = "Your case was closed on September 1, 2026 for missing an appointment.";
    const evidence = "closed on September 1, 2026";
    const span = locateSpan(source, evidence);
    expect(span).toEqual({ start: source.indexOf(evidence), end: source.indexOf(evidence) + evidence.length });
    expect(source.slice(span!.start, span!.end)).toBe(evidence);
  });

  it("tolerates a curly-quote source against a straight-quote evidence", () => {
    const source = "The office wrote “your appointment was missed” in the notice.";
    const evidence = 'your appointment was missed';
    const span = locateSpan(source, evidence);
    expect(span).not.toBeNull();
    expect(source.slice(span!.start, span!.end)).toBe('“your appointment was missed”'.slice(1, -1));
  });

  it("tolerates a dash glyph difference", () => {
    const source = "You must respond within 10–90 days.";
    const evidence = "within 10-90 days";
    const span = locateSpan(source, evidence);
    expect(span).not.toBeNull();
    expect(source.slice(span!.start, span!.end)).toBe("within 10–90 days");
  });

  it("tolerates a collapsed line break as whitespace", () => {
    const source = "Your benefits\nwill end on the date above.";
    const evidence = "Your benefits will end";
    const span = locateSpan(source, evidence);
    expect(span).not.toBeNull();
    expect(source.slice(span!.start, span!.end)).toBe("Your benefits\nwill end");
  });

  it("is case-insensitive on the tolerant fallback path", () => {
    const source = "THE CASE IS CLOSED effective immediately.";
    const evidence = "the case is closed";
    const span = locateSpan(source, evidence);
    expect(span).not.toBeNull();
    expect(source.slice(span!.start, span!.end).toLowerCase()).toBe(evidence.toLowerCase());
  });

  it("returns null when the evidence is not in the source at all", () => {
    const source = "This letter says nothing about a deadline.";
    const evidence = "your appeal must be filed within ninety days";
    expect(locateSpan(source, evidence)).toBeNull();
  });

  it("returns null for empty evidence", () => {
    expect(locateSpan("Some source text.", "")).toBeNull();
  });

  it("does not throw on regex-special characters in evidence", () => {
    const source = "The amount due is $872.50 (see enclosed statement).";
    const evidence = "$872.50 (see enclosed statement)";
    const span = locateSpan(source, evidence);
    expect(span).not.toBeNull();
    expect(source.slice(span!.start, span!.end)).toBe(evidence);
  });
});
