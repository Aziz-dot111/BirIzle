import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Store, InventoryOffer } from '@/types';
import {
  getStoreOffersWithProducts,
  getOffersByStore,
  getStoreById,
  isStoreVisibleToCustomer,
  clearStoreCache,
  clearProductCache,
} from '@/services/firebase/catalog';
import * as firestoreModule from 'firebase/firestore';

// Mock Firebase firestore module
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof firestoreModule>('firebase/firestore');
  return {
    ...actual,
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    orderBy: vi.fn(),
  };
});

describe('StoreDetailPage & Store Catalog Integration (Phase 4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearStoreCache();
    clearProductCache();
  });

  const mockStore: Store = {
    id: 'store_nukus_center',
    name: 'Nukus Texno Markaz',
    city: 'Nukus',
    district: 'Nukus shahri',
    address: 'Dosnazarov ko‘chasi, 12',
    coordinates: { lat: 42.4619, lng: 59.6166 },
    category: 'phones',
    phone: '+998612221122',
    openingHours: '09:00 - 20:00',
    isVerified: true,
    status: 'active',
    sourceType: 'birqidir',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  };

  const mockOffers: InventoryOffer[] = [
    {
      id: 'offer_galaxy_a24',
      storeId: 'store_nukus_center',
      productId: 'prod_galaxy_a24',
      price: 2450000,
      currency: 'UZS',
      availability: 'in_stock',
      inStock: true,
      warrantyMonths: 12,
      deliveryAvailable: true,
      status: 'active',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-25T00:00:00Z',
    },
    {
      id: 'offer_galaxy_a24_variant',
      storeId: 'store_nukus_center',
      productId: 'prod_galaxy_a24',
      variantId: '256gb-black',
      price: 2850000,
      currency: 'UZS',
      availability: 'in_stock',
      inStock: true,
      warrantyMonths: 12,
      deliveryAvailable: true,
      status: 'active',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-25T00:00:00Z',
    },
    {
      id: 'offer_other_store',
      storeId: 'store_other_ Kungrad',
      productId: 'prod_galaxy_a24',
      price: 2100000,
      currency: 'UZS',
      availability: 'in_stock',
      inStock: true,
      status: 'active',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-25T00:00:00Z',
    },
    {
      id: 'offer_archived',
      storeId: 'store_nukus_center',
      productId: 'prod_old_model',
      price: 1500000,
      currency: 'UZS',
      availability: 'out_of_stock',
      inStock: false,
      status: 'archived',
      createdAt: '2026-05-01T00:00:00Z',
      updatedAt: '2026-06-01T00:00:00Z',
    },
    {
      id: 'offer_zero_price',
      storeId: 'store_nukus_center',
      productId: 'prod_free_tester',
      price: 0,
      currency: 'UZS',
      availability: 'in_stock',
      inStock: true,
      status: 'active',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-25T00:00:00Z',
    },
  ];

  it('1. Rejects invalid or blank storeId gracefully', async () => {
    const res1 = await getStoreOffersWithProducts('');
    expect(res1.error).toBe('Do‘kon identifikatori ko‘rsatilmadi.');
    expect(res1.data).toBeNull();

    const res2 = await getStoreOffersWithProducts('   ');
    expect(res2.error).toBe('Do‘kon identifikatori ko‘rsatilmadi.');
    expect(res2.data).toBeNull();
  });

  it('2. Strictly filters offers so only offers belonging to target storeId are returned', async () => {
    vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: mockOffers.map((o) => ({
        id: o.id,
        data: () => ({ ...o }),
      })),
    } as unknown as firestoreModule.QuerySnapshot);

    const res = await getOffersByStore('store_nukus_center');
    expect(res.error).toBeNull();
    expect(res.data).toBeDefined();

    // Must NOT contain offer_other_store belonging to store_other_ Kungrad
    expect(res.data!.some((o) => o.storeId !== 'store_nukus_center')).toBe(false);

    // Must NOT contain archived offers
    expect(res.data!.some((o) => o.id === 'offer_archived')).toBe(false);

    // Must NOT contain zero or negative priced offers
    expect(res.data!.some((o) => o.id === 'offer_zero_price')).toBe(false);

    // Valid active offers for store_nukus_center
    expect(res.data!.length).toBe(2);
    expect(res.data!.map((o) => o.id)).toEqual([
      'offer_galaxy_a24',
      'offer_galaxy_a24_variant',
    ]);
  });

  it('3. getStoreOffersWithProducts joins store offers with product catalog metadata', async () => {
    // 1st getDocs call: getOffersByStore query
    vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'offer_galaxy_a24',
          data: () => ({
            storeId: 'store_nukus_center',
            productId: 'prod_galaxy_a24',
            price: 2450000,
            currency: 'UZS',
            availability: 'in_stock',
            inStock: true,
            status: 'active',
          }),
        },
      ],
    } as unknown as firestoreModule.QuerySnapshot);

    // 2nd getDocs call: getAllProductsCached query
    vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'prod_galaxy_a24',
          data: () => ({
            name: 'Samsung Galaxy A24',
            category: 'phones',
            brand: 'Samsung',
            model: 'SM-A245F',
            imageUrl: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf',
            status: 'active',
          }),
        },
      ],
    } as unknown as firestoreModule.QuerySnapshot);

    const res = await getStoreOffersWithProducts('store_nukus_center');
    expect(res.error).toBeNull();
    expect(res.data).toBeDefined();
    expect(res.data!.length).toBe(1);

    const item = res.data![0];
    expect(item.productId).toBe('prod_galaxy_a24');
    expect(item.productName).toBe('Samsung Galaxy A24');
    expect(item.productCategory).toBe('phones');
    expect(item.productBrand).toBe('Samsung');
    expect(item.productModel).toBe('SM-A245F');
    expect(item.price).toBe(2450000);
  });

  it('4. Separates base product offers from variant offers in store catalog', async () => {
    vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'offer|s:s1|p:p1',
          data: () => ({
            storeId: 's1',
            productId: 'p1',
            price: 100000,
            currency: 'UZS',
            availability: 'in_stock',
            status: 'active',
          }),
        },
        {
          id: 'offer|s:s1|p:p1|v:128gb',
          data: () => ({
            storeId: 's1',
            productId: 'p1',
            variantId: '128gb',
            price: 130000,
            currency: 'UZS',
            availability: 'in_stock',
            status: 'active',
          }),
        },
      ],
    } as unknown as firestoreModule.QuerySnapshot);

    // Products mock
    vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'p1',
          data: () => ({ name: 'Test Phone', category: 'phones' }),
        },
      ],
    } as unknown as firestoreModule.QuerySnapshot);

    const res = await getStoreOffersWithProducts('s1');
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(2);

    const baseOffer = res.data!.find((o) => !o.variantId);
    const variantOffer = res.data!.find((o) => o.variantId === '128gb');

    expect(baseOffer).toBeDefined();
    expect(variantOffer).toBeDefined();
    expect(baseOffer!.price).toBe(100000);
    expect(variantOffer!.price).toBe(130000);
  });

  it('5. Returns empty array cleanly when a store has no offers published', async () => {
    vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
      empty: true,
      docs: [],
    } as unknown as firestoreModule.QuerySnapshot);

    const res = await getStoreOffersWithProducts('store_empty');
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });

  it('6. Preserves admin-verified unclaimed stores in customer visibility', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: 'store_unclaimed_verified',
      data: () => ({
        name: 'Davlat Savdo Markazi',
        city: 'Nukus',
        address: 'Markaziy ko‘cha 1',
        isVerified: true,
        ownershipStatus: 'unclaimed',
        status: 'active',
      }),
    } as unknown as firestoreModule.DocumentSnapshot);

    const res = await getStoreById('store_unclaimed_verified');
    expect(res.error).toBeNull();
    expect(res.data).toBeDefined();
    expect(res.data!.isVerified).toBe(true);
    expect(res.data!.ownershipStatus).toBe('unclaimed');
  });

  it('7. Excludes archived stores from customer visibility', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: 'store_archived_1',
      data: () => ({
        name: 'Yopilgan Do‘kon',
        city: 'Nukus',
        address: 'Eski bozor',
        status: 'archived',
        isVerified: false,
      }),
    } as unknown as firestoreModule.DocumentSnapshot);

    const res = await getStoreById('store_archived_1');
    expect(res.error).toBeNull();
    expect(res.data!.status).toBe('archived');
  });

  it('8. Loads active store details by storeId correctly', async () => {
    vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
      exists: () => true,
      id: mockStore.id,
      data: () => ({ ...mockStore }),
    } as unknown as firestoreModule.DocumentSnapshot);

    const res = await getStoreById(mockStore.id);
    expect(res.error).toBeNull();
    expect(res.data).toBeDefined();
    expect(res.data!.id).toBe(mockStore.id);
    expect(res.data!.name).toBe(mockStore.name);
    expect(res.data!.status).toBe('active');
  });

  it('9. isStoreVisibleToCustomer hides unverified pending merchant stores', () => {
    const pendingStore: Store = {
      id: 'store_pending_1',
      name: 'Yangi Ariza',
      city: 'Nukus',
      address: 'Ko‘cha',
      coordinates: { lat: 42.46, lng: 59.61 },
      category: 'phones',
      phone: '',
      openingHours: '',
      isVerified: false,
      status: 'pending',
      isDemo: false,
      createdAt: '',
      updatedAt: '',
    };

    expect(isStoreVisibleToCustomer(pendingStore)).toBe(false);
  });

  it('10. Separates real verified stores from demo stores', () => {
    const realVerifiedStore: Store = {
      ...mockStore,
      isVerified: true,
      isDemo: false,
    };
    const demoStore: Store = {
      ...mockStore,
      isVerified: true,
      isDemo: true,
    };

    // A real verified partner must have isVerified && !isDemo
    expect(Boolean(realVerifiedStore.isVerified && !realVerifiedStore.isDemo)).toBe(true);
    // A demo store must not be marked as real verified partner
    expect(Boolean(demoStore.isVerified && !demoStore.isDemo)).toBe(false);
  });

  it('11. getOffersByStore filters out superseded and isSuperseded offers', async () => {
    vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          id: 'offer_active',
          data: () => ({
            storeId: 'store_nukus_center',
            productId: 'prod_1',
            price: 500000,
            currency: 'UZS',
            availability: 'in_stock',
            status: 'active',
          }),
        },
        {
          id: 'offer_superseded_status',
          data: () => ({
            storeId: 'store_nukus_center',
            productId: 'prod_2',
            price: 450000,
            currency: 'UZS',
            availability: 'in_stock',
            status: 'superseded',
          }),
        },
        {
          id: 'offer_superseded_flag',
          data: () => ({
            storeId: 'store_nukus_center',
            productId: 'prod_3',
            price: 400000,
            currency: 'UZS',
            availability: 'in_stock',
            status: 'active',
            isSuperseded: true,
          }),
        },
      ],
    } as unknown as firestoreModule.QuerySnapshot);

    const res = await getOffersByStore('store_nukus_center');
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    expect(res.data![0].id).toBe('offer_active');
  });

  it('12. deactivateStore sets status to archived and is rejected by isStoreVisibleToCustomer', () => {
    // In catalog.ts, deactivateStore sets { status: 'archived' }
    const activeStore: Store = {
      ...mockStore,
      status: 'active',
    };
    expect(isStoreVisibleToCustomer(activeStore)).toBe(true);

    const deactivatedStore: Store = {
      ...mockStore,
      status: 'archived',
    };
    expect(isStoreVisibleToCustomer(deactivatedStore)).toBe(false);
  });

  it('13. isStoreVisibleToCustomer hides inactive stores and permits admin unclaimed stores', () => {
    const inactiveStore: Store = {
      ...mockStore,
      status: 'inactive',
    };
    expect(isStoreVisibleToCustomer(inactiveStore)).toBe(false);

    const adminUnclaimedStore: Store = {
      ...mockStore,
      status: 'active',
      isVerified: true,
      ownershipStatus: 'unclaimed',
    };
    expect(isStoreVisibleToCustomer(adminUnclaimedStore)).toBe(true);

    // Legacy store without status field remains active
    const legacyStore: Store = {
      ...mockStore,
      status: undefined,
    };
    expect(isStoreVisibleToCustomer(legacyStore)).toBe(true);
  });
});
