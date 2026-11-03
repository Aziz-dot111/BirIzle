import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('./firebase', () => ({
  isFirebaseReady: false,
  firestoreDb: null,
  firebaseAuth: {
    currentUser: null,
  },
}));

import {
  searchProductsByKeyword,
  getAvailableBrands,
  getSearchSuggestions,
  clearProductCache,
} from './catalog';

describe('Smart Search 2.0 — Auto-Suggestions & Multi-select Brand Filtering', () => {
  beforeEach(() => {
    clearProductCache();
  });

  describe('Multi-select Brand Filtering & Combinations', () => {
    it('filters products using OR logic across multiple selected brands', async () => {
      // Select Samsung and HP brands simultaneously
      const res = await searchProductsByKeyword('', {
        brands: ['Samsung', 'HP'],
        includeDemo: true,
      });

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.length).toBeGreaterThan(0);

      // Every returned product MUST be either Samsung or HP
      const returnedBrands = res.data!.map((p) => p.brand);
      expect(returnedBrands.every((b) => b === 'Samsung' || b === 'HP')).toBe(true);

      // Verify both brands are actually represented
      expect(returnedBrands.includes('Samsung')).toBe(true);
      expect(returnedBrands.includes('HP')).toBe(true);

      // Verify unselected brands (e.g. Qizilqum, DemoClima) are excluded
      expect(returnedBrands.includes('Qizilqum')).toBe(false);
      expect(returnedBrands.includes('DemoClima')).toBe(false);
    });

    it('supports single brand filter via backward compatible brand option', async () => {
      const res = await searchProductsByKeyword('', {
        brand: 'Samsung',
        includeDemo: true,
      });

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.length).toBeGreaterThan(0);
      expect(res.data!.every((p) => p.brand?.toLowerCase() === 'samsung')).toBe(true);
    });

    it('enforces AND logic across Category and multiple Brands', async () => {
      // Category: 'phones' AND Brands: ['Samsung', 'HP']
      // HP laptop is in 'computers', so only Samsung phones should be returned
      const res = await searchProductsByKeyword('', {
        category: 'phones',
        brands: ['Samsung', 'HP'],
        includeDemo: true,
      });

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.length).toBeGreaterThan(0);

      // All returned items must be phones AND Samsung
      expect(res.data!.every((p) => p.category === 'phones')).toBe(true);
      expect(res.data!.every((p) => p.brand === 'Samsung')).toBe(true);
      // HP laptop must NOT be present
      expect(res.data!.some((p) => p.brand === 'HP')).toBe(false);
    });

    it('enforces AND logic across Brands, Price Range, and inStock flag', async () => {
      const res = await searchProductsByKeyword('', {
        brands: ['Samsung'],
        minPrice: 2500000,
        maxPrice: 2900000,
        onlyInStock: true,
        includeDemo: true,
      });

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();

      for (const prod of res.data!) {
        expect(prod.brand).toBe('Samsung');
        expect(prod.minPrice).toBeGreaterThanOrEqual(2500000);
        expect(prod.minPrice).toBeLessThanOrEqual(2900000);
        if (prod.sellerCount !== undefined) {
          expect(prod.sellerCount).toBeGreaterThan(0);
        }
      }
    });

    it('returns empty array when brand does not exist', async () => {
      const res = await searchProductsByKeyword('', {
        brands: ['NonExistentBrand123'],
        includeDemo: true,
      });

      expect(res.error).toBeNull();
      expect(res.data).toEqual([]);
    });
  });

  describe('getAvailableBrands', () => {
    it('returns all distinct brands with accurate item counts across entire catalog', async () => {
      const brands = await getAvailableBrands();

      expect(brands).toBeDefined();
      expect(brands.length).toBeGreaterThan(0);

      const brandNames = brands.map((b) => b.name);
      expect(brandNames).toContain('Samsung');
      expect(brandNames).toContain('HP');
      expect(brandNames).toContain('Qizilqum');

      // Check item count
      const samsung = brands.find((b) => b.name === 'Samsung');
      expect(samsung).toBeDefined();
      expect(samsung!.count).toBeGreaterThanOrEqual(2); // A24 128GB and A24 256GB
    });

    it('returns brands scoped to a specific category', async () => {
      const phoneBrands = await getAvailableBrands('phones');
      const brandNames = phoneBrands.map((b) => b.name);

      expect(brandNames).toContain('Samsung');
      expect(brandNames).not.toContain('HP'); // HP is in computers
      expect(brandNames).not.toContain('Qizilqum'); // Qizilqum is in construction
    });
  });

  describe('getSearchSuggestions', () => {
    it('returns accurate matching products, brands, and categories for query "samsung"', async () => {
      const suggestions = await getSearchSuggestions('samsung');

      expect(suggestions.totalMatches).toBeGreaterThan(0);

      // Products check
      expect(suggestions.products.length).toBeGreaterThan(0);
      expect(suggestions.products.every((p) => p.type === 'product')).toBe(true);
      expect(suggestions.products.some((p) => p.title.toLowerCase().includes('samsung'))).toBe(true);
      expect(suggestions.products[0].minPrice).toBeGreaterThan(0);

      // Brands check
      expect(suggestions.brands.length).toBeGreaterThan(0);
      expect(suggestions.brands.some((b) => b.title === 'Samsung')).toBe(true);
      const samsungBrand = suggestions.brands.find((b) => b.title === 'Samsung');
      expect(samsungBrand!.subtitle).toContain('ta mahsulot');
      expect(samsungBrand!.count).toBeGreaterThanOrEqual(2);
    });

    it('returns category suggestions when searching for "telefon"', async () => {
      const suggestions = await getSearchSuggestions('telefon');

      expect(suggestions.totalMatches).toBeGreaterThan(0);
      expect(suggestions.categories.length).toBeGreaterThan(0);
      expect(suggestions.categories.some((c) => c.category === 'phones')).toBe(true);
      expect(suggestions.categories.find((c) => c.category === 'phones')!.title).toBe('Telefonlar');
    });

    it('returns empty suggestions and totalMatches: 0 on blank or whitespace query', async () => {
      const suggestions = await getSearchSuggestions('   ');

      expect(suggestions.products).toEqual([]);
      expect(suggestions.brands).toEqual([]);
      expect(suggestions.categories).toEqual([]);
      expect(suggestions.totalMatches).toBe(0);
    });

    it('never produces hallucinated or invented products or brands', async () => {
      const suggestions = await getSearchSuggestions('xyzUnrealToken999');

      expect(suggestions.products).toEqual([]);
      expect(suggestions.brands).toEqual([]);
      expect(suggestions.categories).toEqual([]);
      expect(suggestions.totalMatches).toBe(0);
    });
  });
});
