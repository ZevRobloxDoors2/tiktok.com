import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, browserPopupRedirectResolver } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0065963524",
  appId: "1:319434380307:web:ceaa71804a8e278d2d1be6",
  apiKey: "AIzaSyB86-2ycTmseKsWyrdW2VFKSaielTmYZdM",
  authDomain: "gen-lang-client-0065963524.firebaseapp.com",
  storageBucket: "gen-lang-client-0065963524.firebasestorage.app",
  messagingSenderId: "319434380307",
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
