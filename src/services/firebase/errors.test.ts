import { describe, it, expect } from 'vitest';
import { getFirebaseErrorMessage } from './errors';

describe('Firebase Error Mapping', () => {
  it('translates common Firebase Auth errors into friendly Uzbek messages', () => {
    expect(getFirebaseErrorMessage('auth/user-not-found')).toContain('topilmadi');
    expect(getFirebaseErrorMessage('auth/wrong-password')).toContain('noto‘g‘ri');
    expect(getFirebaseErrorMessage('auth/email-already-in-use')).toContain('ro‘yxatdan o‘tgan');
    expect(getFirebaseErrorMessage('auth/weak-password')).toContain('oddiy');
  });

  it('provides a safe fallback for unknown errors without leaking internals', () => {
    const fallback = getFirebaseErrorMessage('unknown/internal-db-panic');
    expect(fallback).toBe('Kutilmagan xatolik yuz berdi. Iltimos, qaytadan urinib ko‘ring.');
  });
});
