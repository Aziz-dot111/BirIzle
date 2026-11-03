import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getMapTexts,
  getSafeStoreName,
  translateCategory,
  getGeolocationErrorMessage,
  buildDirectionsUrl,
  getSavedMapLanguage,
  saveMapLanguage,
  MAP_TRANSLATIONS,
} from './mapI18n';

describe('Map & Geolocation Localization (mapI18n)', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const storageMock = {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };

    // @ts-expect-error Mocking window in node environment
    globalThis.window = { localStorage: storageMock };
  });

  afterEach(() => {
    // @ts-expect-error Cleanup
    delete globalThis.window;
  });

  describe('Required Terminology & Dictionary Completeness', () => {
    it('provides exact requested translations in Uzbek', () => {
      const uz = getMapTexts('uz');
      expect(uz.searchNearby).toBe('Yaqin atrofni qidirish');
      expect(uz.myLocation).toBe('Mening joylashuvim');
      expect(uz.getDirections).toBe('Yo‘nalishni ko‘rsatish');
      expect(uz.nearbyStores).toBe('Yaqin do‘konlar');
      expect(uz.locationUnavailable).toBe('Joylashuv aniqlanmadi');
      expect(uz.retry).toBe('Qayta urinish');
      expect(uz.loading).toBe('Yuklanmoqda');
      expect(uz.noStoresFound).toBe('Do‘konlar topilmadi');
      expect(uz.unverifiedStore).toBe('Tasdiqlanmagan do‘kon');
      expect(uz.verifiedPartner).toBe('Tasdiqlangan hamkor');
    });

    it('provides exact requested translations in Russian', () => {
      const ru = getMapTexts('ru');
      expect(ru.searchNearby).toBe('Искать рядом');
      expect(ru.myLocation).toBe('Моё местоположение');
      expect(ru.getDirections).toBe('Построить маршрут');
      expect(ru.nearbyStores).toBe('Магазины рядом');
      expect(ru.locationUnavailable).toBe('Местоположение не определено');
      expect(ru.retry).toBe('Повторить');
      expect(ru.loading).toBe('Загрузка');
      expect(ru.noStoresFound).toBe('Магазины не найдены');
      expect(ru.unverifiedStore).toBe('Непроверенный магазин');
      expect(ru.verifiedPartner).toBe('Проверенный партнёр');
    });

    it('defaults to Uzbek when fallback language is requested', () => {
      // @ts-expect-error Testing fallback
      expect(getMapTexts('unknown')).toEqual(MAP_TRANSLATIONS.uz);
    });
  });

  describe('Store Name Handling & Fallbacks', () => {
    it('preserves real store names without corrupting or auto-translating them', () => {
      expect(getSafeStoreName('MediaPark Nukus', 'uz')).toBe('MediaPark Nukus');
      expect(getSafeStoreName('MediaPark Nukus', 'ru')).toBe('MediaPark Nukus');
      expect(getSafeStoreName('Techno Center', 'uz')).toBe('Techno Center');
      expect(getSafeStoreName('Savdo Qatori №5', 'ru')).toBe('Savdo Qatori №5');
    });

    it('uses user-friendly fallback for missing or empty names', () => {
      expect(getSafeStoreName('', 'uz')).toBe('Nomsiz savdo nuqtasi');
      expect(getSafeStoreName(null, 'uz')).toBe('Nomsiz savdo nuqtasi');
      expect(getSafeStoreName('   ', 'uz')).toBe('Nomsiz savdo nuqtasi');
      expect(getSafeStoreName('', 'ru')).toBe('Торговая точка без названия');
      expect(getSafeStoreName(null, 'ru')).toBe('Торговая точка без названия');
      expect(getSafeStoreName('   ', 'ru')).toBe('Торговая точка без названия');
    });
  });

  describe('Category Localization', () => {
    it('translates technical slugs to friendly localized names', () => {
      expect(translateCategory('electronics', 'uz')).toBe('Elektronika');
      expect(translateCategory('electronics', 'ru')).toBe('Электроника');
      expect(translateCategory('appliances', 'uz')).toBe('Maishiy texnika');
      expect(translateCategory('appliances', 'ru')).toBe('Бытовая техника');
      expect(translateCategory('phones', 'uz')).toBe('Smartfon va aloqa');
      expect(translateCategory('phones', 'ru')).toBe('Смартфоны и связь');
    });

    it('translates common OSM category titles to Russian', () => {
      expect(translateCategory('Dorixona', 'ru')).toBe('Аптека');
      expect(translateCategory('Savdo markazi', 'ru')).toBe('Торговый центр');
      expect(translateCategory('Supermarket', 'ru')).toBe('Супермаркет');
    });

    it('safely handles undefined and empty categories', () => {
      expect(translateCategory(undefined, 'uz')).toBe('Umumiy toifa');
      expect(translateCategory('', 'ru')).toBe('Общая категория');
    });
  });

  describe('Geolocation Error Localization', () => {
    it('translates PERMISSION_DENIED cleanly', () => {
      const uzMsg = getGeolocationErrorMessage('PERMISSION_DENIED', 'uz');
      const ruMsg = getGeolocationErrorMessage('PERMISSION_DENIED', 'ru');
      expect(uzMsg).toContain('Joylashuv ruxsati rad etildi');
      expect(ruMsg).toContain('Доступ к геопозиции отклонён');
    });

    it('translates TIMEOUT cleanly', () => {
      const uzMsg = getGeolocationErrorMessage('TIMEOUT', 'uz');
      const ruMsg = getGeolocationErrorMessage('TIMEOUT', 'ru');
      expect(uzMsg).toContain('vaqti tugadi');
      expect(ruMsg).toContain('Время ожидания');
    });

    it('translates POSITION_UNAVAILABLE cleanly', () => {
      const uzMsg = getGeolocationErrorMessage('POSITION_UNAVAILABLE', 'uz');
      const ruMsg = getGeolocationErrorMessage('POSITION_UNAVAILABLE', 'ru');
      expect(uzMsg).toContain('Joylashuv aniqlanmadi');
      expect(ruMsg).toContain('Местоположение не определено');
    });

    it('returns null when there is no error', () => {
      expect(getGeolocationErrorMessage(null, 'uz')).toBeNull();
      expect(getGeolocationErrorMessage(undefined, 'ru')).toBeNull();
    });
  });

  describe('Directions URL Generator', () => {
    const destination = { lat: 42.4619, lng: 59.6166 };
    const userOrigin = { lat: 42.4550, lng: 59.6100 };

    it('builds destination-only Google Maps direction URL when origin is not provided', () => {
      const url = buildDirectionsUrl(destination);
      expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=42.4619,59.6166');
    });

    it('builds full route Google Maps direction URL when user origin GPS coordinates are available', () => {
      const url = buildDirectionsUrl(destination, userOrigin);
      expect(url).toBe('https://www.google.com/maps/dir/?api=1&origin=42.455,59.61&destination=42.4619,59.6166');
    });
  });

  describe('Language Preference Persistence', () => {
    it('defaults to "uz" when localStorage is empty', () => {
      expect(getSavedMapLanguage()).toBe('uz');
    });

    it('persists and retrieves user language choice', () => {
      saveMapLanguage('ru');
      expect(getSavedMapLanguage()).toBe('ru');

      saveMapLanguage('uz');
      expect(getSavedMapLanguage()).toBe('uz');
    });
  });
});
