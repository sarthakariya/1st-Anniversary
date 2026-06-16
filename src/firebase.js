import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || 'ai-studio-58ca4cee-09be-4023-9c0e-41c555a63613');
export const auth = getAuth(app);
export const storage = getStorage(app);
export const provider = new GoogleAuthProvider();

// Anonymous authentication is disabled by default in the Firebase console.
// Since this application's Firestore security rules allow read/write access without sign-in,
// we do not need to call signInAnonymously. If you decide to restrict access later,
// you can enable Anonymous Auth in the Firebase Console (Authentication -> Sign-in method).
// signInAnonymously(auth).catch(err => console.log("Anon auth failed", err));

export { signInWithPopup, onAuthStateChanged };
