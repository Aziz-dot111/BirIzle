import { describe, it, expect, beforeEach } from 'vitest';
import { getMerchantTexts, MERCHANT_TRANSLATIONS } from './merchantI18n';

describe('merchantI18n', () => {
  beforeEach(() => {
    // Ensure mock localStorage exists
    const storage: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      window.localStorage = {
        getItem: (key: string) => storage[key] || null,
        setItem: (key: string, val: string) => {
          storage[key] = val;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
        clear: () => {
          Object.keys(storage).forEach((k) => delete storage[k]);
        },
        key: (i: number) => Object.keys(storage)[i] || null,
        length: Object.keys(storage).length,
      };
    }
  });

  it('returns uzbek translations by default', () => {
    const texts = getMerchantTexts('uz');
    expect(texts.dashboardTitle).toBe('Do‘kon Egasi Kabineti');
    expect(texts.applyButton).toBe('Yangi do‘kon ochish');
    expect(texts.myStores).toBe('Mening do‘konlarim');
    expect(texts.verifiedBadge).toContain('Tasdiqlangan');
    expect(texts.pendingBadge).toContain('Moderatsiyada');
  });

  it('returns russian translations when requested', () => {
    const texts = getMerchantTexts('ru');
    expect(texts.dashboardTitle).toBe('Кабинет владельца магазина');
    expect(texts.applyButton).toBe('Открыть новый магазин');
    expect(texts.myStores).toBe('Мои магазины');
    expect(texts.verifiedBadge).toBe('Проверенный партнёр');
  });

  it('has matching keys for both uz and ru dictionaries', () => {
    const uzKeys = Object.keys(MERCHANT_TRANSLATIONS.uz).sort();
    const ruKeys = Object.keys(MERCHANT_TRANSLATIONS.ru).sort();
    expect(uzKeys).toEqual(ruKeys);
  });

  it('includes required application form labels and validation notices in both languages', () => {
    (['uz', 'ru'] as const).forEach((lang) => {
      const texts = MERCHANT_TRANSLATIONS[lang];
      expect(texts.nameLabel.length).toBeGreaterThan(0);
      expect(texts.cityLabel.length).toBeGreaterThan(0);
      expect(texts.addressLabel.length).toBeGreaterThan(0);
      expect(texts.phoneLabel.length).toBeGreaterThan(0);
      expect(texts.categoryLabel.length).toBeGreaterThan(0);
      expect(texts.placeTypeLabel.length).toBeGreaterThan(0);
      expect(texts.hoursLabel.length).toBeGreaterThan(0);
      expect(texts.coordsLabel.length).toBeGreaterThan(0);
      expect(texts.securityNoticeText.length).toBeGreaterThan(0);
      expect(texts.rulesPendingNotice.length).toBeGreaterThan(0);
      expect(texts.rulesDeniedError.length).toBeGreaterThan(0);
    });
  });

  it('includes product offer strings in both languages', () => {
    (['uz', 'ru'] as const).forEach((lang) => {
      const texts = MERCHANT_TRANSLATIONS[lang];
      expect(texts.offersTitle.length).toBeGreaterThan(0);
      expect(texts.addOfferBtn.length).toBeGreaterThan(0);
      expect(texts.inStock.length).toBeGreaterThan(0);
      expect(texts.offersStagedNotice.length).toBeGreaterThan(0);
    });
  });

  it('includes Phase 5.1 submission tabs, form fields, and status strings in both languages', () => {
    (['uz', 'ru'] as const).forEach((lang) => {
      const texts = MERCHANT_TRANSLATIONS[lang];
      expect(texts.activeOffersTab.length).toBeGreaterThan(0);
      expect(texts.submissionsTab.length).toBeGreaterThan(0);
      expect(texts.selectExistingTab.length).toBeGreaterThan(0);
      expect(texts.suggestNewTab.length).toBeGreaterThan(0);
      expect(texts.newProdNameLabel.length).toBeGreaterThan(0);
      expect(texts.newProdCategoryLabel.length).toBeGreaterThan(0);
      expect(texts.statusPending.length).toBeGreaterThan(0);
      expect(texts.statusApproved.length).toBeGreaterThan(0);
      expect(texts.statusRejected.length).toBeGreaterThan(0);
      expect(texts.adminNoteLabel.length).toBeGreaterThan(0);
      expect(texts.duplicatePendingError.length).toBeGreaterThan(0);
    });
  });
});
