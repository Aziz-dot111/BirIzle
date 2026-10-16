/**
 * User Profile data contract stored in Cloud Firestore: /users/{uid}
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
  createdAt: string; // ISO 8601 string timestamp
  updatedAt: string; // ISO 8601 string timestamp
}

/**
 * Payload required to create a new user profile
 */
export interface CreateUserProfileInput {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
}

/**
 * Allowed fields when updating a user profile
 */
export interface UpdateUserProfileInput {
  displayName?: string | null;
  photoURL?: string | null;
  phoneNumber?: string | null;
}
