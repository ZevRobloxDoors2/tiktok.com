import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0065963524",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:319434380307:web:ceaa71804a8e278d2d1be6",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "", 
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0065963524.firebaseapp.com",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0065963524.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "319434380307",
  measurementId: ""
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-centraltok-20b3b741-dd0c-4874-8036-490f35162ac6");

// Use the popup redirect resolver to support iframe authentication
export const signInWithGoogle = async () => {

  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};
