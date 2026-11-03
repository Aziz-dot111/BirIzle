/**
 * Reusable Firebase initialization module
 * Exports singleton instances for Firebase App, Authentication, and Cloud Firestore.
 */
export {
  firebaseApp,
  firebaseAuth,
  firestoreDb,
  firebaseAppCheck,
  isFirebaseReady,
  getFirebaseConfigStatus,
} from '@/services/firebase/firebase';

// Re-export common services for convenience
export * from '@/services/firebase/auth';
export * from '@/services/firebase/firestore';
export * from '@/services/firebase/catalog';
export * from '@/services/firebase/errors';
