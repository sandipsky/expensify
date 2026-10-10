import { initializeApp } from 'firebase/app'
import { ReCaptchaEnterpriseProvider, initializeAppCheck } from 'firebase/app-check'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { config } from '@/config/env'

// The Firebase app, App Check and Auth, which every page needs to know who is
// logged in. Firestore, much the larger part of the SDK, starts in
// ./firestore.ts with the first data query instead (docs/requirements.md §10).
// Only the features' *.api.ts files and the auth session use these;
// components and queries never import firebase/* themselves.

export const firebaseApp = initializeApp(config.firebase)

// App Check makes Firebase refuse requests that don't come from this site.
// The debug flag must be set before App Check starts; the console then
// prints a token to register in the Firebase console (docs/firebase.md).
if (config.appCheck.debug) {
  ;(self as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = true
}
if (config.appCheck.siteKey) {
  initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(config.appCheck.siteKey),
    isTokenAutoRefreshEnabled: true,
  })
}

// Sessions persist in IndexedDB until the user logs out, and every tab
// shares them: logging out in one tab logs out the others.
export const auth = getAuth(firebaseApp)
if (config.useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
}
