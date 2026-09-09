import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  Auth,
  browserLocalPersistence,
  setPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAyCxf-7pYjZJE0a3NvhbLnIBPpWee7r7A",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "capacity-count-e83b1.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "capacity-count-e83b1",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "capacity-count-e83b1.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "785910877203",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:785910877203:web:e5110bf33b1e6917efc3e6",
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

export const auth: Auth = getAuth(app);

// Persist auth state in localStorage so getRedirectResult() can recover
// the pending credential after signInWithRedirect() causes a full page reload.
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {});
}

export const googleProvider = new GoogleAuthProvider();
// Force account chooser every time
googleProvider.setCustomParameters({ prompt: "select_account" });
