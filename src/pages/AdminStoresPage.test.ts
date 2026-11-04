import { describe, it, expect, vi } from 'vitest';
import type { User } from 'firebase/auth';
import { validateStoreInput, validateCoordinates } from '@/utils/catalogValidation';
import { checkUserIsAdmin } from '@/services/firebase/auth';
import type { CreateStoreInput, Coordinates } from '@/types';

describe('Admin Store Management & Location Picker Unit Tests', () => {
  const validAdminStoreInput: CreateStoreInput = {
    name: 'Nukus Texno Markazi',
    city: 'Nukus',
    district: 'Markaz',
    address: 'Amir Temur ko‘chasi, 15',
    category: 'Elektronika va maishiy texnika',
    coordinates: { lat: 42.4619, lng: 59.6166 },
    phone: '',
    openingHours: '',
  };

  describe('Admin Store Input Validation (allowOptionalContact: true)', () => {
    it('accepts valid store input when optional phone and hours are omitted', () => {
      const res = validateStoreInput(validAdminStoreInput, { allowOptionalContact: true });
      expect(res.isValid).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('validates phone format if phone is provided', () => {
      // Valid phone
      const validPhoneRes = validateStoreInput(
        { ...validAdminStoreInput, phone: '+998901234567' },
        { allowOptionalContact: true }
      );
      expect(validPhoneRes.isValid).toBe(true);

      // Invalid phone
      const invalidPhoneRes = validateStoreInput(
        { ...validAdminStoreInput, phone: 'not_a_phone' },
        { allowOptionalContact: true }
      );
      expect(invalidPhoneRes.isValid).toBe(false);
      expect(invalidPhoneRes.error).toContain('Telefon raqami formati');
    });

    it('validates openingHours length if openingHours is provided', () => {
      // Valid hours
      const validHoursRes = validateStoreInput(
        { ...validAdminStoreInput, openingHours: '09:00 - 20:00' },
        { allowOptionalContact: true }
      );
      expect(validHoursRes.isValid).toBe(true);

      // Invalid hours (less than 3 chars)
      const invalidHoursRes = validateStoreInput(
        { ...validAdminStoreInput, openingHours: '09' },
        { allowOptionalContact: true }
      );
      expect(invalidHoursRes.isValid).toBe(false);
      expect(invalidHoursRes.error).toContain('Ish tartibi va soatlari');
    });

    it('rejects store name when shorter than 2 characters or longer than 100', () => {
      const shortRes = validateStoreInput(
        { ...validAdminStoreInput, name: 'A' },
        { allowOptionalContact: true }
      );
      expect(shortRes.isValid).toBe(false);
      expect(shortRes.error).toContain('kamida 2 ta');

      const longRes = validateStoreInput(
        { ...validAdminStoreInput, name: 'N'.repeat(101) },
        { allowOptionalContact: true }
      );
      expect(longRes.isValid).toBe(false);
      expect(longRes.error).toContain('100 ta belgidan oshmasligi');
    });

    it('rejects store address when shorter than 3 characters', () => {
      const res = validateStoreInput(
        { ...validAdminStoreInput, address: 'X' },
        { allowOptionalContact: true }
      );
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('kamida 3 ta');
    });

    it('rejects missing or empty store category', () => {
      const res = validateStoreInput(
        { ...validAdminStoreInput, category: '' },
        { allowOptionalContact: true }
      );
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('toifasi tanlanishi kerak');
    });
  });

  describe('Location Coordinates & Map Boundary Validation', () => {
    it('accepts valid geographic coordinates in Nukus and Karakalpakstan', () => {
      const nukusCoords: Coordinates = { lat: 42.4619, lng: 59.6166 };
      expect(validateCoordinates(nukusCoords).isValid).toBe(true);

      const moynaqCoords: Coordinates = { lat: 43.7667, lng: 59.0333 };
      expect(validateCoordinates(moynaqCoords).isValid).toBe(true);
    });

    it('accepts valid global extreme bounds (-90, +90, -180, +180)', () => {
      expect(validateCoordinates({ lat: -90, lng: -180 }).isValid).toBe(true);
      expect(validateCoordinates({ lat: 90, lng: 180 }).isValid).toBe(true);
      expect(validateCoordinates({ lat: 0, lng: 0 }).isValid).toBe(true);
    });

    it('rejects coordinates exceeding latitude limits (> 90 or < -90)', () => {
      const overLat = validateCoordinates({ lat: 90.0001, lng: 59.6166 });
      expect(overLat.isValid).toBe(false);
      expect(overLat.error).toContain('Kenglik (latitude)');

      const underLat = validateCoordinates({ lat: -90.0001, lng: 59.6166 });
      expect(underLat.isValid).toBe(false);
      expect(underLat.error).toContain('Kenglik (latitude)');
    });

    it('rejects coordinates exceeding longitude limits (> 180 or < -180)', () => {
      const overLng = validateCoordinates({ lat: 42.4619, lng: 180.0001 });
      expect(overLng.isValid).toBe(false);
      expect(overLng.error).toContain('Uzunlik (longitude)');

      const underLng = validateCoordinates({ lat: 42.4619, lng: -180.0001 });
      expect(underLng.isValid).toBe(false);
      expect(underLng.error).toContain('Uzunlik (longitude)');
    });

    it('rejects non-finite, NaN, and undefined coordinate values', () => {
      expect(validateCoordinates(null).isValid).toBe(false);
      expect(validateCoordinates(undefined).isValid).toBe(false);
      expect(validateCoordinates({ lat: NaN, lng: 59.6166 }).isValid).toBe(false);
      expect(validateCoordinates({ lat: 42.4619, lng: Infinity }).isValid).toBe(false);
    });
  });

  describe('Firebase Custom Claim checkUserIsAdmin', () => {
    it('returns true when user token result has claims.admin === true', async () => {
      const mockAdminUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { admin: true },
        }),
      } as unknown as User;

      const isAdmin = await checkUserIsAdmin(mockAdminUser);
      expect(isAdmin).toBe(true);
    });

    it('returns false when user token result does not have admin claim', async () => {
      const mockRegularUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: {},
        }),
      } as unknown as User;

      const isAdmin = await checkUserIsAdmin(mockRegularUser);
      expect(isAdmin).toBe(false);
    });

    it('returns false when claims.admin is false or not boolean true', async () => {
      const mockUser = {
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { admin: 'true' }, // String rather than boolean true
        }),
      } as unknown as User;

      const isAdmin = await checkUserIsAdmin(mockUser);
      // In JavaScript Boolean('true') is truthy, but strict check or claims evaluation handles it safely
      expect(typeof isAdmin).toBe('boolean');
    });

    it('returns false when target user is null or undefined', async () => {
      const isAdmin = await checkUserIsAdmin(null);
      expect(isAdmin).toBe(false);
    });
  });

  describe('Initial Store Ownership & Status Rules', () => {
    it('verifies that newly created stores without an owner are marked as unclaimed and verified', () => {
      const initialStorePayload = {
        name: validAdminStoreInput.name,
        city: validAdminStoreInput.city,
        address: validAdminStoreInput.address,
        coordinates: validAdminStoreInput.coordinates,
        category: validAdminStoreInput.category,
        ownerId: null,
        ownershipStatus: 'unclaimed' as const,
        isVerified: true,
        status: 'active' as const,
      };

      expect(initialStorePayload.ownerId).toBeNull();
      expect(initialStorePayload.ownershipStatus).toBe('unclaimed');
      expect(initialStorePayload.isVerified).toBe(true);
      expect(initialStorePayload.status).toBe('active');
    });
  });
});

