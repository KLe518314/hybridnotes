// On-device route — Chrome's built-in Prompt API (Gemini Nano).
//
// `window.LanguageModel` is Chrome's experimental built-in AI API:
//   await LanguageModel.availability()            → 'available' | 'downloadable' | 'downloading' | 'unavailable'
//   const session = await LanguageModel.create()  → session.prompt(text) → string
//
// It is not yet in TypeScript's DOM lib, so the minimal surface we use is
// declared here. Everything degrades gracefully: when the API is missing the
// router falls back to the cloud (Firebase AI Logic) or demo mode.

export type OnDeviceAvailability =
  | 'available'
  | 'downloadable'
  | 'downloading'
  | 'unavailable';

interface LanguageModelSession {
  prompt(input: string): Promise<string>;
  destroy(): void;
}

interface LanguageModelFactory {
  availability(): Promise<string>;
  create(options?: {
    monitor?: (m: EventTarget) => void;
  }): Promise<LanguageModelSession>;
}

function getFactory(): LanguageModelFactory | null {
  const w = window as unknown as { LanguageModel?: LanguageModelFactory };
  return typeof w.LanguageModel !== 'undefined' ? w.LanguageModel : null;
}

/** Availability of the on-device model; 'unavailable' when the API is absent. */
export async function getOnDeviceAvailability(): Promise<OnDeviceAvailability> {
  const factory = getFactory();
  if (!factory) return 'unavailable';
  try {
    const status = await factory.availability();
    if (
      status === 'available' ||
      status === 'downloadable' ||
      status === 'downloading'
    ) {
      return status;
    }
    return 'unavailable';
  } catch {
    return 'unavailable';
  }
}

async function promptOnDevice(instruction: string, text: string): Promise<string> {
  const factory = getFactory();
  if (!factory) throw new Error('Prompt API (window.LanguageModel) not present.');
  const session = await factory.create();
  try {
    return (await session.prompt(`${instruction}\n\n---\n${text}`)).trim();
  } finally {
    session.destroy();
  }
}

/** Summarize fully on-device with Gemini Nano. Throws if it cannot run. */
export async function summarizeOnDevice(text: string): Promise<string> {
  const summary = await promptOnDevice(
    'Summarize the following note in 2-4 sentences. Keep key facts, names, dates and numbers. Answer with the summary only.',
    text,
  );
  if (!summary) throw new Error('On-device model returned an empty summary.');
  return summary;
}

/** Extract up to 8 keywords on-device; parses the model's list output. */
export async function extractKeywordsOnDevice(text: string): Promise<string[]> {
  const raw = await promptOnDevice(
    'List the 8 most important keywords or key phrases in the following note, comma-separated, no numbering, no explanation.',
    text,
  );
  return raw
    .split(/[,\n]/)
    .map((k) => k.replace(/^[\s\-*\d.]+/, '').trim())
    .filter((k) => k.length > 1)
    .slice(0, 8);
}
