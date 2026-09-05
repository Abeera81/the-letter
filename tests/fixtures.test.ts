import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const FIXTURE_DIR = join(process.cwd(), "fixtures");

describe("demo fixtures", () => {
  const names = readdirSync(FIXTURE_DIR).filter((f) => f.endsWith(".txt"));

  it("ships all four letters from the PRD", () => {
    expect(names.sort()).toEqual([
      "01-snap-closure.txt",
      "02-clinic-bill.txt",
      "03-housing-notice.txt",
      "04-hostile-injection.txt",
    ]);
  });

  it.each(names)("%s is marked synthetic and is a usable length", (name) => {
    const text = readFileSync(join(FIXTURE_DIR, name), "utf8");
    expect(text).toContain("SYNTHETIC");
    // The input contract is 50–20,000 characters.
    expect(text.length).toBeGreaterThan(50);
    expect(text.length).toBeLessThan(20_000);
  });

  it("keeps a hostile fixture carrying an injection attempt", () => {
    const text = readFileSync(join(FIXTURE_DIR, "04-hostile-injection.txt"), "utf8");
    expect(text.toLowerCase()).toContain("ignore all previous instructions");
  });
});
