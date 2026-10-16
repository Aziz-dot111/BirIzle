/**
 * Validation utilities with Uzbek Latin user-facing error messages
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  if (!trimmed) {
    return { isValid: false, error: 'Elektron pochta manzilini kiriting.' };
  }
  // Standard RFC 5322 simplified pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return { isValid: false, error: 'Elektron pochta manzili noto‘g‘ri formatda kiritildi.' };
  }
  return { isValid: true };
}

/**
 * Validate password requirements
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Parolni kiriting.' };
  }
  if (password.length < 6) {
    return { isValid: false, error: 'Parol kamida 6 ta belgidan iborat bo‘lishi shart.' };
  }
  if (password.length > 128) {
    return { isValid: false, error: 'Parol juda uzun (maksimal 128 belgi).' };
  }
  return { isValid: true };
}

/**
 * Validate display name
 */
export function validateDisplayName(name?: string | null): ValidationResult {
  if (!name || !name.trim()) {
    return { isValid: true }; // Display name is optional
  }
  const trimmed = name.trim();
  if (trimmed.length < 2) {
    return { isValid: false, error: 'Ism kamida 2 ta belgidan iborat bo‘lishi kerak.' };
  }
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Ism 50 ta belgidan oshmasligi kerak.' };
  }
  return { isValid: true };
}

/**
 * Validate full registration form
 */
export function validateRegistrationForm(params: {
  email: string;
  password: string;
  confirmPassword: string;
  displayName?: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const emailRes = validateEmail(params.email);
  if (!emailRes.isValid && emailRes.error) {
    errors.email = emailRes.error;
  }

  const passRes = validatePassword(params.password);
  if (!passRes.isValid && passRes.error) {
    errors.password = passRes.error;
  }

  if (params.password !== params.confirmPassword) {
    errors.confirmPassword = 'Kiritilgan parollar bir-biriga mos kelmadi.';
  }

  const nameRes = validateDisplayName(params.displayName);
  if (!nameRes.isValid && nameRes.error) {
    errors.displayName = nameRes.error;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
