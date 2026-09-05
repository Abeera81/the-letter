export default function Home() {
  return (
    <main className="mx-auto max-w-[68ch] px-5 py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        The Letter
      </h1>

      <p className="mt-4 text-xl text-ink">
        Paste the letter you are afraid of. Hear what it actually says.
      </p>

      <p className="mt-6 text-ink-soft">
        Official letters are written for the office that sent them, not for the
        person who opens them. This reads one back to you in plain words, in
        your language, out loud — and tells you only what the letter really
        says.
      </p>

      <hr className="my-10 border-rule" />

      <h2 className="text-xl font-semibold">Nothing you paste is kept</h2>
      <p className="mt-3 text-ink-soft">
        There are no accounts and no database. Your letter stays in memory only
        while it is being explained, and it is never written down, never logged,
        and never shown to anyone else.
      </p>

      <p className="mt-10 text-base text-ink-soft">
        This explains the letter. It is not advice about your case.
      </p>
    </main>
  );
}
