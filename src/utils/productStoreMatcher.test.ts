import { describe, it, expect } from 'vitest';
import {
  matchStoresWithProductOffers,
  filterStoresByCategory,
  filterStoresByInStock,
  sortStoresAdvanced,
} from './productStoreMatcher';
import type { Store, InventoryOffer, ProductItem, Coordinates } from '@/types';

describe('productStoreMatcher - Store & Product Matching Logic', () => {
  const nukusCenter: Coordinates = { lat: 42.4619, lng: 59.6166 };
  const nukusBazar: Coordinates = { lat: 42.4552, lng: 59.612 }; // ~0.8 km
  const nukusFar: Coordinates = { lat: 42.48, lng: 59.64 }; // ~3.0 km

  const mockProduct: ProductItem = {
    id: 'prod_phone_12',
    name: 'Samsung Galaxy A24',
    normalizedName: 'samsung galaxy a24',
    searchKeywords: ['samsung', 'a24', 'galaxy'],
    category: 'phones',
    createdAt: '2026-10-19',
    updatedAt: '2026-10-19',
  };

  const mockStores: Store[] = [
    {
      id: 'store_1',
      name: 'Nukus Texno Markaz',
      city: 'Nukus',
      address: 'Markaz',
      coordinates: nukusCenter, // 0 km
      category: 'electronics',
      phone: '+998612220001',
      openingHours: '09:00 - 20:00',
      isVerified: true,
      isDemo: false, // REAL verified store
      createdAt: '2026-10-19',
      updatedAt: '2026-10-19',
    },
    {
      id: 'store_2',
      name: 'Nukus Bozor Savdo',
      city: 'Nukus',
      address: 'Bozor',
      coordinates: nukusBazar, // ~0.8 km
      category: 'phones',
      phone: '+998612220002',
      openingHours: '08:00 - 18:00',
      isVerified: false,
      isDemo: true, // DEMO store
      createdAt: '2026-10-19',
      updatedAt: '2026-10-19',
    },
    {
      id: 'store_3_no_coords',
      name: 'Manzilsiz Do‘kon',
      city: 'Nukus',
      address: 'Noma‘lum ko‘cha',
      coordinates: { lat: 0, lng: 0 }, // INVALID coords (Null island)
      category: 'phones',
      phone: '+998612220003',
      openingHours: '09:00 - 18:00',
      isVerified: false,
      isDemo: true,
      createdAt: '2026-10-19',
      updatedAt: '2026-10-19',
    },
    {
      id: 'store_4_unrelated',
      name: 'Qurilish Mollari Do‘koni',
      city: 'Nukus',
      address: 'Katta yo‘l',
      coordinates: nukusFar,
      category: 'construction',
      phone: '+998612220004',
      openingHours: '08:00 - 18:00',
      isVerified: true,
      isDemo: false,
      createdAt: '2026-10-19',
      updatedAt: '2026-10-19',
    },
  ];

  const mockOffers: InventoryOffer[] = [
    {
      id: 'offer_1',
      storeId: 'store_1',
      productId: 'prod_phone_12',
      price: 2500000,
      currency: 'UZS',
      availability: 'in_stock',
      inStock: true,
      isDemo: false,
      updatedAt: '2026-10-19',
    },
    {
      id: 'offer_2',
      storeId: 'store_2',
      productId: 'prod_phone_12',
      price: 2350000, // Cheapest price!
      currency: 'UZS',
      availability: 'in_stock',
      inStock: true,
      isDemo: true,
      updatedAt: '2026-10-19',
    },
    {
      id: 'offer_3',
      storeId: 'store_3_no_coords',
      productId: 'prod_phone_12',
      price: 2400000,
      currency: 'UZS',
      availability: 'out_of_stock',
      inStock: false,
      isDemo: true,
      updatedAt: '2026-10-19',
    },
    // store_4 has NO offer for prod_phone_12
  ];

  describe('matchStoresWithProductOffers', () => {
    it('only returns stores that offer the specified product', () => {
      const result = matchStoresWithProductOffers(mockStores, mockOffers, mockProduct, {
        userCoords: nukusCenter,
      });

      const storeIds = result.map((s) => s.id);
      expect(storeIds).toContain('store_1');
      expect(storeIds).toContain('store_2');
      expect(storeIds).toContain('store_3_no_coords');
      // store_4 does not offer prod_phone_12, must be excluded!
      expect(storeIds).not.toContain('store_4_unrelated');
      expect(result.length).toBe(3);
    });

    it('identifies the cheapest store accurately based on verified prices', () => {
      const result = matchStoresWithProductOffers(mockStores, mockOffers, mockProduct, {
        userCoords: nukusCenter,
      });

      const store2 = result.find((s) => s.id === 'store_2');
      const store1 = result.find((s) => s.id === 'store_1');

      expect(store2?.isCheapest).toBe(true);
      expect(store2?.matchedOffer?.price).toBe(2350000);
      expect(store1?.isCheapest).toBe(false);
    });

    it('identifies the closest store accurately based on user coordinates', () => {
      const result = matchStoresWithProductOffers(mockStores, mockOffers, mockProduct, {
        userCoords: nukusCenter,
      });

      const store1 = result.find((s) => s.id === 'store_1');
      const store2 = result.find((s) => s.id === 'store_2');

      expect(store1?.isClosest).toBe(true);
      expect(store1?.distanceKm).toBe(0);
      expect(store2?.isClosest).toBe(false);
      expect(store2?.distanceKm).toBeGreaterThan(0.5);
    });

    it('does not guess distance for stores without valid coordinates', () => {
      const result = matchStoresWithProductOffers(mockStores, mockOffers, mockProduct, {
        userCoords: nukusCenter,
      });

      const store3 = result.find((s) => s.id === 'store_3_no_coords');
      expect(store3?.distanceKm).toBeUndefined();
      expect(store3?.isClosest).toBe(false);
    });

    it('accurately distinguishes demo vs real verified stores', () => {
      const result = matchStoresWithProductOffers(mockStores, mockOffers, mockProduct, {
        userCoords: nukusCenter,
      });

      const realStore = result.find((s) => s.id === 'store_1');
      const demoStore = result.find((s) => s.id === 'store_2');

      expect(realStore?.isDemo).toBe(false);
      expect(realStore?.isVerified).toBe(true);
      expect(demoStore?.isDemo).toBe(true);
    });

    it('supports onlyInStock filtering option', () => {
      const inStockOnly = matchStoresWithProductOffers(mockStores, mockOffers, mockProduct, {
        userCoords: nukusCenter,
        onlyInStock: true,
      });

      const ids = inStockOnly.map((s) => s.id);
      expect(ids).toContain('store_1');
      expect(ids).toContain('store_2');
      // store_3 is out of stock, so excluded
      expect(ids).not.toContain('store_3_no_coords');
    });

    it('does not crash and returns empty array on empty inputs', () => {
      expect(matchStoresWithProductOffers([], mockOffers, mockProduct)).toEqual([]);
      expect(matchStoresWithProductOffers(mockStores, [], mockProduct)).toEqual([]);
    });
  });

  describe('filterStoresByCategory & filterStoresByInStock', () => {
    it('filters stores by category safely', () => {
      const phones = filterStoresByCategory(mockStores, 'phones');
      expect(phones.length).toBe(2);
      expect(phones.map((s) => s.id)).toEqual(['store_2', 'store_3_no_coords']);

      const all = filterStoresByCategory(mockStores, 'all');
      expect(all.length).toBe(mockStores.length);
    });

    it('filters stores by in-stock status', () => {
      const matched = matchStoresWithProductOffers(mockStores, mockOffers, mockProduct);
      const inStock = filterStoresByInStock(matched, true);
      expect(inStock.length).toBe(2);
      expect(inStock.map((s) => s.id)).toEqual(['store_1', 'store_2']);
    });
  });

  describe('sortStoresAdvanced', () => {
    it('sorts by price ascending (cheapest first)', () => {
      const matched = matchStoresWithProductOffers(mockStores, mockOffers, mockProduct);
      const sorted = sortStoresAdvanced(matched, 'price_asc');
      expect(sorted[0].id).toBe('store_2'); // 2,350,000
      expect(sorted[1].id).toBe('store_3_no_coords'); // 2,400,000
      expect(sorted[2].id).toBe('store_1'); // 2,500,000
    });

    it('sorts by price descending (most expensive first)', () => {
      const matched = matchStoresWithProductOffers(mockStores, mockOffers, mockProduct);
      const sorted = sortStoresAdvanced(matched, 'price_desc');
      expect(sorted[0].id).toBe('store_1'); // 2,500,000
      expect(sorted[1].id).toBe('store_3_no_coords'); // 2,400,000
      expect(sorted[2].id).toBe('store_2'); // 2,350,000
    });

    it('sorts by distance ascending with unknown distance at the end', () => {
      const matched = matchStoresWithProductOffers(mockStores, mockOffers, mockProduct, {
        userCoords: nukusCenter,
      });
      const sorted = sortStoresAdvanced(matched, 'distance');
      expect(sorted[0].id).toBe('store_1'); // 0 km
      expect(sorted[1].id).toBe('store_2'); // 0.8 km
      expect(sorted[2].id).toBe('store_3_no_coords'); // undefined distance -> last
    });
  });
});
