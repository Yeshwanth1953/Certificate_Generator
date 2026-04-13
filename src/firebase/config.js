// src/firebase/config.js
// ─────────────────────────────────────────────────────────────────────────────
// Initializes Firebase: Auth + Firestore only.
// Firebase Storage is NOT used — templates are stored as base64 in localStorage.
// This keeps the app working on Firebase's free Spark plan.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);    // Login, signup, email verification
export const db   = getFirestore(app); // Certificate records + user profiles
export const storage = getStorage(app); // File uploads (templates, photos)

export default app;
