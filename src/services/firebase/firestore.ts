import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type DocumentData,
  type Timestamp,
} from 'firebase/firestore';
import { firestoreDb, isFirebaseReady } from './firebase';
import { getFirebaseErrorMessage } from './errors';
import type {
  UserProfile,
  CreateUserProfileInput,
  UpdateUserProfileInput,
  ServiceResult,
} from '@/types';
import { validateDisplayName, validateEmail } from '@/utils/validation';

const USERS_COLLECTION = 'users';

/**
 * Normalizes Firestore timestamp or date string into ISO 8601 string
 */
function normalizeDate(raw: unknown): string {
  if (!raw) return new Date().toISOString();
  if (typeof raw === 'object' && raw !== null && 'toDate' in raw && typeof (raw as Timestamp).toDate === 'function') {
    return (raw as Timestamp).toDate().toISOString();
  }
  if (typeof raw === 'string') {
    return raw;
  }
  return new Date().toISOString();
}

/**
 * Retrieve user profile from Firestore by UID
 */
export async function getUserProfile(uid: string): Promise<ServiceResult<UserProfile>> {
  if (!uid || !uid.trim()) {
    return { data: null, error: 'Foydalanuvchi identifikatori ko‘rsatilmadi.' };
  }

  if (!isFirebaseReady || !firestoreDb) {
    return {
      data: null,
      error: 'Firebase Firestore tizimi hali sozlanmagan.',
    };
  }

  try {
    const userRef = doc(firestoreDb, USERS_COLLECTION, uid.trim());
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      return { data: null, error: 'Foydalanuvchi profili topilmadi.' };
    }

    const data = snap.data() as DocumentData;
    const profile: UserProfile = {
      uid: data.uid || snap.id,
      email: data.email || '',
      displayName: data.displayName || null,
      photoURL: data.photoURL || null,
      phoneNumber: data.phoneNumber || null,
      createdAt: normalizeDate(data.createdAt),
      updatedAt: normalizeDate(data.updatedAt),
    };

    return { data: profile, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Create a new user profile document in Firestore (/users/{uid})
 */
export async function createUserProfile(
  input: CreateUserProfileInput
): Promise<ServiceResult<UserProfile>> {
  if (!input.uid || !input.uid.trim()) {
    return { data: null, error: 'Yaroqsiz foydalanuvchi identifikatori.' };
  }

  const emailCheck = validateEmail(input.email);
  if (!emailCheck.isValid) {
    return { data: null, error: emailCheck.error || 'Noto‘g‘ri elektron pochta.' };
  }

  const nameCheck = validateDisplayName(input.displayName);
  if (!nameCheck.isValid) {
    return { data: null, error: nameCheck.error || 'Noto‘g‘ri ism.' };
  }

  if (!isFirebaseReady || !firestoreDb) {
    return {
      data: null,
      error: 'Firebase Firestore tizimi hali sozlanmagan.',
    };
  }

  try {
    const userDocRef = doc(firestoreDb, USERS_COLLECTION, input.uid);
    const nowIso = new Date().toISOString();

    const newProfile: UserProfile = {
      uid: input.uid,
      email: input.email.trim(),
      displayName: input.displayName?.trim() || null,
      photoURL: input.photoURL || null,
      phoneNumber: input.phoneNumber || null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Strict write with authenticated UID as document ID
    await setDoc(userDocRef, {
      ...newProfile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { data: newProfile, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Ensures a profile document exists for an authenticated user (Recovery / Self-healing path)
 * Safe to call on login if initial registration profile creation was interrupted.
 */
export async function ensureUserProfileExists(
  uid: string,
  email: string,
  displayName?: string | null
): Promise<ServiceResult<UserProfile>> {
  if (!uid || !uid.trim()) {
    return { data: null, error: 'Yaroqsiz foydalanuvchi identifikatori.' };
  }

  // First try fetching existing profile
  const existing = await getUserProfile(uid);
  if (existing.data) {
    return existing;
  }

  // If document does not exist, create it safely
  return await createUserProfile({
    uid,
    email,
    displayName,
  });
}

/**
 * Update an existing user profile document in Firestore
 */
export async function updateUserProfile(
  uid: string,
  input: UpdateUserProfileInput
): Promise<ServiceResult<UserProfile>> {
  if (!uid || !uid.trim()) {
    return { data: null, error: 'Foydalanuvchi identifikatori topilmadi.' };
  }

  const nameCheck = validateDisplayName(input.displayName);
  if (!nameCheck.isValid) {
    return { data: null, error: nameCheck.error || 'Noto‘g‘ri ism.' };
  }

  if (!isFirebaseReady || !firestoreDb) {
    return {
      data: null,
      error: 'Firebase Firestore tizimi hali sozlanmagan.',
    };
  }

  try {
    const userDocRef = doc(firestoreDb, USERS_COLLECTION, uid.trim());

    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (input.displayName !== undefined) {
      updatePayload.displayName = input.displayName ? input.displayName.trim() : null;
    }
    if (input.photoURL !== undefined) {
      updatePayload.photoURL = input.photoURL;
    }
    if (input.phoneNumber !== undefined) {
      updatePayload.phoneNumber = input.phoneNumber;
    }

    await updateDoc(userDocRef, updatePayload);

    // Fetch refreshed profile
    return await getUserProfile(uid);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}
