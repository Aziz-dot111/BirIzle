import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateDisplayName,
  validateRegistrationForm,
} from './validation';

describe('Validation Utilities', () => {
  describe('validateEmail', () => {
    it('rejects empty email', () => {
      const res = validateEmail('');
      expect(res.isValid).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('rejects invalid email formats', () => {
      expect(validateEmail('test').isValid).toBe(false);
      expect(validateEmail('test@').isValid).toBe(false);
      expect(validateEmail('@domain.com').isValid).toBe(false);
    });

    it('accepts valid email', () => {
      expect(validateEmail('user@birizle.uz').isValid).toBe(true);
      expect(validateEmail('john.doe@gmail.com').isValid).toBe(true);
    });
  });

  describe('validatePassword', () => {
    it('rejects passwords shorter than 6 characters', () => {
      const res = validatePassword('12345');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('6 ta belgi');
    });

    it('accepts passwords with 6 or more characters', () => {
      expect(validatePassword('secret123').isValid).toBe(true);
    });
  });

  describe('validateDisplayName', () => {
    it('allows empty or null name (since it is optional)', () => {
      expect(validateDisplayName('').isValid).toBe(true);
      expect(validateDisplayName(null).isValid).toBe(true);
    });

    it('rejects single character name', () => {
      const res = validateDisplayName('A');
      expect(res.isValid).toBe(false);
    });

    it('accepts standard full name', () => {
      expect(validateDisplayName('Azizbek Karimov').isValid).toBe(true);
    });
  });

  describe('validateRegistrationForm', () => {
    it('detects mismatched passwords', () => {
      const res = validateRegistrationForm({
        email: 'test@birizle.uz',
        password: 'password123',
        confirmPassword: 'differentPassword',
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.confirmPassword).toBeDefined();
    });

    it('validates a complete valid form', () => {
      const res = validateRegistrationForm({
        displayName: 'Aziz Karimov',
        email: 'aziz@example.com',
        password: 'securePassword123',
        confirmPassword: 'securePassword123',
      });
      expect(res.isValid).toBe(true);
      expect(Object.keys(res.errors).length).toBe(0);
    });
  });
});
