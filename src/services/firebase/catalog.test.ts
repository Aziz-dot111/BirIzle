import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestoreModule from 'firebase/firestore';
import type {
  Firestore,
  DocumentReference,
  CollectionReference,
  Query,
  DocumentData,
} from 'firebase/firestore';
import {
  mapDocumentToStore,
  mapDocumentToProduct,
  mapDocumentToOffer,
  getStores,
  getStoreById,
  getProducts,
  getProductById,
  searchProductsByKeyword,
  getOffersForProduct,
  getOffersByStore,
  getStoreProductOffers,
  clearStoreCache,
  createStore,
  createAdminStore,
  deactivateStore,
  reactivateStore,
  updateStore,
  createOffer,
  updateOffer,
  deleteOffer,
  getStoresByOwner,
} from './catalog';

const mockCurrentUser: {
  uid: string;
  getIdTokenResult: ReturnType<typeof vi.fn>;
} = {
  uid: 'mock_owner_123',
  getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
};

vi.mock('./firebase', () => ({
  firestoreDb: {},
  isFirebaseReady: true,
  firebaseAuth: {
    get currentUser() {
      return mockCurrentUser;
    },
  },
}));

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof firestoreModule>('firebase/firestore');
  return {
    ...actual,
    collection: vi.fn((_db: Firestore, name: string) => ({ path: name })),
    doc: vi.fn((_db: Firestore, _col: string | CollectionReference<DocumentData>, id?: string) => ({ id: id || 'auto_doc_id' })),
    query: vi.fn((col: Query<DocumentData>) => col),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(() => '2026-10-26T00:00:00.000Z'),
  };
});

describe('Firestore Catalog Service Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearStoreCache();
  });

  describe('Document Mappers', () => {
    it('correctly maps Firestore document to Store type with safe defaults', () => {
      const rawData = {
        name: 'Nukus Savdo Markazi',
        city: 'Nukus',
        address: 'Dosnazarov ko‘chasi, 12',
        coordinates: { lat: 42.46, lng: 59.61 },
        category: 'electronics',
        phone: '+998612220000',
        openingHours: '09:00 - 20:00',
        isVerified: true,
        createdAt: '2026-10-19T00:00:00.000Z',
        updatedAt: '2026-10-19T00:00:00.000Z',
      };

      const store = mapDocumentToStore('store_123', rawData);

      expect(store.id).toBe('store_123');
      expect(store.name).toBe('Nukus Savdo Markazi');
      expect(store.city).toBe('Nukus');
      expect(store.coordinates.lat).toBe(42.46);
      expect(store.coordinates.lng).toBe(59.61);
      expect(store.isVerified).toBe(true);
      expect(store.ownershipStatus).toBe('unclaimed');

      const claimedStore = mapDocumentToStore('store_claimed', {
        ...rawData,
        ownerId: 'usr_abc',
      });
      expect(claimedStore.ownershipStatus).toBe('claimed');
      expect(claimedStore.ownerId).toBe('usr_abc');
    });

    it('correctly maps Firestore document to ProductItem type with search metadata', () => {
      const rawData = {
        name: 'Samsung Galaxy A54',
        normalizedName: 'samsung galaxy a54',
        searchKeywords: ['samsung', 'galaxy', 'a54', 'smartfon'],
        category: 'phones',
        brand: 'Samsung',
        barcode: '8806091234567',
        minPrice: 3200000,
        maxPrice: 3600000,
        sellerCount: 4,
        createdAt: '2026-10-19T00:00:00.000Z',
        updatedAt: '2026-10-19T00:00:00.000Z',
      };

      const product = mapDocumentToProduct('prod_samsung_a54', rawData);

      expect(product.id).toBe('prod_samsung_a54');
      expect(product.normalizedName).toBe('samsung galaxy a54');
      expect(product.searchKeywords).toContain('galaxy');
      expect(product.minPrice).toBe(3200000);
      expect(product.sellerCount).toBe(4);
    });

    it('correctly maps Firestore document to InventoryOffer type', () => {
      const rawData = {
        storeId: 'store_123',
        productId: 'prod_456',
        price: 2500000,
        currency: 'UZS',
        availability: 'in_stock',
        warrantyMonths: 12,
        deliveryAvailable: true,
        updatedAt: '2026-10-19T00:00:00.000Z',
      };

      const offer = mapDocumentToOffer('offer_789', rawData);

      expect(offer.id).toBe('offer_789');
      expect(offer.storeId).toBe('store_123');
      expect(offer.productId).toBe('prod_456');
      expect(offer.price).toBe(2500000);
      expect(offer.inStock).toBe(true);
      expect(offer.currency).toBe('UZS');
    });
  });

  describe('Stores & Products Query Handlers (Firestore Mocked)', () => {
    it('fetches stores list from Firestore', async () => {
      const mockDocs = [
        {
          id: 'store_nukus_1',
          data: () => ({
            name: 'Nukus Test Do‘koni',
            city: 'Nukus',
            address: 'A. Dosnazarov 10',
            coordinates: { lat: 42.46, lng: 59.61 },
            category: 'electronics',
            phone: '+998612221111',
            openingHours: '09:00 - 18:00',
            isVerified: true,
            createdAt: '2026-10-19T00:00:00.000Z',
            updatedAt: '2026-10-19T00:00:00.000Z',
          }),
        },
      ];

      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await getStores({ includeOsm: false });
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.length).toBe(1);
      expect(res.data![0].id).toBe('store_nukus_1');
      expect(res.data![0].name).toBe('Nukus Test Do‘koni');
    });

    it('merges Karakalpakstan OSM places when includeOsm is true (default)', async () => {
      const mockDocs = [
        {
          id: 'store_nukus_1',
          data: () => ({
            name: 'Nukus Test Do‘koni',
            category: 'Supermarket',
            address: 'Ernazar Alako‘z ko‘chasi, 12',
            city: 'Nukus',
            district: 'Nukus shahri',
            sourceType: 'birqidir',
            isVerified: true,
          }),
        },
      ];

      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: mockDocs,
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await getStores();
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.length).toBeGreaterThan(1);
      // Both BirQidir store and OSM places are present
      expect(res.data!.some((s) => s.id === 'store_nukus_1')).toBe(true);
      expect(res.data!.some((s) => s.sourceType === 'openstreetmap')).toBe(true);
    });

    it('filters stores by Karakalpakstan district and sourceType', async () => {
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
      } as unknown as firestoreModule.QuerySnapshot);

      const resOsm = await getStores({ sourceType: 'openstreetmap', district: 'Qo‘ng‘irot' });
      expect(resOsm.error).toBeNull();
      expect(resOsm.data).toBeDefined();
      expect(resOsm.data!.length).toBeGreaterThan(0);
      expect(resOsm.data!.every((s) => s.sourceType === 'openstreetmap')).toBe(true);
      expect(resOsm.data!.every((s) => (s.district || s.city).includes('Qo‘ng‘irot'))).toBe(true);
    });

    it('falls back to demo stores when collection is empty in development', async () => {
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await getStores({ includeDemo: true });
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.length).toBeGreaterThan(0);
      expect(res.data![0].city).toBe('Nukus');
    });

    it('fetches single store by storeId', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'store_target_id',
        data: () => ({
          name: 'Nukus Markaziy Filial',
          city: 'Nukus',
          address: 'Markaziy ko‘cha',
          category: 'appliances',
          phone: '+998612223333',
          openingHours: '09:00 - 19:00',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await getStoreById('store_target_id');
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.id).toBe('store_target_id');
      expect(res.data!.name).toBe('Nukus Markaziy Filial');
    });

    it('returns error when invalid storeId is provided', async () => {
      const res = await getStoreById('');
      expect(res.data).toBeNull();
      expect(res.error).toBeTruthy();
    });

    it('fetches products list safely', async () => {
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'prod_1',
            data: () => ({
              name: 'Smartfon Test 1',
              normalizedName: 'smartfon test 1',
              searchKeywords: ['smartfon', 'test'],
              category: 'phones',
            }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await getProducts();
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.length).toBe(1);
      expect(res.data![0].name).toBe('Smartfon Test 1');
    });

    it('fetches single product by productId', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'prod_phone_128',
        data: () => ({
          name: 'Smartfon Flagman 128',
          category: 'phones',
          minPrice: 4000000,
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await getProductById('prod_phone_128');
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.id).toBe('prod_phone_128');
      expect(res.data!.category).toBe('phones');
    });

    it('searches products by keyword', async () => {
      vi.mocked(firestoreModule.getDocs)
        .mockResolvedValueOnce({
          empty: false,
          docs: [
            {
              id: 'prod_k1',
              data: () => ({
                name: 'Inverter Konditsioner',
                searchKeywords: ['inverter', 'konditsioner'],
                category: 'appliances',
              }),
            },
          ],
        } as unknown as firestoreModule.QuerySnapshot)
        .mockResolvedValueOnce({
          empty: true,
          docs: [],
        } as unknown as firestoreModule.QuerySnapshot);

      const res = await searchProductsByKeyword('konditsioner');
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.length).toBe(1);
      expect(res.data![0].name).toContain('Konditsioner');
    });
  });

  describe('Inventory Offers & Relational Store-Product Join', () => {
    it('fetches offers for a product ordered by price ascending', async () => {
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'offer_1',
            data: () => ({
              storeId: 'store_a',
              productId: 'prod_phone_128',
              price: 4200000,
              currency: 'UZS',
              availability: 'in_stock',
            }),
          },
          {
            id: 'offer_2',
            data: () => ({
              storeId: 'store_b',
              productId: 'prod_phone_128',
              price: 4500000,
              currency: 'UZS',
              availability: 'in_stock',
            }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await getOffersForProduct('prod_phone_128');
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.length).toBe(2);
      expect(res.data![0].price).toBe(4200000);
      expect(res.data![1].price).toBe(4500000);
    });

    it('fetches offers for a store', async () => {
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'offer_s1',
            data: () => ({
              storeId: 'store_nukus_center',
              productId: 'prod_1',
              price: 1500000,
            }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await getOffersByStore('store_nukus_center');
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.length).toBe(1);
      expect(res.data![0].storeId).toBe('store_nukus_center');
    });

    it('joins offers with store metadata and sorts by price ascending (cheapest first)', async () => {
      // 1. Mock getDocs for getOffersForProduct
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'offer_high',
            data: () => ({
              storeId: 'store_expensive',
              productId: 'prod_test',
              price: 5000000,
              currency: 'UZS',
              availability: 'in_stock',
            }),
          },
          {
            id: 'offer_low',
            data: () => ({
              storeId: 'store_cheap',
              productId: 'prod_test',
              price: 4100000,
              currency: 'UZS',
              availability: 'in_stock',
            }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      // 2. Mock getDoc for each store
      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef: DocumentReference<unknown, DocumentData>) => {
        const id = (docRef as unknown as { id?: string })?.id || 'store_cheap';
        if (id === 'store_cheap') {
          return {
            exists: () => true,
            id: 'store_cheap',
            data: () => ({
              name: 'Arzon Texnika Nukus',
              city: 'Nukus',
              address: 'Eski Shaxar 5',
              phone: '+998612224444',
              isVerified: true,
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }

        return {
          exists: () => true,
          id: 'store_expensive',
          data: () => ({
            name: 'Premium Texnika Nukus',
            city: 'Nukus',
            address: 'Amir Temur 20',
            phone: '+998612225555',
            isVerified: false,
          }),
        } as unknown as firestoreModule.DocumentSnapshot;
      });

      const res = await getStoreProductOffers('prod_test');
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.length).toBe(2);

      const firstOffer = res.data![0];
      const secondOffer = res.data![1];

      // Verifying price sorting (cheaper 4100000 must come first)
      expect(firstOffer.price).toBe(4100000);
      expect(firstOffer.storeName).toBe('Arzon Texnika Nukus');
      expect(firstOffer.isStoreVerified).toBe(true);
      expect(firstOffer.storeAddress).toBe('Eski Shaxar 5');

      expect(secondOffer.price).toBe(5000000);
      expect(secondOffer.storeName).toBe('Premium Texnika Nukus');
    });

    it('returns empty array cleanly when product has no offers', async () => {
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await getStoreProductOffers('empty_prod_xyz');
      expect(res.error).toBeNull();
      expect(res.data).toEqual([]);
    });
  });

  describe('Store Owner (Merchant) Management Services', () => {
    const validStoreInput = {
      name: 'Nukus Test Do‘koni',
      city: 'Nukus',
      address: 'Dosnazarov 15',
      coordinates: { lat: 42.46, lng: 59.61 },
      category: 'electronics',
      phone: '+998901234567',
      openingHours: '09:00 - 20:00',
    };

    it('createStore: successfully creates store binding ownerId to authenticated UID and sets isVerified to false', async () => {
      const res = await createStore(validStoreInput);
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.ownerId).toBe('mock_owner_123');
      expect(res.data!.isVerified).toBe(false);
      expect(res.data!.status).toBe('pending');
      expect(firestoreModule.setDoc).toHaveBeenCalled();
    });

    it('createStore: rejects invalid input before touching Firestore', async () => {
      const res = await createStore({ ...validStoreInput, name: 'A' });
      expect(res.data).toBeNull();
      expect(res.error).toBeTruthy();
    });

    it('createAdminStore: rejects when caller is not an administrator', async () => {
      mockCurrentUser.getIdTokenResult.mockResolvedValueOnce({ claims: {} });
      const res = await createAdminStore(validStoreInput);
      expect(res.data).toBeNull();
      expect(res.error).toContain('administrator');
    });

    it('createAdminStore: succeeds when caller is admin, sets ownerId: null, unclaimed, verified and active', async () => {
      mockCurrentUser.getIdTokenResult.mockResolvedValueOnce({ claims: { admin: true } });
      const res = await createAdminStore(validStoreInput);
      expect(res.error).toBeNull();
      expect(res.data).toBeTruthy();
      expect(res.data?.ownerId).toBeNull();
      expect(res.data?.ownershipStatus).toBe('unclaimed');
      expect(res.data?.isVerified).toBe(true);
      expect(res.data?.status).toBe('active');
    });

    it('deactivateStore & reactivateStore: transitions store status between archived and active', async () => {
      // 1. Deactivate
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'store_123',
        data: () => ({
          ...validStoreInput,
          ownerId: 'mock_owner_123',
          status: 'active',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const deactRes = await deactivateStore('store_123');
      expect(firestoreModule.updateDoc).toHaveBeenCalled();
      expect(deactRes.error).toBeNull();

      // 2. Reactivate
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'store_123',
        data: () => ({
          ...validStoreInput,
          ownerId: 'mock_owner_123',
          status: 'archived',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const reactRes = await reactivateStore('store_123');
      expect(firestoreModule.updateDoc).toHaveBeenCalled();
      expect(reactRes.error).toBeNull();
    });

    it('updateStore: successfully updates store when caller is the owner', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'store_123',
        data: () => ({
          ...validStoreInput,
          ownerId: 'mock_owner_123',
          isVerified: false,
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await updateStore('store_123', { phone: '+998909876543' });
      expect(firestoreModule.updateDoc).toHaveBeenCalled();
      expect(res.error).toBeNull();
    });

    it('updateStore: rejects update when caller is neither owner nor admin', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'store_bob',
        data: () => ({
          ...validStoreInput,
          ownerId: 'different_user_uid',
          isVerified: false,
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await updateStore('store_bob', { phone: '+998909876543' });
      expect(res.data).toBeNull();
      expect(res.error).toContain('ruxsat');
    });

    it('createOffer: rejects when caller does not own the referenced store', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'store_other',
        data: () => ({
          ownerId: 'stranger_uid',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await createOffer({
        storeId: 'store_other',
        productId: 'prod_1',
        price: 2500000,
      });

      expect(res.data).toBeNull();
      expect(res.error).toContain('tegishli');
    });

    it('createOffer: succeeds when caller is store owner, binds ownerId', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'store_mine',
        data: () => ({
          ownerId: 'mock_owner_123',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await createOffer({
        storeId: 'store_mine',
        productId: 'prod_1',
        price: 3200000,
        availability: 'in_stock',
      });

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.ownerId).toBe('mock_owner_123');
      expect(res.data!.price).toBe(3200000);
      expect(firestoreModule.setDoc).toHaveBeenCalled();
    });

    it('updateOffer: rejects when caller is not the owner of the offer', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'offer_other',
        data: () => ({
          ownerId: 'stranger_uid',
          price: 100000,
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await updateOffer('offer_other', { price: 120000 });
      expect(res.data).toBeNull();
      expect(res.error).toContain('ruxsat');
    });

    it('deleteOffer: successfully deletes offer when caller is the owner', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'offer_mine',
        data: () => ({
          ownerId: 'mock_owner_123',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await deleteOffer('offer_mine');
      expect(res.error).toBeNull();
      expect(firestoreModule.deleteDoc).toHaveBeenCalled();
    });

    it('getStoresByOwner: returns list of stores filtered by ownerId', async () => {
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'store_mine_1',
            data: () => ({
              ...validStoreInput,
              ownerId: 'mock_owner_123',
            }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await getStoresByOwner('mock_owner_123');
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.length).toBe(1);
      expect(res.data![0].ownerId).toBe('mock_owner_123');
    });
  });
});
