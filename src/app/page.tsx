import { readFileSync } from "node:fs";
import { join } from "node:path";
import LetterInput from "@/components/LetterInput";

/**
 * The example letter is a committed synthetic fixture, read at request time on
 * the server. It is the empty state: an invitation to try the thing, for
 * someone who does not have their letter typed out yet.
 */
function loadExampleLetter(): string {
  return readFileSync(join(process.cwd(), "fixtures", "01-snap-closure.txt"), "utf8").trim();
}

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      {/* Prose stays a comfortable measure even though the page itself is
          wide enough for the two-column claims/letter pairing below. */}
      <div className="max-w-[68ch]">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">The Letter</h1>

        <p className="mt-5 text-xl">
          Paste the letter you are afraid of. Hear what it actually says.
        </p>

        <p className="mt-6 text-ink-soft">
          Official letters are written for the office that sent them, not for the
          person who opens them. This reads one back to you in plain words — and
          tells you only what the letter really says.
        </p>
      </div>

      <hr className="my-12 border-rule" />

      <LetterInput exampleLetter={loadExampleLetter()} />

      <hr className="my-12 border-rule" />

      <div className="max-w-[68ch]">
        <h2 className="text-xl font-semibold">Nothing you paste is kept</h2>
        <p className="mt-3 text-ink-soft">
          There are no accounts and no database. Your letter stays in memory only
          while it is being read, and it is never written down, never logged, and
          never shown to anyone else.
        </p>

        <p className="mt-10 text-base text-ink-soft">
          This explains the letter. It is not advice about your case.
        </p>
      </div>
    </main>
  );
}
