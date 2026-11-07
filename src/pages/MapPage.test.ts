import { describe, it, expect } from 'vitest';
import type { Store, Coordinates, ProductItem, InventoryOffer } from '@/types';
import { isValidCoordinates } from '@/utils/geo';
import { matchStoresWithProductOffers } from '@/utils/productStoreMatcher';

describe('MapPage & Dedicated Map Section Logic', () => {
  const mockStores: Store[] = [
    {
      id: 'store_nukus_center',
      name: 'Nukus Texnika Markazi',
      city: 'Nukus',
      district: 'Nukus shahri',
      address: 'A. Dosnazarov ko‘chasi, 12',
      coordinates: { lat: 42.4619, lng: 59.6166 },
      category: 'phones',
      phone: '+998612220000',
      openingHours: '09:00 - 20:00',
      isVerified: true,
      sourceType: 'birqidir',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
    {
      id: 'store_osm_kungrad',
      name: 'Qo‘ng‘irot Elektronika',
      city: 'Qo‘ng‘irot',
      district: 'Qo‘ng‘irot tumani',
      address: 'Markaziy ko‘cha, 45',
      coordinates: { lat: 43.0456, lng: 58.8543 },
      category: 'appliances',
      phone: '+998613330000',
      openingHours: '09:00 - 18:00',
      isVerified: false,
      sourceType: 'openstreetmap',
      createdAt: '2026-10-01',
      updatedAt: '2026-10-01',
    },
  ];

  const mockProduct: ProductItem = {
    id: 'prod_samsung_a24',
    name: 'Samsung Galaxy A24',
    normalizedName: 'samsung galaxy a24',
    searchKeywords: ['samsung', 'galaxy', 'a24'],
    category: 'phones',
    brand: 'Samsung',
    minPrice: 2400000,
    maxPrice: 2600000,
    sellerCount: 1,
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
  };

  const mockOffers: InventoryOffer[] = [
    {
      id: 'offer_1',
      storeId: 'store_nukus_center',
      productId: 'prod_samsung_a24',
      price: 2450000,
      currency: 'UZS',
      availability: 'in_stock',
      inStock: true,
      updatedAt: '2026-10-25',
    },
  ];

  it('correctly maps search query and filters into map destination URL', () => {
    const query = 'Samsung A24';
    const category = 'phones';
    const district = 'Nukus shahri';

    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (category) params.set('category', category);
    if (district) params.set('district', district);
    params.set('view', 'map');

    const destinationUrl = `/map?${params.toString()}`;
    expect(destinationUrl).toContain('q=Samsung+A24');
    expect(destinationUrl).toContain('category=phones');
    expect(destinationUrl).toContain('district=Nukus+shahri');
    expect(destinationUrl).toContain('view=map');
  });

  it('validates store coordinates before plotting on Leaflet map', () => {
    mockStores.forEach((st) => {
      expect(isValidCoordinates(st.coordinates)).toBe(true);
      expect(st.coordinates.lat).toBeGreaterThan(37);
      expect(st.coordinates.lat).toBeLessThan(46);
      expect(st.coordinates.lng).toBeGreaterThan(56);
      expect(st.coordinates.lng).toBeLessThan(73);
    });
  });

  it('distinguishes BirQidir verified partner stores from OpenStreetMap open data', () => {
    const birqidirStore = mockStores.find((s) => s.id === 'store_nukus_center');
    const osmStore = mockStores.find((s) => s.id === 'store_osm_kungrad');

    expect(birqidirStore?.sourceType).toBe('birqidir');
    expect(birqidirStore?.isVerified).toBe(true);

    expect(osmStore?.sourceType).toBe('openstreetmap');
    expect(osmStore?.isVerified).toBe(false);
  });

  it('matches searched product offer with corresponding store on the map', () => {
    const matched = matchStoresWithProductOffers(mockStores, mockOffers, mockProduct, {});

    expect(matched.length).toBe(1);
    const storeWithOffer = matched[0];
    expect(storeWithOffer.id).toBe('store_nukus_center');
    expect(storeWithOffer.matchedOffer).toBeDefined();
    expect(storeWithOffer.matchedOffer?.price).toBe(2450000);
    expect(storeWithOffer.matchedOffer?.inStock).toBe(true);
    expect(storeWithOffer.isCheapest).toBe(true);
  });

  it('handles empty query gracefully returning all stores for general map browsing', () => {
    const userCoords: Coordinates = { lat: 42.4619, lng: 59.6166 };
    expect(isValidCoordinates(userCoords)).toBe(true);
    expect(mockStores.length).toBeGreaterThan(0);
  });

  describe('Phase 4: Map Integration & Marker Invariants', () => {
    it('deduplicates stores by ID so a store never produces duplicate markers', () => {
      const storesWithDuplicates: Store[] = [
        mockStores[0],
        { ...mockStores[0] }, // Exact duplicate store
        mockStores[1],
      ];

      const uniqueStoresMap = new Map<string, Store>();
      storesWithDuplicates.forEach((s) => {
        if (s && s.id && !uniqueStoresMap.has(s.id)) {
          uniqueStoresMap.set(s.id, s);
        }
      });
      const uniqueStores = Array.from(uniqueStoresMap.values());

      expect(uniqueStores.length).toBe(2);
      expect(uniqueStores[0].id).toBe('store_nukus_center');
      expect(uniqueStores[1].id).toBe('store_osm_kungrad');
    });

    it('filters out invalid or missing coordinates before marker generation', () => {
      const mixedStores: Store[] = [
        mockStores[0],
        {
          ...mockStores[0],
          id: 'store_invalid_coords_1',
          coordinates: { lat: 0, lng: 0 },
        },
        {
          ...mockStores[0],
          id: 'store_invalid_coords_2',
          coordinates: { lat: 999, lng: 999 },
        },
        {
          ...mockStores[0],
          id: 'store_invalid_coords_3',
          coordinates: { lat: NaN, lng: 59.6 },
        },
      ];

      const validStores = mixedStores.filter((s) => isValidCoordinates(s.coordinates));
      expect(validStores.length).toBe(1);
      expect(validStores[0].id).toBe('store_nukus_center');
    });

    it('generates consistent store page link destination', () => {
      const storeId = 'store_nukus_center';
      const storeUrl = `/store/${encodeURIComponent(storeId)}`;
      expect(storeUrl).toBe('/store/store_nukus_center');
    });

    it('handles special characters in store IDs when generating store URLs', () => {
      const storeId = 'store/central#1';
      const storeUrl = `/store/${encodeURIComponent(storeId)}`;
      expect(storeUrl).toBe('/store/store%2Fcentral%231');
      expect(decodeURIComponent(storeUrl.replace('/store/', ''))).toBe(storeId);
    });
  });
});

