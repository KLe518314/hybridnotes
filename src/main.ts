import './style.css';
import {
  summarizeHybrid,
  extractKeywordsHybrid,
  type SummaryResult,
  type KeywordResult,
} from './lib/hybrid';
import { getOnDeviceAvailability } from './lib/ondevice';
import { isFirebaseConfigured } from './firebase-config';

const SAMPLE_NOTE = `Team sync — Project Falcon launch readiness (Nov 18)

Marketing confirmed the launch date: December 12. The landing page copy is
final, and the pricing page goes live on December 5 after legal sign-off.
Anna flagged that the onboarding email sequence still uses the old product
name in two places; she will fix that by Friday.

Engineering reported that the payment integration with Stripe passed all
sandbox tests. The remaining blocker is the invoice PDF generator, which
times out on files larger than 40 pages. Miguel is testing a streaming
renderer and expects results by November 25. If the fix misses that date,
the fallback is to cap invoice attachments at 40 pages for launch.

Support asked for a freeze on new feature requests from December 1 so the
team can focus on launch stability. Everyone agreed. The next sync is on
November 27 at 10:00, where go/no-go criteria for the December 12 launch
will be decided.`;

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <main class="wrap">
    <header>
      <h1>HybridNotes</h1>
      <p class="tagline">
        Paste a long note, get a summary. <strong>On-device first</strong> —
        Gemini Nano in your browser — with <strong>cloud Gemini</strong> via
        Firebase AI Logic when the note is too long or the local model is away.
      </p>
      <div class="status" id="status">
        <span class="chip" id="chip-device">On-device: checking…</span>
        <span class="chip" id="chip-cloud">Cloud: checking…</span>
      </div>
    </header>

    <section class="card">
      <label for="note">Your note</label>
      <textarea id="note" rows="12" placeholder="Paste a long note, meeting transcript, article…"></textarea>
      <div class="row">
        <span id="count" class="muted">0 characters</span>
        <span class="spacer"></span>
        <button id="sample" type="button" class="ghost">Load sample note</button>
        <button id="keywords" type="button" class="ghost">Extract keywords</button>
        <button id="summarize" type="button" class="primary">Summarize</button>
      </div>
    </section>

    <section class="card hidden" id="result-card">
      <div class="row">
        <h2>Summary</h2>
        <span class="spacer"></span>
        <span id="route-badge" class="badge"></span>
      </div>
      <p id="summary" class="summary"></p>
      <p id="route-reason" class="muted"></p>
    </section>

    <section class="card hidden" id="keyword-card">
      <h2>Keywords</h2>
      <div id="keyword-chips" class="chips"></div>
      <p id="keyword-reason" class="muted"></p>
    </section>

    <footer class="muted">
      Built for #BuildHybridAI 2026 · Firebase AI Logic hybrid inference
      (InferenceMode.PREFER_ON_DEVICE) + Chrome Prompt API (Gemini Nano) ·
      Demo mode needs no accounts and no keys.
    </footer>
  </main>
`;

const noteEl = document.querySelector<HTMLTextAreaElement>('#note')!;
const countEl = document.querySelector('#count')!;
const summarizeBtn = document.querySelector<HTMLButtonElement>('#summarize')!;
const keywordsBtn = document.querySelector<HTMLButtonElement>('#keywords')!;

function updateCount(): void {
  countEl.textContent = `${noteEl.value.length.toLocaleString()} characters`;
}
noteEl.addEventListener('input', updateCount);
updateCount();

document.querySelector('#sample')!.addEventListener('click', () => {
  noteEl.value = SAMPLE_NOTE;
  updateCount();
  noteEl.focus();
});

// --- Status chips ------------------------------------------------------------
void (async () => {
  const availability = await getOnDeviceAvailability();
  const chip = document.querySelector('#chip-device')!;
  chip.textContent =
    availability === 'available'
      ? 'On-device: Gemini Nano ready'
      : availability === 'unavailable'
        ? 'On-device: not available in this browser'
        : `On-device: Gemini Nano ${availability}`;
  chip.classList.add(availability === 'unavailable' ? 'off' : 'on');

  const cloudChip = document.querySelector('#chip-cloud')!;
  const configured = isFirebaseConfigured();
  cloudChip.textContent = configured
    ? 'Cloud: Firebase AI Logic configured'
    : 'Cloud: demo mode (no Firebase config yet)';
  cloudChip.classList.add(configured ? 'on' : 'off');
})();

// --- Actions -------------------------------------------------------------------
function routeLabel(route: SummaryResult['route']): string {
  return route === 'on-device'
    ? '⚡ ON-DEVICE · Gemini Nano'
    : route === 'cloud'
      ? '☁️ CLOUD · Gemini Flash via Firebase AI Logic'
      : '🧪 DEMO · built-in extractive fallback';
}

function setBusy(busy: boolean): void {
  summarizeBtn.disabled = busy;
  keywordsBtn.disabled = busy;
  summarizeBtn.textContent = busy ? 'Thinking…' : 'Summarize';
}

summarizeBtn.addEventListener('click', async () => {
  if (!noteEl.value.trim()) {
    noteEl.focus();
    return;
  }
  setBusy(true);
  try {
    const result: SummaryResult = await summarizeHybrid(noteEl.value);
    document.querySelector('#result-card')!.classList.remove('hidden');
    document.querySelector('#summary')!.textContent = result.summary;
    const badge = document.querySelector<HTMLSpanElement>('#route-badge')!;
    badge.textContent = routeLabel(result.route);
    badge.dataset.route = result.route;
    document.querySelector('#route-reason')!.textContent =
      `${result.routeReason} (${result.durationMs} ms)`;
  } finally {
    setBusy(false);
  }
});

keywordsBtn.addEventListener('click', async () => {
  if (!noteEl.value.trim()) {
    noteEl.focus();
    return;
  }
  setBusy(true);
  try {
    const result: KeywordResult = await extractKeywordsHybrid(noteEl.value);
    document.querySelector('#keyword-card')!.classList.remove('hidden');
    document.querySelector('#keyword-chips')!.innerHTML = result.keywords
      .map((k) => `<span class="kchip">${k.replace(/</g, '&lt;')}</span>`)
      .join('');
    document.querySelector('#keyword-reason')!.textContent =
      `${result.routeReason} (${result.durationMs} ms)`;
  } finally {
    setBusy(false);
  }
});
