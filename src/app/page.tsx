import { readFileSync } from "node:fs";
import { join } from "node:path";
import LetterInput from "@/components/LetterInput";
import TrustPanel from "@/components/TrustPanel";

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
    <main className="mx-auto max-w-6xl px-5 py-12 sm:py-16">
      {/* Prose stays a comfortable measure even though the page itself is
          wide enough for the two-column claims/letter pairing below.
          print:hidden here and below: PrintCard (P8) is the only thing that
          should reach paper when a result is on screen. */}
      <div className="max-w-[62ch] print:hidden">
        <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Turn a letter you dread
          <br className="hidden sm:block" /> into words you understand.
        </h1>

        <p className="mt-6 text-xl text-ink-soft">
          Paste the letter you are afraid of. Hear what it actually says, in your
          own language — only what is really written there, and nothing else.
        </p>
      </div>

      <div className="mt-12 print:hidden sm:mt-14" />

      <LetterInput exampleLetter={loadExampleLetter()} trustPanel={<TrustPanel />} />

      <div className="mt-16 max-w-[62ch] rounded-2xl border border-rule bg-paper-raised p-6 shadow-card print:hidden sm:p-8">
        <h2 className="text-xl font-semibold">Nothing you paste is kept</h2>
        <p className="mt-3 text-ink-soft">
          There are no accounts and no database. Your letter stays in memory only
          while it is being read, and it is never written down, never logged, and
          never shown to anyone else.
        </p>
      </div>

      <p className="mt-8 max-w-[62ch] text-base text-ink-soft print:hidden">
        This explains the letter. It is not advice about your case.
      </p>
    </main>
  );
}
