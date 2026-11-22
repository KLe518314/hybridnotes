# HybridNotes — on-device first, cloud when it counts

**Entry for [#BuildHybridAI 2026](https://firebasehybridaihackathon.devpost.com/)** (Google / Firebase, hosted on Devpost)
$30,000 in cash prizes · Submissions close **Nov 30, 2026, 5:00 PM EST** · Category target: **Best Web/Chrome App ($3,000)** + Grand Prize pool

## What it does

Paste a long note — meeting minutes, an article, a transcript — and HybridNotes
summarizes it and extracts keywords. The twist is *where* the AI runs:

- **Short note + capable browser → on-device.** Chrome's built-in Gemini Nano
  (Prompt API) summarizes locally. The text never leaves the machine: private,
  free, and it works offline.
- **Long note, or no local model → cloud.** Firebase AI Logic routes to cloud
  Gemini Flash, which handles inputs far beyond Nano's context window.
- **No Firebase project configured → demo mode.** A built-in extractive
  summarizer keeps the whole app demonstrable end to end, no accounts, no keys.

Every result carries a visible badge — `⚡ ON-DEVICE`, `☁️ CLOUD`, or
`🧪 DEMO` — plus a plain-language explanation of *why* that route was chosen
and how long it took. The routing itself is the demo.

## Hybrid architecture

```
                        ┌────────────────────────────────────────────┐
                        │              HybridNotes UI                │
                        │  note in → summary + keywords + route badge │
                        └──────────────────┬─────────────────────────┘
                                           │
                                src/lib/hybrid.ts  (router)
                                           │
              ┌────────────────────────────┼─────────────────────────────┐
              │                            │                             │
   input ≤ 3,500 chars          input too long / local fails     no config / all fail
              │                            │                             │
   ┌──────────▼───────────┐   ┌────────────▼─────────────┐   ┌───────────▼───────────┐
   │  ROUTE 1 · ON-DEVICE │   │   ROUTE 2 · CLOUD        │   │  ROUTE 3 · DEMO       │
   │  src/lib/ondevice.ts │   │   src/lib/cloud.ts       │   │  src/lib/fallback.ts  │
   │  window.LanguageModel│   │   Firebase AI Logic      │   │  extractive summary + │
   │  (Chrome Prompt API, │   │   getGenerativeModel()   │   │  statistical keywords │
   │   Gemini Nano)       │   │   with HybridParams:     │   │  (pure local, offline)│
   │                      │   │   mode: PREFER_ON_DEVICE │   │                       │
   │                      │   │   inCloud: gemini-2.5-   │   │                       │
   │                      │   │   flash                  │   │                       │
   └──────────────────────┘   └──────────────────────────┘   └───────────────────────┘
```

Two layers of hybrid behaviour, on purpose:

1. **App-level routing** (`hybrid.ts`) — we call the Prompt API directly so the
   UI can explain the decision (input length, model availability, timing).
2. **SDK-level hybrid** (`cloud.ts`) — Firebase AI Logic itself is configured
   with `InferenceMode.PREFER_ON_DEVICE`, so even the "cloud" call prefers the
   on-device model and falls back to cloud Gemini Flash; the response's
   `inferenceSource` field reports which side actually served it.

## Tech

- Vite + TypeScript (strict), vanilla DOM — no framework weight
- `firebase` v13 (`firebase/app`, `firebase/ai`) — verified against the real
  `@firebase/ai` type definitions: `getAI(app, { backend: new GoogleAIBackend() })`,
  `getGenerativeModel(ai, HybridParams)`, `GenerativeModel.generateContent()`,
  `response.inferenceSource`, `model.initializeDeviceModel()`
- Chrome Prompt API (`window.LanguageModel`) for direct Gemini Nano access

## Run it locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # tsc (strict) + production build → dist/
```

- **Demo mode works immediately** — no setup. Click "Load sample note", then
  "Summarize".
- **On-device mode** needs a Chrome with Gemini Nano (chrome://flags →
  "Prompt API for Gemini Nano" / optimization-guide on-device model, or a
  recent stable Chrome where it has rolled out). The status chip at the top
  tells you if Nano is ready.
- **Cloud mode** needs the Firebase setup below.

## Set up Firebase (one-time, ~10 minutes, free Spark plan is enough)

> These steps happen in the Firebase console in a browser — they must be done
> by the account owner (kle) while signed in with his Google account.

1. Go to <https://console.firebase.google.com> → **Add project** → name it
   `hybridnotes` (any name works) → no need to enable Google Analytics.
2. In the project: **Build → AI Logic** → **Get started** → choose the
   **Gemini Developer API** backend (free tier) and enable it. This provisions
   the Gemini API for the project.
3. **Project settings → General → Your apps → Web app (`</>`)** → register the
   app (nickname `hybridnotes-web`) → copy the `firebaseConfig` object it shows.
4. Paste those values into [`src/firebase-config.ts`](src/firebase-config.ts),
   replacing every `YOUR_…` placeholder. (The web apiKey is an identifier, not
   a secret — access is governed by Firebase rules/App Check.)
5. Optional but recommended for a public demo: **Build → App Check** → register
   the web app with reCAPTCHA v3, and enforce App Check for AI Logic.
6. Rebuild/redeploy: `npm run build`, then host `dist/` anywhere static
   (Firebase Hosting: `npx firebase-tools init hosting` → `npx firebase-tools deploy`).

## Devpost submission checklist

Deadline: **Nov 30, 2026, 5:00 PM EST**. Judging: technical implementation of
Firebase AI Logic hybrid inference, design, potential impact, idea quality.

Project materials (done in this repo):

- [x] Working web app with real hybrid routing (on-device ⇄ cloud ⇄ demo)
- [x] Public-repo-ready source, strict TypeScript, builds clean
- [ ] Live demo URL (after Firebase Hosting deploy — see above)
- [ ] Demo video, under 3 minutes (script below)
- [ ] Devpost project description (draft below)

Steps that require kle personally / a browser session (cannot be automated):

- [ ] **Create a Devpost account** (or sign in) at devpost.com with kle's
      identity and **Join** the #BuildHybridAI 2026 hackathon
- [ ] **Create the Firebase project** (console steps above) and paste the real
      config into `src/firebase-config.ts`
- [ ] **Push this repo to a public GitHub repo** under kle's account
      (KLe518314) — Devpost requires a public code link
- [ ] **Record/upload the demo video** (YouTube/Vimeo link goes on the form)
- [ ] **Fill and submit the Devpost project form** before the deadline and
      double-check eligibility in the official rules on the hackathon page
      (Devpost's standard country exclusions apply; mainland China is not on
      Devpost's standard exclusion list, but confirm on the official rules
      page at submission time)

### Demo video script (≈2 minutes)

1. (0:00) Open the app, point at the status chips: Nano ready, cloud configured.
2. (0:20) Load the sample note → Summarize → `⚡ ON-DEVICE` badge. "This summary
   was computed by Gemini Nano inside Chrome. The text never left the laptop —
   it works in airplane mode."
3. (0:50) Paste a very long document (>3,500 chars) → Summarize →
   `☁️ CLOUD` badge with the reason line. "Too long for Nano's context, so
   Firebase AI Logic took it to Gemini Flash — one SDK, hybrid by design."
4. (1:20) Extract keywords on the short note → on-device chips.
5. (1:40) Show `src/lib/hybrid.ts` + the `PREFER_ON_DEVICE` HybridParams in
   `src/lib/cloud.ts`. Close on the idea: private-by-default AI, cloud only
   when it earns its keep.

### Devpost description (draft)

> HybridNotes is a note summarizer that treats the cloud as a fallback, not a
> default. Short notes are summarized by Gemini Nano inside Chrome — private,
> offline, free. Long notes are handed to cloud Gemini Flash through Firebase
> AI Logic, configured with InferenceMode.PREFER_ON_DEVICE so the SDK itself
> also prefers the device. Every answer is labelled with the route that
> produced it and why, turning hybrid inference from an implementation detail
> into the product's visible promise: your words stay on your device unless
> they genuinely need the cloud.

## Project layout

```
src/
  firebase-config.ts   ← paste your Firebase web config here (placeholders now)
  lib/
    hybrid.ts          ← router: picks on-device / cloud / demo, explains why
    ondevice.ts        ← Chrome Prompt API (window.LanguageModel) wrapper
    cloud.ts           ← Firebase AI Logic hybrid model (PREFER_ON_DEVICE)
    fallback.ts        ← demo mode: extractive summary + keyword statistics
  main.ts              ← UI
  style.css
```

## Notes

- Entry cost so far: **$0** (npm packages + free tiers only; nothing registered,
  nothing submitted yet).
- Gemini model name in `cloud.ts` is `gemini-2.5-flash`; adjust to whatever the
  AI Logic console lists for the project if it differs.
