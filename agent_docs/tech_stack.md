# Tech Stack — The Letter

Next.js (App Router) + TypeScript + Tailwind. Zod for schema boundaries. Deployed on Vercel.

**AI providers**
- Google Gemini via `@google/genai`, Flash tier, using structured output / response schema. Never parse free text with regex.
- ElevenLabs REST TTS, multilingual model, `POST /v1/text-to-speech/{voice_id}` with the `xi-api-key` header.

**Verify model identifiers against official docs before wiring them.** Do not write version strings from memory — they drift. Record what you used in `MEMORY.md`.

**Persistence: none.** No database, no KV, no cookies, no localStorage. Letter text lives in memory for the duration of a request and is never written to disk or logged. This is a product decision, not an omission.

**Auth: none.** A signup wall defeats the premise.

**Keys** (`.env.local`, gitignored, server-side only — never exposed to the client):
```
GEMINI_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=
```

Both providers are called only from Route Handlers (`/api/explain`, `/api/speak`). Add per-IP rate limiting before public deploy — an open unauthenticated AI endpoint gets drained.

**Slow replay** is `audioElement.playbackRate = 0.7` on the client. Do not re-synthesize.

**Languages:** English, Urdu (RTL transcript — test early, not last), Spanish.

**Commands**
```bash
npm run dev
npm run build   # must pass clean before every deploy
npm run lint
npm run test
```
