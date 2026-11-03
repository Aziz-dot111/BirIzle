import { describe, it, expect } from 'vitest';
import { handleCreateStoreResult } from './MerchantApplyPage';
import { getMerchantTexts } from '@/utils/merchantI18n';

describe('MerchantApplyPage error and success handling', () => {
  const tUz = getMerchantTexts('uz');
  const tRu = getMerchantTexts('ru');

  it('sets successInfo and clears error when Firestore write succeeds with res.data', () => {
    const mockStore = {
      id: 'store_123',
      name: 'Test Do‘kon',
      city: 'Nukus',
      address: 'A. Dosnazarov 12',
      coordinates: { lat: 42.46, lng: 59.61 },
      category: 'Elektronika',
      phone: '+998 90 123 45 67',
      openingHours: '09:00 - 20:00',
      ownerId: 'user_123',
      isVerified: false,
      status: 'pending' as const,
      createdAt: '2026-10-26T00:00:00.000Z',
      updatedAt: '2026-10-26T00:00:00.000Z',
    };

    const resultUz = handleCreateStoreResult({ data: mockStore, error: null }, tUz);
    expect(resultUz.errorMessage).toBeNull();
    expect(resultUz.successInfo).not.toBeNull();
    expect(resultUz.successInfo?.isLive).toBe(true);
    expect(resultUz.successInfo?.message).toBe(tUz.successDesc);

    const resultRu = handleCreateStoreResult({ data: mockStore, error: null }, tRu);
    expect(resultRu.errorMessage).toBeNull();
    expect(resultRu.successInfo?.message).toBe(tRu.successDesc);
  });

  it('NEVER sets successInfo when Firestore rejects write with permission-denied', () => {
    const permissionErrors = [
      'permission-denied: Missing or insufficient permissions.',
      'Ruxsat etilmadi: Ushbu amal uchun ruxsat yo‘q.',
      'Amal rad etildi: Foydalanuvchida yozish huquqi mavjud emas.',
    ];

    permissionErrors.forEach((err) => {
      const outcome = handleCreateStoreResult({ data: null, error: err }, tUz);
      // Critical invariant: successInfo MUST BE NULL!
      expect(outcome.successInfo).toBeNull();
      // Error message must clearly indicate that application was not saved due to rules
      expect(outcome.errorMessage).toBe(tUz.rulesDeniedError);
      expect(outcome.errorMessage).toContain('saqlanmadi');
      expect(outcome.errorMessage).toContain('Security Rules');
    });
  });

  it('NEVER sets successInfo on permission error in Russian language and displays clear notice', () => {
    const outcome = handleCreateStoreResult(
      { data: null, error: 'permission-denied' },
      tRu
    );
    expect(outcome.successInfo).toBeNull();
    expect(outcome.errorMessage).toBe(tRu.rulesDeniedError);
    expect(outcome.errorMessage).toContain('не сохранена');
    expect(outcome.errorMessage).toContain('Security Rules');
  });

  it('NEVER sets successInfo on generic Firestore/network errors and passes through error message', () => {
    const genericError = 'Tarmoq xatosi: server bilan aloqa uzildi.';
    const outcome = handleCreateStoreResult({ data: null, error: genericError }, tUz);

    expect(outcome.successInfo).toBeNull();
    expect(outcome.errorMessage).toBe(genericError);
  });

  it('NEVER sets successInfo when res.data is null even if error string is empty', () => {
    const outcome = handleCreateStoreResult({ data: null, error: null }, tUz);
    expect(outcome.successInfo).toBeNull();
    expect(outcome.errorMessage).toBe('Xatolik yuz berdi.');
  });
});
