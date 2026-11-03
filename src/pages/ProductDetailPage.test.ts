import { describe, it, expect } from 'vitest';
import type { StoreProductOffer, Coordinates, ProductItem } from '@/types';
import { isValidCoordinates } from '@/utils/geo';

describe('ProductDetailPage logic & calculations', () => {
  const mockProductA24_128: ProductItem = {
    id: 'demo_prod_samsung_a24',
    name: 'Samsung Galaxy A24 128GB',
    normalizedName: 'samsung galaxy a24 128gb',
    searchKeywords: ['samsung', 'galaxy', 'a24', '128gb'],
    category: 'phones',
    brand: 'Samsung',
    model: 'Galaxy A24 (SM-A245F)',
    variant: { storage: '128GB', ram: '6GB', color: 'Qora (Black)' },
    specifications: {
      'Ekran': '6.5" Super AMOLED 90Hz',
      'Xotira': '128GB',
      'Batareya': '5000 mAh',
    },
    minPrice: 2450000,
    maxPrice: 2600000,
    sellerCount: 2,
    isDemo: true,
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
  };

  const mockProductA24_256: ProductItem = {
    id: 'demo_prod_samsung_a24_256',
    name: 'Samsung Galaxy A24 256GB',
    normalizedName: 'samsung galaxy a24 256gb',
    searchKeywords: ['samsung', 'galaxy', 'a24', '256gb'],
    category: 'phones',
    brand: 'Samsung',
    model: 'Galaxy A24 (SM-A245F)',
    variant: { storage: '256GB', ram: '8GB', color: 'Kumushrang' },
    minPrice: 2850000,
    maxPrice: 3000000,
    sellerCount: 2,
    isDemo: true,
    createdAt: '2026-10-01',
    updatedAt: '2026-10-01',
  };

  const mockOffers: StoreProductOffer[] = [
    {
      id: 'offer-1',
      storeId: 'store-1',
      productId: 'demo_prod_samsung_a24',
      storeName: 'Texnomart Nukus',
      storeCity: 'Nukus',
      storeAddress: 'A. Dosnazarov 45',
      price: 2600000,
      currency: 'UZS',
      availability: 'in_stock',
      inStock: true,
      distanceKm: 4.2,
      storeCoordinates: { lat: 42.465, lng: 59.612 },
      updatedAt: '2026-10-20',
      isDemo: false,
    },
    {
      id: 'offer-2',
      storeId: 'store-2',
      productId: 'demo_prod_samsung_a24',
      storeName: 'Mediapark Nukus',
      storeCity: 'Nukus',
      storeAddress: 'Ernazar Alakoz 12',
      price: 2450000, // Lowest positive price
      currency: 'UZS',
      availability: 'in_stock',
      inStock: true,
      distanceKm: 8.5,
      storeCoordinates: { lat: 42.47, lng: 59.62 },
      updatedAt: '2026-10-15',
      isDemo: true,
    },
    {
      id: 'offer-3',
      storeId: 'store-3',
      productId: 'demo_prod_samsung_a24',
      storeName: 'Nukus Smart Mobile',
      storeCity: 'Nukus',
      storeAddress: 'Turtkul guzari 8',
      price: 2700000,
      currency: 'UZS',
      availability: 'out_of_stock',
      inStock: false,
      distanceKm: 1.1, // Closest store
      storeCoordinates: { lat: 42.461, lng: 59.615 },
      updatedAt: '2026-06-01', // Stale date (> 100 days)
      isDemo: true,
    },
    {
      id: 'offer-4-unpriced',
      storeId: 'store-4',
      productId: 'demo_prod_samsung_a24',
      storeName: 'Nukus Bozor Rasta',
      storeCity: 'Nukus',
      storeAddress: 'Bozor',
      price: 0, // Unpriced / 0 price
      currency: 'UZS',
      availability: 'pre_order',
      inStock: false,
      updatedAt: '2026-10-01',
      isDemo: true,
    },
  ];

  it('computes lowest, highest price and maximum potential savings ignoring 0 or missing prices', () => {
    const validPrices = mockOffers.map((o) => o.price).filter((p) => p > 0);
    const lowest = Math.min(...validPrices);
    const highest = Math.max(...validPrices);
    const savings = highest - lowest;

    expect(lowest).toBe(2450000);
    expect(highest).toBe(2700000);
    expect(savings).toBe(250000);
    expect(validPrices).not.toContain(0);
  });

  it('sorts offers by price ascending with 0/unpriced offers pushed to the end', () => {
    const sorted = [...mockOffers].sort((a, b) => {
      const hasA = typeof a.price === 'number' && a.price > 0;
      const hasB = typeof b.price === 'number' && b.price > 0;
      if (!hasA && !hasB) return 0;
      if (!hasA) return 1;
      if (!hasB) return -1;
      return a.price - b.price;
    });

    expect(sorted[0].id).toBe('offer-2'); // 2,450,000 (cheapest)
    expect(sorted[1].id).toBe('offer-1'); // 2,600,000
    expect(sorted[2].id).toBe('offer-3'); // 2,700,000
    expect(sorted[3].id).toBe('offer-4-unpriced'); // 0 -> last
  });

  it('filters out-of-stock offers when onlyInStock is enabled', () => {
    const inStockOnly = mockOffers.filter((o) => o.inStock || o.availability === 'in_stock');
    expect(inStockOnly).toHaveLength(2);
    expect(inStockOnly.map((o) => o.id)).toEqual(['offer-1', 'offer-2']);
    expect(inStockOnly.some((o) => o.id === 'offer-3')).toBe(false);
  });

  it('sorts offers by distance (closest first) pushing stores without distance to the end', () => {
    const sorted = [...mockOffers].sort(
      (a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999)
    );
    expect(sorted[0].storeId).toBe('store-3'); // 1.1 km
    expect(sorted[1].storeId).toBe('store-1'); // 4.2 km
    expect(sorted[2].storeId).toBe('store-2'); // 8.5 km
    expect(sorted[3].storeId).toBe('store-4'); // no distance -> last
  });

  it('filters offers within specified radius', () => {
    const radiusKm = 5.0;
    const within5Km = mockOffers.filter(
      (o) => o.distanceKm !== undefined && o.distanceKm <= radiusKm
    );
    expect(within5Km).toHaveLength(2); // store-3 (1.1km) and store-1 (4.2km)
    expect(within5Km.some((o) => o.storeId === 'store-2')).toBe(false);
  });

  it('keeps distinct variants (128GB vs 256GB) strictly separated and not merged', () => {
    // Both products belong to same model "Galaxy A24 (SM-A245F)"
    expect(mockProductA24_128.model).toBe(mockProductA24_256.model);
    // But have distinct IDs and storage capacities
    expect(mockProductA24_128.id).not.toBe(mockProductA24_256.id);
    expect(mockProductA24_128.variant?.storage).toBe('128GB');
    expect(mockProductA24_256.variant?.storage).toBe('256GB');

    // Offers for 128GB must never be assigned to 256GB
    const offersFor128 = mockOffers.filter((o) => o.productId === mockProductA24_128.id);
    expect(offersFor128.every((o) => o.productId === 'demo_prod_samsung_a24')).toBe(true);
  });

  it('accurately distinguishes demo vs real verified offers', () => {
    const realOffer = mockOffers.find((o) => o.id === 'offer-1');
    const demoOffer = mockOffers.find((o) => o.id === 'offer-2');

    expect(realOffer?.isDemo).toBe(false);
    expect(demoOffer?.isDemo).toBe(true);
  });

  it('detects stale offers based on updatedAt age (> 60 days)', () => {
    const freshDate = '2026-10-20';
    const staleDate = '2026-06-01';

    const isStale = (dateStr: string) => {
      const diffMs = new Date('2026-11-03').getTime() - new Date(dateStr).getTime();
      return diffMs > 60 * 24 * 3600 * 1000;
    };

    expect(isStale(freshDate)).toBe(false);
    expect(isStale(staleDate)).toBe(true);
  });

  it('converts offers to stores with proper isCheapest and isClosest badges for map', () => {
    const validPrices = mockOffers.map((o) => o.price).filter((p) => p > 0);
    const lowestPrice = Math.min(...validPrices);
    const minDistance = Math.min(
      ...mockOffers.filter((o) => o.distanceKm !== undefined).map((o) => o.distanceKm as number)
    );

    const storesForMap = mockOffers
      .filter((o) => o.storeCoordinates && isValidCoordinates(o.storeCoordinates))
      .map((o) => ({
        id: o.storeId,
        name: o.storeName,
        coordinates: o.storeCoordinates as Coordinates,
        isCheapest: o.price === lowestPrice && o.price > 0,
        isClosest: o.distanceKm === minDistance,
        matchedOffer: {
          productId: mockProductA24_128.id,
          price: o.price,
        },
      }));

    // store-2 must have isCheapest=true
    const cheapestStore = storesForMap.find((s) => s.id === 'store-2');
    expect(cheapestStore?.isCheapest).toBe(true);
    expect(cheapestStore?.isClosest).toBe(false);

    // store-3 must have isClosest=true
    const closestStore = storesForMap.find((s) => s.id === 'store-3');
    expect(closestStore?.isClosest).toBe(true);
    expect(closestStore?.isCheapest).toBe(false);

    // all coordinates are valid
    expect(storesForMap.every((s) => isValidCoordinates(s.coordinates))).toBe(true);
  });
});
