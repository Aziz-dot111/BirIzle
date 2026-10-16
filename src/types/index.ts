export * from './user';

/**
 * Diagnostic status of the Firebase configuration
 */
export interface FirebaseConfigStatus {
  isConfigured: boolean;
  missingKeys: string[];
  projectId?: string;
  authDomain?: string;
}

/**
 * Common async result wrapper
 */
export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}
