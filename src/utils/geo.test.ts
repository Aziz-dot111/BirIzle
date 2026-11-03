import { describe, it, expect } from 'vitest';
import {
  calculateHaversineDistance,
  isValidCoordinates,
  normalizeStoreCoordinates,
  formatDistance,
  enrichStoresWithDistance,
  filterStoresByRadius,
  sortStoresByDistance,
  CITY_CENTROIDS,
} from './geo';
import type { Store, Coordinates } from '@/types';

describe('Geolocation Utilities & Haversine Distance', () => {
  const nukusCenter: Coordinates = { lat: 42.4619, lng: 59.6166 };
  const nukusBazar: Coordinates = { lat: 42.4552, lng: 59.612 };
  const toshkentCenter: Coordinates = { lat: 41.2995, lng: 69.2401 };

  describe('isValidCoordinates', () => {
    it('returns true for valid geographic coordinates', () => {
      expect(isValidCoordinates({ lat: 42.4619, lng: 59.6166 })).toBe(true);
      expect(isValidCoordinates({ lat: -33.8688, lng: 151.2093 })).toBe(true);
      expect(isValidCoordinates({ lat: 0.1, lng: 0.1 })).toBe(true);
    });

    it('rejects out of bounds latitude', () => {
      expect(isValidCoordinates({ lat: 91, lng: 59 })).toBe(false);
      expect(isValidCoordinates({ lat: -91, lng: 59 })).toBe(false);
    });

    it('rejects out of bounds longitude', () => {
      expect(isValidCoordinates({ lat: 42, lng: 181 })).toBe(false);
      expect(isValidCoordinates({ lat: 42, lng: -181 })).toBe(false);
    });

    it('rejects 0,0 Null Island empty placeholder coordinates', () => {
      expect(isValidCoordinates({ lat: 0, lng: 0 })).toBe(false);
    });

    it('rejects non-numeric, NaN, null, and undefined inputs', () => {
      expect(isValidCoordinates(null)).toBe(false);
      expect(isValidCoordinates(undefined)).toBe(false);
      expect(isValidCoordinates({ lat: '42', lng: '59' })).toBe(false);
      expect(isValidCoordinates({ lat: NaN, lng: 59 })).toBe(false);
      expect(isValidCoordinates({ lat: Infinity, lng: 59 })).toBe(false);
    });
  });

  describe('normalizeStoreCoordinates', () => {
    it('extracts from standard coordinates { lat, lng }', () => {
      const doc = { coordinates: { lat: 42.4619, lng: 59.6166 } };
      const res = normalizeStoreCoordinates(doc);
      expect(res).toEqual({ lat: 42.4619, lng: 59.6166 });
    });

    it('extracts from coordinates { latitude, longitude }', () => {
      const doc = { coordinates: { latitude: 42.4619, longitude: 59.6166 } };
      const res = normalizeStoreCoordinates(doc);
      expect(res).toEqual({ lat: 42.4619, lng: 59.6166 });
    });

    it('extracts from location { latitude, longitude } or { lat, lng }', () => {
      const doc1 = { location: { latitude: 41.2995, longitude: 69.2401 } };
      const res1 = normalizeStoreCoordinates(doc1);
      expect(res1).toEqual({ lat: 41.2995, lng: 69.2401 });

      const doc2 = { location: { lat: 41.2995, lng: 69.2401 } };
      const res2 = normalizeStoreCoordinates(doc2);
      expect(res2).toEqual({ lat: 41.2995, lng: 69.2401 });
    });

    it('extracts from top-level lat/lng', () => {
      const doc = { lat: 39.6542, lng: 66.9597 };
      const res = normalizeStoreCoordinates(doc);
      expect(res).toEqual({ lat: 39.6542, lng: 66.9597 });
    });

    it('parses string numbers safely', () => {
      const doc = { coordinates: { lat: '42.4619', lng: '59.6166' } };
      const res = normalizeStoreCoordinates(doc);
      expect(res).toEqual({ lat: 42.4619, lng: 59.6166 });
    });

    it('returns null for missing or invalid data without throwing', () => {
      expect(normalizeStoreCoordinates({})).toBeNull();
      expect(normalizeStoreCoordinates({ coordinates: null } as unknown as Record<string, unknown>)).toBeNull();
      expect(normalizeStoreCoordinates({ coordinates: { lat: 999, lng: 999 } })).toBeNull();
    });
  });

  describe('calculateHaversineDistance', () => {
    it('returns 0 for identical coordinates', () => {
      const dist = calculateHaversineDistance(nukusCenter, nukusCenter);
      expect(dist).toBe(0);
    });

    it('calculates short distance accurately (Nukus Center to Nukus Bazar ~ 0.8 km)', () => {
      const dist = calculateHaversineDistance(nukusCenter, nukusBazar);
      expect(dist).toBeGreaterThan(0.6);
      expect(dist).toBeLessThan(1.2);
    });

    it('calculates long distance accurately (Nukus to Toshkent ~ 800 km)', () => {
      const dist = calculateHaversineDistance(nukusCenter, toshkentCenter);
      expect(dist).toBeGreaterThan(750);
      expect(dist).toBeLessThan(850);
    });

    it('returns Infinity if either coordinate is invalid', () => {
      const invalid = { lat: 999, lng: 999 };
      expect(calculateHaversineDistance(nukusCenter, invalid)).toBe(Infinity);
      expect(calculateHaversineDistance(invalid, nukusCenter)).toBe(Infinity);
    });
  });

  describe('formatDistance', () => {
    it('formats distances under 1 km as meters', () => {
      expect(formatDistance(0.4)).toBe('400 m');
      expect(formatDistance(0.05)).toBe('50 m');
      expect(formatDistance(0.85)).toBe('850 m');
    });

    it('formats distances 1 km and greater as km with 1 decimal', () => {
      expect(formatDistance(1.0)).toBe('1.0 km');
      expect(formatDistance(2.45)).toBe('2.5 km');
      expect(formatDistance(12.34)).toBe('12.3 km');
    });

    it('returns "Masofa noma’lum" for undefined, null, or Infinity in uz and "Расстояние неизвестно" in ru', () => {
      expect(formatDistance(undefined)).toBe('Masofa noma’lum');
      expect(formatDistance(null)).toBe('Masofa noma’lum');
      expect(formatDistance(Infinity)).toBe('Masofa noma’lum');
      expect(formatDistance(undefined, 'ru')).toBe('Расстояние неизвестно');
      expect(formatDistance(0.5, 'ru')).toBe('500 м');
      expect(formatDistance(2.4, 'ru')).toBe('2.4 км');
    });
  });

  describe('Store Filtering and Sorting', () => {
    const mockStores: Store[] = [
      {
        id: 'store_near_1',
        name: 'Yaqin Do‘kon 1 (0.8 km)',
        city: 'Nukus',
        address: 'Bozor',
        coordinates: nukusBazar,
        category: 'appliances',
        phone: '123',
        openingHours: '09:00',
        createdAt: '2026-10-19',
        updatedAt: '2026-10-19',
      },
      {
        id: 'store_far_toshkent',
        name: 'Uzoq Do‘kon (Toshkent ~800 km)',
        city: 'Toshkent',
        address: 'Chilonzor',
        coordinates: toshkentCenter,
        category: 'electronics',
        phone: '456',
        openingHours: '09:00',
        createdAt: '2026-10-19',
        updatedAt: '2026-10-19',
      },
      {
        id: 'store_no_coords',
        name: 'Koordinatasiz Do‘kon',
        city: 'Nukus',
        address: 'Noma‘lum manzil',
        coordinates: { lat: 0, lng: 0 },
        category: 'general',
        phone: '789',
        openingHours: '09:00',
        createdAt: '2026-10-19',
        updatedAt: '2026-10-19',
      },
    ];

    it('enriches stores with distance from user coordinates', () => {
      const enriched = enrichStoresWithDistance(mockStores, nukusCenter);
      expect(enriched[0].distanceKm).toBeDefined();
      expect(enriched[0].distanceKm).toBeLessThan(2);
      expect(enriched[1].distanceKm).toBeGreaterThan(700);
      expect(enriched[2].distanceKm).toBeUndefined(); // Invalid (0,0) coords
    });

    it('filters stores strictly within specified radius', () => {
      // 5 km radius from Nukus center: should include near store, exclude Toshkent store and invalid store
      const filtered5km = filterStoresByRadius(mockStores, nukusCenter, 5);
      expect(filtered5km.length).toBe(1);
      expect(filtered5km[0].id).toBe('store_near_1');

      // 1000 km radius: includes near and Toshkent, excludes invalid coords
      const filtered1000km = filterStoresByRadius(mockStores, nukusCenter, 1000);
      expect(filtered1000km.length).toBe(2);
    });

    it('sorts stores by distance ascending with unknown coordinates at the end', () => {
      const enriched = enrichStoresWithDistance(mockStores, nukusCenter);
      const sorted = sortStoresByDistance(enriched);

      expect(sorted[0].id).toBe('store_near_1');
      expect(sorted[1].id).toBe('store_far_toshkent');
      expect(sorted[2].id).toBe('store_no_coords');
    });

    it('has valid CITY_CENTROIDS coordinates for all major Uzbek cities', () => {
      expect(isValidCoordinates(CITY_CENTROIDS.Nukus)).toBe(true);
      expect(isValidCoordinates(CITY_CENTROIDS.Toshkent)).toBe(true);
      expect(isValidCoordinates(CITY_CENTROIDS.Samarqand)).toBe(true);
      expect(isValidCoordinates(CITY_CENTROIDS.Buxoro)).toBe(true);
    });
  });
});
