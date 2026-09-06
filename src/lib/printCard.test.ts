import { describe, expect, it } from "vitest";
import { buildPrintCard } from "./printCard";
import type { Claim } from "./schema";

function claim(overrides: Partial<Claim> & Pick<Claim, "id" | "kind" | "statement">): Claim {
  return { evidence: "irrelevant to this test", ...overrides };
}

describe("buildPrintCard", () => {
  it("buckets claims into the four F10 sections by kind", () => {
    const verified: Claim[] = [
      claim({ id: "c1", kind: "what_happened", statement: "Your case was closed." }),
      claim({ id: "c2", kind: "deadline", statement: "Benefits end September 30." }),
      claim({ id: "c3", kind: "action", statement: "Submit the Interim Report Form." }),
      claim({ id: "c4", kind: "contact", statement: "Return documents to the county office." }),
    ];

    const card = buildPrintCard("benefits notice", verified, []);

    expect(card.documentType).toBe("benefits notice");
    expect(card.sections).toEqual([
      { heading: "What happened", lines: ["Your case was closed."] },
      { heading: "Deadline", lines: ["Benefits end September 30."] },
      { heading: "What to bring", lines: ["Submit the Interim Report Form."] },
      { heading: "Where to go", lines: ["Return documents to the county office."] },
    ]);
  });

  it("folds why and amount claims into What happened alongside what_happened", () => {
    const verified: Claim[] = [
      claim({ id: "c1", kind: "why", statement: "The household missed a reporting deadline." }),
      claim({ id: "c2", kind: "amount", statement: "The total due is $872.50." }),
    ];

    const card = buildPrintCard("bill", verified, []);
    const section = card.sections.find((s) => s.heading === "What happened");
    expect(section?.lines).toEqual([
      "The household missed a reporting deadline.",
      "The total due is $872.50.",
    ]);
  });

  it("falls back to the matching absent note when a bucket is empty", () => {
    const card = buildPrintCard("bill", [], [
      { field: "phone", note: "The statement does not provide a contact phone number." },
    ]);
    const whereToGo = card.sections.find((s) => s.heading === "Where to go");
    expect(whereToGo?.lines).toEqual(["The statement does not provide a contact phone number."]);
  });

  it("omits a section entirely when it is empty and there is no matching absent field", () => {
    // "What to bring" has no corresponding ABSENT_FIELDS entry — an empty
    // action bucket must not be padded with an unrelated absent note, and
    // must not silently claim nothing is needed either.
    const card = buildPrintCard("bill", [], [
      { field: "deadline", note: "The statement does not give a due date." },
    ]);
    expect(card.sections.some((s) => s.heading === "What to bring")).toBe(false);
  });

  it("omits a section when it is empty and no absent field applies either", () => {
    const card = buildPrintCard("bill", [], []);
    expect(card.sections).toEqual([]);
  });

  it("reproduces the real, live-captured fixture-2 result: three action-less, contact-less claims, absent-fallback firing for Where to go", () => {
    // Exact data from the live gemini-3.5-flash run captured during P6
    // verification (fixtures/02-clinic-bill.txt) — not synthesized, so this
    // proves the fallback fires on a real extraction result, not just a
    // constructed test case.
    const verified: Claim[] = [
      claim({ id: "c1", kind: "amount", statement: "The total amount due is $872.50." }),
      claim({ id: "c2", kind: "deadline", statement: "Payment is due upon receipt of the statement." }),
      claim({
        id: "c3",
        kind: "action",
        statement: "Unpaid accounts may be referred to an outside collection agency.",
      }),
      claim({
        id: "c4",
        kind: "action",
        statement:
          "Financial assistance may be available, and patients can request an application at their next visit.",
      }),
    ];
    const absent = [
      {
        field: "explanation" as const,
        note: "The statement lists charge categories but does not explain what specific visit, service, or medical condition caused the charges.",
      },
      { field: "phone" as const, note: "The statement does not provide a contact phone number." },
      { field: "contact_name" as const, note: "The statement does not identify a specific contact person." },
    ];

    const card = buildPrintCard("patient account statement", verified, absent);

    expect(card.sections).toEqual([
      { heading: "What happened", lines: ["The total amount due is $872.50."] },
      { heading: "Deadline", lines: ["Payment is due upon receipt of the statement."] },
      {
        heading: "What to bring",
        lines: [
          "Unpaid accounts may be referred to an outside collection agency.",
          "Financial assistance may be available, and patients can request an application at their next visit.",
        ],
      },
      {
        heading: "Where to go",
        lines: [
          "The statement does not provide a contact phone number.",
          "The statement does not identify a specific contact person.",
        ],
      },
    ]);
  });
});
