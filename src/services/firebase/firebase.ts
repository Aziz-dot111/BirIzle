import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import type { FirebaseConfigStatus } from '@/types';

// Read Vite environment variables
const rawConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

/**
 * Validates whether a value is present and not a dummy placeholder from .env.example
 */
function isConfigValueValid(val?: string): boolean {
  if (!val) return false;
  const trimmed = val.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('your-') || trimmed.includes('placeholder')) return false;
  return true;
}

const requiredKeys: (keyof typeof rawConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const missingKeys = requiredKeys.filter((key) => !isConfigValueValid(rawConfig[key]));
const isConfigured = missingKeys.length === 0;

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;

if (isConfigured) {
  try {
    // Prevent duplicate app initialization (singleton pattern)
    appInstance = getApps().length > 0 ? getApp() : initializeApp(rawConfig);
    authInstance = getAuth(appInstance);
    firestoreInstance = getFirestore(appInstance);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
} else if (import.meta.env.DEV) {
  console.info(
    '[Bir Izle Firebase Diagnostic] Firebase has not been configured yet.\n' +
    'The application is running in unconfigured mode. Missing variables:\n' +
    missingKeys.map((k) => ` - VITE_FIREBASE_${k.replace(/[A-Z]/g, (l) => `_${l}`).toUpperCase()}`).join('\n') +
    '\nRefer to .env.example and README.md for instructions.'
  );
}

/**
 * Returns safe diagnostic info about Firebase configuration status without exposing secrets
 */
export function getFirebaseConfigStatus(): FirebaseConfigStatus {
  return {
    isConfigured,
    missingKeys: missingKeys.map((k) => `VITE_FIREBASE_${k.replace(/[A-Z]/g, (l) => `_${l}`).toUpperCase()}`),
    projectId: rawConfig.projectId && isConfigValueValid(rawConfig.projectId) ? rawConfig.projectId : undefined,
    authDomain: rawConfig.authDomain && isConfigValueValid(rawConfig.authDomain) ? rawConfig.authDomain : undefined,
  };
}

export const firebaseApp = appInstance;
export const firebaseAuth = authInstance;
export const firestoreDb = firestoreInstance;
export const isFirebaseReady = isConfigured;
