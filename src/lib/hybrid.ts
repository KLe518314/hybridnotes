// Hybrid inference orchestration.
//
// Strategy (this is the part the hackathon judges score):
//   1. Try on-device first — Chrome Prompt API / Gemini Nano (`window.LanguageModel`).
//      Private (text never leaves the machine), free, works offline.
//   2. Fall back to the cloud — Firebase AI Logic (Gemini Flash) when on-device
//      is unavailable, errors, or the input is too long for the local context.
//   3. Demo mode — if Firebase is not configured, a local extractive
//      summarizer keeps the whole app demonstrable end to end.

import { summarizeWithCloud, isCloudConfigured } from './cloud';
import {
  getOnDeviceAvailability,
  summarizeOnDevice,
  extractKeywordsOnDevice,
} from './ondevice';
import { extractiveSummary, extractKeywordsLocal } from './fallback';

export type InferenceRoute = 'on-device' | 'cloud' | 'demo';

export interface SummaryResult {
  summary: string;
  route: InferenceRoute;
  /** Why this route was chosen — shown in the UI so judges can follow the routing. */
  routeReason: string;
  durationMs: number;
}

export interface KeywordResult {
  keywords: string[];
  route: InferenceRoute;
  routeReason: string;
  durationMs: number;
}

/** Above this many characters we skip on-device: Nano's context window is small. */
export const ON_DEVICE_MAX_CHARS = 3500;

async function timed<T>(fn: () => Promise<T>): Promise<{ value: T; durationMs: number }> {
  const start = performance.now();
  const value = await fn();
  return { value, durationMs: Math.round(performance.now() - start) };
}

/**
 * Summarize `text`, preferring on-device inference.
 * Never throws for routing reasons — every path degrades gracefully.
 */
export async function summarizeHybrid(text: string): Promise<SummaryResult> {
  const trimmed = text.trim();

  // --- Route 1: on-device -------------------------------------------------
  if (trimmed.length <= ON_DEVICE_MAX_CHARS) {
    const availability = await getOnDeviceAvailability();
    if (availability === 'available' || availability === 'downloadable') {
      try {
        const { value, durationMs } = await timed(() => summarizeOnDevice(trimmed));
        if (value) {
          return {
            summary: value,
            route: 'on-device',
            routeReason:
              availability === 'available'
                ? 'Gemini Nano is built into this Chrome — the text never left your device.'
                : 'Gemini Nano was downloaded on demand and ran locally.',
            durationMs,
          };
        }
      } catch (err) {
        console.warn('[HybridNotes] on-device summarization failed, falling back:', err);
      }
    }
  }

  // --- Route 2: cloud via Firebase AI Logic -------------------------------
  if (isCloudConfigured()) {
    try {
      const { value, durationMs } = await timed(() => summarizeWithCloud(trimmed));
      const reason =
        trimmed.length > ON_DEVICE_MAX_CHARS
          ? `Input is ${trimmed.length.toLocaleString()} characters — beyond Gemini Nano's on-device context, so it went to cloud Gemini Flash.`
          : 'On-device model unavailable in this browser, so cloud Gemini Flash handled it.';
      return { summary: value, route: 'cloud', routeReason: reason, durationMs };
    } catch (err) {
      console.warn('[HybridNotes] cloud summarization failed, using demo mode:', err);
    }
  }

  // --- Route 3: demo fallback ----------------------------------------------
  const { value, durationMs } = await timed(async () => extractiveSummary(trimmed));
  return {
    summary: value,
    route: 'demo',
    routeReason: isCloudConfigured()
      ? 'Both AI routes failed — showing the built-in extractive demo summary.'
      : 'Demo mode: add your Firebase config to enable cloud Gemini; on-device Nano runs automatically in a supporting Chrome.',
    durationMs,
  };
}

/** Extract keywords with the same routing philosophy. */
export async function extractKeywordsHybrid(text: string): Promise<KeywordResult> {
  const trimmed = text.trim();

  if (trimmed.length <= ON_DEVICE_MAX_CHARS) {
    const availability = await getOnDeviceAvailability();
    if (availability === 'available' || availability === 'downloadable') {
      try {
        const { value, durationMs } = await timed(() => extractKeywordsOnDevice(trimmed));
        if (value.length > 0) {
          return {
            keywords: value,
            route: 'on-device',
            routeReason: 'Keywords generated locally by Gemini Nano.',
            durationMs,
          };
        }
      } catch (err) {
        console.warn('[HybridNotes] on-device keyword extraction failed:', err);
      }
    }
  }

  const { value, durationMs } = await timed(async () => extractKeywordsLocal(trimmed));
  return {
    keywords: value,
    route: 'demo',
    routeReason: 'Statistical keyword extraction (works offline, no model needed).',
    durationMs,
  };
}
