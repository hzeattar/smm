import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { User } from '../types';

// Resolve Firebase credentials from environment variables (for production / GitHub secret protection)
// or fallback to the local firebase-applet-config.json
const resolvedConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId || '',
};

// Initialize Firebase App instance safely (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(resolvedConfig);
export const auth = getAuth(app);

// Configure Google Provider with authorized scopes
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.addScope('https://www.googleapis.com/auth/gmail.readonly');
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to track sign-in in-flight
let isSigningIn = false;
// In-memory token cache (never stored in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let currentFirebaseUser: FirebaseUser | null = null;

export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    currentFirebaseUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const getCurrentFirebaseUser = (): FirebaseUser | null => {
  return currentFirebaseUser;
};

export const googleSignIn = async (): Promise<{
  firebaseUser: FirebaseUser;
  accessToken: string;
  appUser: User;
}> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('لم يتم استلام مفتاح الوصول من حساب Google.');
    }

    cachedAccessToken = credential.accessToken;
    currentFirebaseUser = result.user;

    // Send credentials to backend to authenticate or register user in Yellow Duck system
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cachedAccessToken}`,
      },
      body: JSON.stringify({
        email: result.user.email,
        displayName: result.user.displayName,
        photoUrl: result.user.photoURL,
        uid: result.user.uid,
        accessToken: cachedAccessToken,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'فشل مزامنة الدخول مع النظام');
    }

    return {
      firebaseUser: result.user,
      accessToken: cachedAccessToken,
      appUser: data.user,
    };
  } catch (error: any) {
    console.error('Google Sign In error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Firebase signout error:', err);
  } finally {
    cachedAccessToken = null;
    currentFirebaseUser = null;
  }
};
