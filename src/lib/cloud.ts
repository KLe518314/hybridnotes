// Cloud route — Firebase AI Logic with *hybrid* inference params.
//
// Verified against firebase@13.4.0 (@firebase/ai) type definitions:
//
//   import { getAI, getGenerativeModel, GoogleAIBackend, InferenceMode } from 'firebase/ai';
//
//   const ai = getAI(app, { backend: new GoogleAIBackend() });
//   const model = getGenerativeModel(ai, {
//     mode: InferenceMode.PREFER_ON_DEVICE,               // HybridParams.mode
//     inCloudParams: { model: 'gemini-2.5-flash' },       // HybridParams.inCloudParams
//   });
//   const result = await model.generateContent(prompt);
//   result.response.text();                               // string
//   result.response.inferenceSource;                      // 'on_device' | 'in_cloud' | undefined
//
// With PREFER_ON_DEVICE the SDK itself tries the on-device model (Chrome's
// Gemini Nano via the Prompt API) and falls back to cloud Gemini Flash —
// that SDK-level hybrid behaviour is the core of this hackathon entry.
// Our own router (hybrid.ts) additionally calls the Prompt API directly so
// the UI can show *why* a route was chosen.

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
  type GenerativeModel,
} from 'firebase/ai';
import { firebaseConfig, isFirebaseConfigured } from '../firebase-config';

export { isFirebaseConfigured as isCloudConfigured };

const CLOUD_MODEL = 'gemini-2.5-flash';

let cachedApp: FirebaseApp | null = null;
let cachedModel: GenerativeModel | null = null;
/** inferenceSource of the most recent cloud-route response, for the UI badge. */
let lastInferenceSource: string | undefined;

export function getLastInferenceSource(): string | undefined {
  return lastInferenceSource;
}

function getHybridModel(): GenerativeModel {
  if (cachedModel) return cachedModel;
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured (placeholder config).');
  }
  cachedApp = getApps()[0] ?? initializeApp(firebaseConfig);
  const ai = getAI(cachedApp, { backend: new GoogleAIBackend() });
  cachedModel = getGenerativeModel(ai, {
    mode: InferenceMode.PREFER_ON_DEVICE,
    inCloudParams: { model: CLOUD_MODEL },
  });
  return cachedModel;
}

/**
 * Summarize via Firebase AI Logic (hybrid: SDK prefers on-device, falls back
 * to cloud Gemini Flash). Throws on failure — the router in hybrid.ts catches
 * and degrades to demo mode.
 */
export async function summarizeWithCloud(text: string): Promise<string> {
  const model = getHybridModel();
  // Must be called from a user gesture if a model download is needed —
  // in HybridNotes this runs from the Summarize button click, so we're fine.
  await model.initializeDeviceModel().catch(() => undefined);
  const result = await model.generateContent(
    [
      'Summarize the following note in 2-4 sentences. Keep the key facts,',
      'names, dates and numbers. Answer with the summary only.\n\n---\n',
      text,
    ].join(''),
  );
  lastInferenceSource = result.response.inferenceSource;
  const summary = result.response.text().trim();
  if (!summary) throw new Error('Cloud model returned an empty summary.');
  return summary;
}
