// Firebase project configuration for HybridNotes.
//
// ⚠️ PLACEHOLDER VALUES — replace with your own Firebase project's web config
// before the cloud route can work (see README.md → "Set up Firebase").
// The web apiKey in a Firebase config is NOT a secret: it only identifies the
// project. Access is controlled by Firebase security rules + App Check.
//
// Until real values are filled in, HybridNotes runs in Demo mode:
// on-device Gemini Nano still works in a supporting Chrome, and the summary
// falls back to a built-in extractive demo so the UI is fully demonstrable.

import type { FirebaseOptions } from 'firebase/app';

export const firebaseConfig: FirebaseOptions = {
  apiKey: 'AIzaSyBHdPQgO58uqIJEiM5FpwQjJUnPPLQMrik',
  authDomain: 'hybridnotes-2e09e.firebaseapp.com',
  projectId: 'hybridnotes-2e09e',
  storageBucket: 'hybridnotes-2e09e.firebasestorage.app',
  messagingSenderId: '666629043571',
  appId: '1:666629043571:web:d5dddd5677139ca1244106',
};

/** True once real project values have been pasted in above. */
export function isFirebaseConfigured(): boolean {
  return (
    !firebaseConfig.apiKey?.startsWith('YOUR_') &&
    !firebaseConfig.projectId?.startsWith('YOUR_') &&
    Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId)
  );
}
