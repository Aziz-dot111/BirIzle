import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import { firebaseAuth, isFirebaseReady } from './firebase';
import { getFirebaseErrorMessage } from './errors';
import type { ServiceResult } from '@/types';

/**
 * Register a new user using Firebase Authentication
 */
export async function registerWithEmail(
  email: string,
  pass: string,
  displayName?: string
): Promise<ServiceResult<User>> {
  if (!isFirebaseReady || !firebaseAuth) {
    return {
      data: null,
      error: 'Firebase tizimi hali sozlanmagan. Iltimos, administrator bilan bog‘laning.',
    };
  }

  try {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), pass);
    if (displayName && displayName.trim()) {
      await firebaseUpdateProfile(cred.user, {
        displayName: displayName.trim(),
      });
    }
    return { data: cred.user, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Log in an existing user using Firebase Authentication
 */
export async function loginWithEmail(
  email: string,
  pass: string
): Promise<ServiceResult<User>> {
  if (!isFirebaseReady || !firebaseAuth) {
    return {
      data: null,
      error: 'Firebase tizimi hali sozlanmagan. Iltimos, administrator bilan bog‘laning.',
    };
  }

  try {
    const cred = await signInWithEmailAndPassword(firebaseAuth, email.trim(), pass);
    return { data: cred.user, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Sign out the currently logged-in user
 */
export async function logOutUser(): Promise<ServiceResult<void>> {
  if (!isFirebaseReady || !firebaseAuth) {
    return { data: undefined, error: null };
  }

  try {
    await firebaseSignOut(firebaseAuth);
    return { data: undefined, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Update current user's display name in Firebase Auth
 */
export async function updateAuthDisplayName(displayName: string): Promise<ServiceResult<void>> {
  if (!isFirebaseReady || !firebaseAuth || !firebaseAuth.currentUser) {
    return { data: undefined, error: null };
  }

  try {
    await firebaseUpdateProfile(firebaseAuth.currentUser, {
      displayName: displayName.trim(),
    });
    return { data: undefined, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Subscribe to Firebase Auth state changes
 */
export function subscribeToAuthState(
  callback: (user: User | null) => void
): Unsubscribe {
  if (!isFirebaseReady || !firebaseAuth) {
    // Return a no-op unsubscribe when unconfigured
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(firebaseAuth, (user) => {
    callback(user);
  });
}

/**
 * Get current authenticated user synchronously from SDK
 */
export function getCurrentAuthUser(): User | null {
  if (!isFirebaseReady || !firebaseAuth) return null;
  return firebaseAuth.currentUser;
}
