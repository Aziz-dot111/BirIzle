import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestoreModule from 'firebase/firestore';
import type {
  Firestore,
  CollectionReference,
  Query,
  DocumentData,
} from 'firebase/firestore';
import {
  findOfferForStoreProduct,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  createOfferSubmission,
  reviewOfferSubmission,
  getOfferSubmissions,
  getOffersForProduct,
  getOffersByStore,
  getStoreProductOffers,
  mapDocumentToOffer,
} from './catalog';
import { getCanonicalOfferId, getLegacyUnderscoreOfferId } from '@/utils/canonicalOffer';
import { matchStoresWithProductOffers } from '@/utils/productStoreMatcher';
import type {
  Store,
  InventoryOffer,
  ProductItem,
  CreateOfferInput,
  CreateOfferSubmissionInput,
  ReviewOfferSubmissionInput,
} from '@/types';

const mockCurrentUser: {
  uid: string;
  email: string;
  getIdTokenResult: ReturnType<typeof vi.fn>;
} = {
  uid: 'merchant_uid_1',
  email: 'merchant@oneshop.uz',
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
    doc: vi.fn((_db: Firestore, col: string | CollectionReference<DocumentData>, id?: string) => {
      const colPath = typeof col === 'string' ? col : (col as { path?: string })?.path || 'col';
      return { id: id || 'auto_doc_id', path: `${colPath}/${id || 'auto_doc_id'}` };
    }),
    query: vi.fn((col: Query<DocumentData>) => col),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    getDocs: vi.fn(async () => ({ docs: [], empty: true })),
    getDoc: vi.fn(),
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    deleteDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(() => '2026-10-30T12:00:00.000Z'),
  };
});

describe('Phase 3.7: Legacy Offer Compatibility Audit Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.uid = 'merchant_uid_1';
    mockCurrentUser.email = 'merchant@oneshop.uz';
    mockCurrentUser.getIdTokenResult.mockResolvedValue({ claims: {} });
  });

  describe('1. Legacy Offer Resolution (findOfferForStoreProduct)', () => {
    it('1.1. Finds offer stored with previous underscore format (offer_storeId_productId)', async () => {
      const storeId = 'store_nukus_10';
      const productId = 'prod_samsung_a24';
      const underscoreId = getLegacyUnderscoreOfferId(storeId, productId);

      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === underscoreId) {
          return {
            exists: () => true,
            id: underscoreId,
            data: () => ({
              storeId,
              productId,
              price: 2400000,
              currency: 'UZS',
              availability: 'in_stock',
              createdAt: '2026-09-01T10:00:00.000Z',
              updatedAt: '2026-09-01T10:00:00.000Z',
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const found = await findOfferForStoreProduct(storeId, productId);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(underscoreId);
      expect(found!.price).toBe(2400000);
      expect(found!.version).toBe(1); // Legacy missing version defaulted to 1
    });

    it('1.2. Finds offer stored with legacy random document ID via fallback query', async () => {
      const storeId = 'store_nukus_20';
      const productId = 'prod_xiaomi_note12';
      const legacyRandomId = 'Xkj891LkaP91';

      // Both canonical and underscore doc lookups return false
      vi.mocked(firestoreModule.getDoc).mockResolvedValue({
        exists: () => false,
        id: 'non_existent',
        data: () => ({}),
      } as unknown as firestoreModule.DocumentSnapshot);

      // Query lookup returns the legacy document with random ID
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: legacyRandomId,
            data: () => ({
              storeId,
              productId,
              price: 1950000,
              currency: 'UZS',
              availability: 'in_stock',
              createdAt: '2026-08-15T09:00:00.000Z',
              updatedAt: '2026-08-15T09:00:00.000Z',
            }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      const found = await findOfferForStoreProduct(storeId, productId);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(legacyRandomId);
      expect(found!.price).toBe(1950000);
      expect(found!.legacyId).toBe(legacyRandomId);
    });

    it('1.3. Finds new canonical format offer (offer|s:storeId|p:productId)', async () => {
      const storeId = 'store_modern_1';
      const productId = 'prod_iphone_15';
      const canonicalId = getCanonicalOfferId(storeId, productId);

      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === canonicalId) {
          return {
            exists: () => true,
            id: canonicalId,
            data: () => ({
              storeId,
              productId,
              price: 11500000,
              currency: 'UZS',
              availability: 'in_stock',
              version: 2,
              createdAt: '2026-10-10T10:00:00.000Z',
              updatedAt: '2026-10-10T10:00:00.000Z',
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const found = await findOfferForStoreProduct(storeId, productId);

      expect(found).not.toBeNull();
      expect(found!.id).toBe(canonicalId);
      expect(found!.price).toBe(11500000);
      expect(found!.version).toBe(2);
    });

    it('1.4. getOfferById fetches offer by ID and maps legacy fields properly', async () => {
      const offerId = 'legacy_doc_xyz';
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: offerId,
        data: () => ({
          storeId: 'store_1',
          productId: 'prod_1',
          price: 50000,
          currency: 'UZS',
          availability: 'in_stock',
          // version is absent
          createdAt: '2026-08-01T00:00:00.000Z',
          updatedAt: '2026-08-01T00:00:00.000Z',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await getOfferById(offerId);
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.id).toBe(offerId);
      expect(res.data!.version).toBe(1); // Migrated missing version
      expect(res.data!.legacyId).toBe(offerId);
    });

    it('1.5. mapDocumentToOffer correctly maps legacy schemas and preserves version when present', () => {
      const rawLegacy = {
        storeId: 'store_1',
        productId: 'prod_1',
        price: 1000,
        currency: 'UZS',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };
      const mappedLegacy = mapDocumentToOffer('old_random_id', rawLegacy);
      expect(mappedLegacy.version).toBe(1);
      expect(mappedLegacy.status).toBe('active');
      expect(mappedLegacy.legacyId).toBe('old_random_id');

      const rawWithVersion = {
        ...rawLegacy,
        version: 5,
        variantId: 'v-black',
        status: 'pending',
      };
      const mappedWithVersion = mapDocumentToOffer('offer|s:store_1|p:prod_1|v:v-black', rawWithVersion);
      expect(mappedWithVersion.version).toBe(5);
      expect(mappedWithVersion.variantId).toBe('v-black');
      expect(mappedWithVersion.status).toBe('pending');
      expect(mappedWithVersion.legacyId).toBeUndefined(); // Canonical doesn't set legacyId unless specified
    });
  });

  describe('2. In-Place Update and Duplicate Prevention (createOffer)', () => {
    it('2.1. When an offer already exists with legacy random ID, updates existing doc in place without creating a duplicate', async () => {
      const storeId = 'store_nukus_mine';
      const productId = 'prod_tv_artel_43';
      const legacyRandomId = 'artel_tv_legacy_99';
      const originalCreatedAt = '2026-07-20T12:00:00.000Z';

      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === storeId) {
          // Store ownership check
          return {
            exists: () => true,
            id: storeId,
            data: () => ({
              ownerId: 'merchant_uid_1',
              name: 'Texno Nukus',
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        // Canonical and underscore don't exist
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      // Query finds the legacy random ID offer
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: legacyRandomId,
            data: () => ({
              storeId,
              productId,
              ownerId: 'merchant_uid_1',
              price: 3100000,
              currency: 'UZS',
              availability: 'in_stock',
              createdAt: originalCreatedAt,
              updatedAt: '2026-07-20T12:00:00.000Z',
              // Note: version field is absent on legacy offer!
            }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      const input: CreateOfferInput = {
        storeId,
        productId,
        price: 3250000,
        availability: 'in_stock',
      };

      const result = await createOffer(input);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();

      // INVARIANT: ID must remain the existing legacy document ID (no duplicate created!)
      expect(result.data!.id).toBe(legacyRandomId);
      expect(result.data!.price).toBe(3250000);

      // INVARIANT: createdAt must be strictly preserved!
      expect(result.data!.createdAt).toBe(originalCreatedAt);

      // INVARIANT: version must be migrated from missing (implicit 1) to 2!
      expect(result.data!.version).toBe(2);

      // INVARIANT: updateDoc must be called, setDoc must NOT be called for a new doc!
      expect(firestoreModule.updateDoc).toHaveBeenCalled();
      expect(firestoreModule.setDoc).not.toHaveBeenCalled();
    });

    it('2.2. When no offer exists, creates a brand new document with the new canonical ID format', async () => {
      const storeId = 'store_nukus_new';
      const productId = 'prod_novelty_1';
      const expectedCanonicalId = getCanonicalOfferId(storeId, productId);

      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === storeId) {
          return {
            exists: () => true,
            id: storeId,
            data: () => ({
              ownerId: 'merchant_uid_1',
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: true,
        docs: [],
      } as unknown as firestoreModule.QuerySnapshot);

      const input: CreateOfferInput = {
        storeId,
        productId,
        price: 500000,
        currency: 'UZS',
        availability: 'in_stock',
      };

      const result = await createOffer(input);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe(expectedCanonicalId);
      expect(result.data!.version).toBe(1);
      expect(firestoreModule.setDoc).toHaveBeenCalled();
    });
  });

  describe('3. Offer Submissions & Version Tracking (createOfferSubmission)', () => {
    it('3.1. Correctly inherits version and links targetOfferId when offer already has version', async () => {
      const storeId = 'store_sub_1';
      const productId = 'prod_sub_1';
      const canonicalId = getCanonicalOfferId(storeId, productId);

      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === storeId) {
          return {
            exists: () => true,
            id: storeId,
            data: () => ({ ownerId: 'merchant_uid_1' }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        if (id === canonicalId) {
          return {
            exists: () => true,
            id: canonicalId,
            data: () => ({
              storeId,
              productId,
              price: 100000,
              version: 4,
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const input: CreateOfferSubmissionInput = {
        storeId,
        productId,
        price: 110000,
      };

      const res = await createOfferSubmission(input);

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.targetOfferId).toBe(canonicalId);
      expect(res.data!.version).toBe(4);
      expect(res.data!.status).toBe('pending');
      expect(firestoreModule.setDoc).toHaveBeenCalled();
    });

    it('3.2. Version migration: when legacy offer has NO version, createOfferSubmission defaults baseVersion to 1', async () => {
      const storeId = 'store_legacy_sub';
      const productId = 'prod_legacy_sub';
      const legacyUnderscoreId = getLegacyUnderscoreOfferId(storeId, productId);

      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === storeId) {
          return {
            exists: () => true,
            id: storeId,
            data: () => ({ ownerId: 'merchant_uid_1' }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        if (id === legacyUnderscoreId) {
          return {
            exists: () => true,
            id: legacyUnderscoreId,
            data: () => ({
              storeId,
              productId,
              price: 50000,
              // NO version field
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const input: CreateOfferSubmissionInput = {
        storeId,
        productId,
        price: 55000,
      };

      const res = await createOfferSubmission(input);

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.targetOfferId).toBe(legacyUnderscoreId);
      expect(res.data!.version).toBe(1); // Migrated missing version to 1
    });
  });

  describe('4. Moderation Review & createdAt Preservation (reviewOfferSubmission)', () => {
    beforeEach(() => {
      mockCurrentUser.getIdTokenResult.mockResolvedValue({ claims: { admin: true } });
    });

    it('4.1. Approving submission for legacy offer preserves original createdAt and increments version', async () => {
      const storeId = 'store_rv_1';
      const productId = 'prod_rv_1';
      const legacyRandomId = 'legacy_offer_abc99';
      const originalCreatedAt = '2026-05-10T14:30:00.000Z';

      const submissionId = 'sub_pending_1';

      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === submissionId) {
          return {
            exists: () => true,
            id: submissionId,
            data: () => ({
              merchantUid: 'merchant_uid_1',
              storeId,
              productId,
              targetOfferId: legacyRandomId,
              version: 1,
              price: 890000,
              currency: 'UZS',
              availability: 'in_stock',
              status: 'pending',
              createdAt: '2026-10-25T10:00:00.000Z',
              updatedAt: '2026-10-25T10:00:00.000Z',
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        if (id === legacyRandomId) {
          return {
            exists: () => true,
            id: legacyRandomId,
            data: () => ({
              storeId,
              productId,
              ownerId: 'merchant_uid_1',
              price: 850000,
              currency: 'UZS',
              availability: 'in_stock',
              createdAt: originalCreatedAt,
              updatedAt: '2026-05-10T14:30:00.000Z',
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const reviewInput: ReviewOfferSubmissionInput = {
        status: 'approved',
        adminNotes: 'Hujjatlar tasdiqlandi',
      };

      const res = await reviewOfferSubmission(submissionId, reviewInput);

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.status).toBe('approved');
      expect(res.data!.approvedOfferId).toBe(legacyRandomId);

      // Verify updateDoc was called with version: 2 and updatedAt: serverTimestamp()
      expect(firestoreModule.updateDoc).toHaveBeenCalled();
    });

    it('4.2. Successfully reviews old legacy pending submissions without targetOfferId or version', async () => {
      const storeId = 'store_old_sub';
      const productId = 'prod_old_sub';
      const legacyDocId = 'legacy_random_777';
      const submissionId = 'sub_old_legacy_10';

      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === submissionId) {
          // Old submission: targetOfferId and version are UNDEFINED
          return {
            exists: () => true,
            id: submissionId,
            data: () => ({
              merchantUid: 'merchant_uid_1',
              storeId,
              productId,
              price: 499000,
              currency: 'UZS',
              availability: 'in_stock',
              status: 'pending',
              createdAt: '2026-06-01T10:00:00.000Z',
              updatedAt: '2026-06-01T10:00:00.000Z',
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      // Query finds the existing legacy offer
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: legacyDocId,
            data: () => ({
              storeId,
              productId,
              ownerId: 'merchant_uid_1',
              price: 480000,
              currency: 'UZS',
              availability: 'in_stock',
              createdAt: '2026-04-01T00:00:00.000Z',
              updatedAt: '2026-04-01T00:00:00.000Z',
            }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await reviewOfferSubmission(submissionId, { status: 'approved' });

      expect(res.error).toBeNull();
      expect(res.data!.status).toBe('approved');
      expect(res.data!.approvedOfferId).toBe(legacyDocId);
    });

    it('4.3. Rejecting an offer submission does NOT modify the live offer document', async () => {
      const submissionId = 'sub_to_reject';

      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === submissionId) {
          return {
            exists: () => true,
            id: submissionId,
            data: () => ({
              merchantUid: 'merchant_uid_1',
              storeId: 'store_1',
              productId: 'prod_1',
              price: 9999999,
              status: 'pending',
              createdAt: '2026-10-25T10:00:00.000Z',
              updatedAt: '2026-10-25T10:00:00.000Z',
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const res = await reviewOfferSubmission(submissionId, {
        status: 'rejected',
        adminNotes: 'Narx asossiz yuqori',
      });

      expect(res.error).toBeNull();
      expect(res.data!.status).toBe('rejected');
      expect(res.data!.adminNotes).toBe('Narx asossiz yuqori');
      // updateDoc should be called only for the submission document, not for any offer
      expect(firestoreModule.updateDoc).toHaveBeenCalledTimes(1);
    });
  });

  describe('5. Read Operations & Cross-Surface Consistency (getOffersForProduct, getOffersByStore)', () => {
    it('5.1. getOffersForProduct returns deduplicated offers when both legacy and canonical docs exist in Firestore', async () => {
      const productId = 'prod_shared_100';

      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'legacy_random_offer_1',
            data: () => ({
              storeId: 'store_1',
              productId,
              price: 1500000,
              currency: 'UZS',
              availability: 'in_stock',
              version: 1,
              createdAt: '2026-09-01T00:00:00.000Z',
              updatedAt: '2026-09-01T00:00:00.000Z',
            }),
          },
          {
            id: 'offer|s:store_1|p:prod_shared_100',
            data: () => ({
              storeId: 'store_1',
              productId,
              price: 1450000,
              currency: 'UZS',
              availability: 'in_stock',
              version: 2,
              createdAt: '2026-10-15T00:00:00.000Z',
              updatedAt: '2026-10-15T00:00:00.000Z',
            }),
          },
          {
            id: 'offer|s:store_2|p:prod_shared_100',
            data: () => ({
              storeId: 'store_2',
              productId,
              price: 1600000,
              currency: 'UZS',
              availability: 'in_stock',
              version: 1,
              createdAt: '2026-10-15T00:00:00.000Z',
              updatedAt: '2026-10-15T00:00:00.000Z',
            }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await getOffersForProduct(productId);

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      // Store 1 legacy + canonical was deduplicated into 1 offer! Plus Store 2 = 2 offers total.
      expect(res.data!.length).toBe(2);

      const store1Offer = res.data!.find((o) => o.storeId === 'store_1');
      expect(store1Offer).toBeDefined();
      expect(store1Offer!.id).toBe('offer|s:store_1|p:prod_shared_100');
      expect(store1Offer!.price).toBe(1450000);
      expect(store1Offer!.createdAt).toBe('2026-09-01T00:00:00.000Z'); // Preserved original createdAt
    });

    it('5.2. Preserves distinct variants separately in getOffersForProduct', async () => {
      const productId = 'prod_phone_variants';

      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'offer|s:store_1|p:prod_phone_variants',
            data: () => ({
              storeId: 'store_1',
              productId,
              price: 3000000,
              currency: 'UZS',
              availability: 'in_stock',
            }),
          },
          {
            id: 'offer|s:store_1|p:prod_phone_variants|v:256gb',
            data: () => ({
              storeId: 'store_1',
              productId,
              variantId: '256gb',
              price: 3500000,
              currency: 'UZS',
              availability: 'in_stock',
            }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await getOffersForProduct(productId);
      expect(res.error).toBeNull();
      expect(res.data!.length).toBe(2);
      expect(res.data![0].price).toBe(3000000);
      expect(res.data![1].price).toBe(3500000);
    });

    it('5.3. getOffersByStore returns deduplicated offers for merchant dashboard', async () => {
      const storeId = 'store_merchant_1';

      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'legacy_random_offer_x',
            data: () => ({
              storeId,
              productId: 'prod_1',
              price: 200000,
              currency: 'UZS',
              availability: 'in_stock',
              version: 1,
              updatedAt: '2026-10-01T00:00:00.000Z',
            }),
          },
          {
            id: 'offer|s:store_merchant_1|p:prod_1',
            data: () => ({
              storeId,
              productId: 'prod_1',
              price: 190000,
              currency: 'UZS',
              availability: 'in_stock',
              version: 2,
              updatedAt: '2026-10-20T00:00:00.000Z',
            }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await getOffersByStore(storeId);
      expect(res.error).toBeNull();
      expect(res.data!.length).toBe(1);
      expect(res.data![0].price).toBe(190000);
    });
  });

  describe('6. Merchant Submissions Lifecycle & Moderation Review', () => {
    it('6.1. createOfferSubmission: allows merchant to submit offer for their own store', async () => {
      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === 'store_mine') {
          return { exists: () => true, id, data: () => ({ ownerId: 'merchant_uid_1' }) } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const res = await createOfferSubmission({
        storeId: 'store_mine',
        productId: 'prod_1',
        price: 250000,
      });

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.status).toBe('pending');
      expect(res.data!.price).toBe(250000);
    });

    it('6.2. createOfferSubmission: rejects submission when merchant does not own the store', async () => {
      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === 'store_other') {
          return { exists: () => true, id, data: () => ({ ownerId: 'stranger_99' }) } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const res = await createOfferSubmission({
        storeId: 'store_other',
        productId: 'prod_1',
        price: 250000,
      });

      expect(res.data).toBeNull();
      expect(res.error).toContain('tegishli');
    });

    it('6.3. createOfferSubmission: rejects submission with negative price', async () => {
      const res = await createOfferSubmission({
        storeId: 'store_1',
        productId: 'prod_1',
        price: -5000,
      });
      expect(res.data).toBeNull();
      expect(res.error).toBeTruthy();
    });

    it('6.4. createOfferSubmission: sets currency to UZS when not specified', async () => {
      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === 'store_mine') {
          return { exists: () => true, id, data: () => ({ ownerId: 'merchant_uid_1' }) } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const res = await createOfferSubmission({
        storeId: 'store_mine',
        productId: 'prod_1',
        price: 150000,
      });
      expect(res.error).toBeNull();
      expect(res.data!.currency).toBe('UZS');
    });

    it('6.5. createOfferSubmission: sets availability to in_stock by default', async () => {
      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === 'store_mine') {
          return { exists: () => true, id, data: () => ({ ownerId: 'merchant_uid_1' }) } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const res = await createOfferSubmission({
        storeId: 'store_mine',
        productId: 'prod_1',
        price: 150000,
      });
      expect(res.error).toBeNull();
      expect(res.data!.availability).toBe('in_stock');
    });

    it('6.6. createOfferSubmission: stores deliveryAvailable and warrantyMonths when provided', async () => {
      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === 'store_mine') {
          return { exists: () => true, id, data: () => ({ ownerId: 'merchant_uid_1' }) } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const res = await createOfferSubmission({
        storeId: 'store_mine',
        productId: 'prod_1',
        price: 150000,
        warrantyMonths: 12,
        deliveryAvailable: true,
      });
      expect(res.error).toBeNull();
      expect(res.data!.warrantyMonths).toBe(12);
      expect(res.data!.deliveryAvailable).toBe(true);
    });

    it('6.7. createOfferSubmission: stores merchant notes when provided', async () => {
      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === 'store_mine') {
          return { exists: () => true, id, data: () => ({ ownerId: 'merchant_uid_1' }) } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const res = await createOfferSubmission({
        storeId: 'store_mine',
        productId: 'prod_1',
        price: 150000,
        notes: 'Chegirma mavjud',
      });
      expect(res.error).toBeNull();
      expect(res.data!.notes).toBe('Chegirma mavjud');
    });

    it('6.8. createOfferSubmission: records merchantUid and merchantEmail accurately', async () => {
      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === 'store_mine') {
          return { exists: () => true, id, data: () => ({ ownerId: 'merchant_uid_1' }) } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const res = await createOfferSubmission({
        storeId: 'store_mine',
        productId: 'prod_1',
        price: 150000,
      });
      expect(res.error).toBeNull();
      expect(res.data!.merchantUid).toBe('merchant_uid_1');
      expect(res.data!.merchantEmail).toBe('merchant@oneshop.uz');
    });

    it('6.9. reviewOfferSubmission: rejects moderation decision when caller is not admin', async () => {
      mockCurrentUser.getIdTokenResult.mockResolvedValueOnce({ claims: {} }); // no admin claim

      const res = await reviewOfferSubmission('sub_1', { status: 'approved' });
      expect(res.data).toBeNull();
      expect(res.error).toContain('administrator');
    });

    it('6.10. reviewOfferSubmission: marks submission as rejected with adminNotes', async () => {
      mockCurrentUser.getIdTokenResult.mockResolvedValue({ claims: { admin: true } });

      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === 'sub_rej_test') {
          return {
            exists: () => true,
            id,
            data: () => ({
              merchantUid: 'm1',
              storeId: 's1',
              productId: 'p1',
              price: 100,
              status: 'pending',
              createdAt: '2026-10-01T00:00:00Z',
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const res = await reviewOfferSubmission('sub_rej_test', {
        status: 'rejected',
        adminNotes: 'Do‘kon tekshiruvdan o‘tmagan',
      });
      expect(res.error).toBeNull();
      expect(res.data!.status).toBe('rejected');
      expect(res.data!.adminNotes).toBe('Do‘kon tekshiruvdan o‘tmagan');
    });

    it('6.11. reviewOfferSubmission: rejects when invalid status is provided', async () => {
      mockCurrentUser.getIdTokenResult.mockResolvedValue({ claims: { admin: true } });

      const res = await reviewOfferSubmission('sub_1', { status: 'pending' as unknown as 'approved' });
      expect(res.data).toBeNull();
      expect(res.error).toBeTruthy();
    });

    it('6.12. reviewOfferSubmission: returns error when target submission does not exist', async () => {
      mockCurrentUser.getIdTokenResult.mockResolvedValue({ claims: { admin: true } });
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({ exists: () => false, id: 'missing' } as unknown as firestoreModule.DocumentSnapshot);

      const res = await reviewOfferSubmission('missing', { status: 'approved' });
      expect(res.data).toBeNull();
      expect(res.error).toContain('topilmadi');
    });

    it('6.13. reviewOfferSubmission: approving a new offer submission creates canonical ID and sets approvedOfferId', async () => {
      mockCurrentUser.getIdTokenResult.mockResolvedValue({ claims: { admin: true } });

      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === 'sub_brand_new') {
          return {
            exists: () => true,
            id,
            data: () => ({
              merchantUid: 'm1',
              storeId: 'store_new_xyz',
              productId: 'prod_new_xyz',
              price: 330000,
              status: 'pending',
              createdAt: '2026-10-01T00:00:00Z',
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({ empty: true, docs: [] } as unknown as firestoreModule.QuerySnapshot);

      const res = await reviewOfferSubmission('sub_brand_new', { status: 'approved' });
      expect(res.error).toBeNull();
      expect(res.data!.status).toBe('approved');
      expect(res.data!.approvedOfferId).toBe(getCanonicalOfferId('store_new_xyz', 'prod_new_xyz'));
      expect(firestoreModule.setDoc).toHaveBeenCalled();
    });

    it('6.14. reviewOfferSubmission: approving an existing offer submission performs in-place update and preserves createdAt', async () => {
      mockCurrentUser.getIdTokenResult.mockResolvedValue({ claims: { admin: true } });

      const origCreated = '2026-03-15T00:00:00Z';
      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === 'sub_exist_app') {
          return {
            exists: () => true,
            id,
            data: () => ({
              merchantUid: 'm1',
              storeId: 's1',
              productId: 'p1',
              targetOfferId: 'legacy_doc_exist',
              price: 450000,
              status: 'pending',
              createdAt: '2026-10-01T00:00:00Z',
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        if (id === 'legacy_doc_exist') {
          return {
            exists: () => true,
            id,
            data: () => ({
              storeId: 's1',
              productId: 'p1',
              price: 400000,
              createdAt: origCreated,
              version: 2,
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      const res = await reviewOfferSubmission('sub_exist_app', { status: 'approved' });
      expect(res.error).toBeNull();
      expect(res.data!.status).toBe('approved');
      expect(res.data!.approvedOfferId).toBe('legacy_doc_exist');
      expect(firestoreModule.updateDoc).toHaveBeenCalled();
    });

    it('6.15. getOfferSubmissions: filters offer submissions by storeId and status', async () => {
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'sub_1',
            data: () => ({
              merchantUid: 'm1',
              storeId: 's1',
              productId: 'p1',
              price: 50000,
              status: 'pending',
              createdAt: '2026-10-01T00:00:00Z',
              updatedAt: '2026-10-01T00:00:00Z',
            }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await getOfferSubmissions({ storeId: 's1', status: 'pending' });
      expect(res.error).toBeNull();
      expect(res.data).toHaveLength(1);
      expect(res.data![0].storeId).toBe('s1');
      expect(res.data![0].status).toBe('pending');
    });
  });

  describe('7. Negative Matching & Strict Isolation in findOfferForStoreProduct', () => {
    it('7.1. Does NOT match canonical offer if storeId differs', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'offer|s:store_wrong|p:prod_1',
        data: () => ({ storeId: 'store_wrong', productId: 'prod_1' }),
      } as unknown as firestoreModule.DocumentSnapshot);
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({ empty: true, docs: [] } as unknown as firestoreModule.QuerySnapshot);

      const found = await findOfferForStoreProduct('store_correct', 'prod_1');
      expect(found).toBeNull();
    });

    it('7.2. Does NOT match canonical offer if productId differs', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'offer|s:store_1|p:prod_wrong',
        data: () => ({ storeId: 'store_1', productId: 'prod_wrong' }),
      } as unknown as firestoreModule.DocumentSnapshot);
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({ empty: true, docs: [] } as unknown as firestoreModule.QuerySnapshot);

      const found = await findOfferForStoreProduct('store_1', 'prod_correct');
      expect(found).toBeNull();
    });

    it('7.3. Does NOT match canonical offer if variantId differs', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'offer|s:store_1|p:prod_1|v:128gb',
        data: () => ({ storeId: 'store_1', productId: 'prod_1', variantId: '128gb' }),
      } as unknown as firestoreModule.DocumentSnapshot);
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({ empty: true, docs: [] } as unknown as firestoreModule.QuerySnapshot);

      const found = await findOfferForStoreProduct('store_1', 'prod_1', '256gb');
      expect(found).toBeNull();
    });

    it('7.4. Does NOT match legacy underscore offer if variantId differs', async () => {
      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id.startsWith('offer_')) {
          return {
            exists: () => true,
            id: 'offer_s1_p1_red',
            data: () => ({ storeId: 's1', productId: 'p1', variantId: 'red' }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id } as unknown as firestoreModule.DocumentSnapshot;
      });
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({ empty: true, docs: [] } as unknown as firestoreModule.QuerySnapshot);

      const found = await findOfferForStoreProduct('s1', 'p1', 'blue');
      expect(found).toBeNull();
    });

    it('7.5. Does NOT match legacy underscore offer if storeId is prefix of requested storeId', async () => {
      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === 'offer_store_1_prod_1') {
          return {
            exists: () => true,
            id: 'offer_store_1_prod_1',
            data: () => ({ storeId: 'store_1', productId: 'prod_1' }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id } as unknown as firestoreModule.DocumentSnapshot;
      });
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({ empty: true, docs: [] } as unknown as firestoreModule.QuerySnapshot);

      // We ask for store_10, underscore has store_1
      const found = await findOfferForStoreProduct('store_10', 'prod_1');
      expect(found).toBeNull();
    });

    it('7.6. Does NOT match legacy random ID offer if variantId differs', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValue({ exists: () => false } as unknown as firestoreModule.DocumentSnapshot);
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'legacy_random_v1',
            data: () => ({ storeId: 's1', productId: 'p1', variantId: '64gb', price: 100 }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      // Asking for 128gb, doc has 64gb
      const found = await findOfferForStoreProduct('s1', 'p1', '128gb');
      expect(found).toBeNull();
    });

    it('7.7. Returns null when storeId is empty or whitespace', async () => {
      const found = await findOfferForStoreProduct('   ', 'prod_1');
      expect(found).toBeNull();
    });

    it('7.8. Returns null when productId is empty or whitespace', async () => {
      const found = await findOfferForStoreProduct('store_1', '   ');
      expect(found).toBeNull();
    });

    it('7.9. Returns null when database returns empty query snapshot', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValue({ exists: () => false } as unknown as firestoreModule.DocumentSnapshot);
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({ empty: true, docs: [] } as unknown as firestoreModule.QuerySnapshot);

      const found = await findOfferForStoreProduct('store_none', 'prod_none');
      expect(found).toBeNull();
    });

    it('7.10. Returns null gracefully when database throws network error', async () => {
      vi.mocked(firestoreModule.getDoc).mockRejectedValueOnce(new Error('Network offline'));

      const found = await findOfferForStoreProduct('store_1', 'prod_1');
      expect(found).toBeNull();
    });
  });

  describe('8. productStoreMatcher & Cross-Surface Consistency', () => {
    const mockStores: Store[] = [
      {
        id: 'store_near',
        name: 'Yaqin Do‘kon',
        city: 'Nukus',
        address: 'Ko‘cha 1',
        coordinates: { lat: 42.4619, lng: 59.6166 },
        category: 'electronics',
        phone: '+998612221111',
        openingHours: '09:00 - 20:00',
        ownershipStatus: 'unclaimed',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'store_far',
        name: 'Uzoq Do‘kon',
        city: 'Nukus',
        address: 'Ko‘cha 2',
        coordinates: { lat: 42.5000, lng: 59.7000 },
        category: 'electronics',
        phone: '+998612222222',
        openingHours: '09:00 - 20:00',
        ownershipStatus: 'unclaimed',
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      },
    ];

    const mockProduct: ProductItem = {
      id: 'prod_target',
      name: 'Samsung Galaxy A24',
      normalizedName: 'samsung galaxy a24',
      searchKeywords: ['samsung', 'galaxy', 'a24'],
      category: 'phones',
      createdAt: '2026-10-01T00:00:00Z',
      updatedAt: '2026-10-01T00:00:00Z',
    };

    it('8.1. matchStoresWithProductOffers: flags isCheapest when lowest price is a legacy random ID offer', () => {
      const offers: InventoryOffer[] = [
        { id: 'legacy_random_cheap', storeId: 'store_far', productId: 'prod_target', price: 2100000, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' },
        { id: 'offer|s:store_near|p:prod_target', storeId: 'store_near', productId: 'prod_target', price: 2500000, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' },
      ];

      const matched = matchStoresWithProductOffers(mockStores, offers, mockProduct);
      expect(matched).toHaveLength(2);

      const farStore = matched.find((s) => s.id === 'store_far');
      expect(farStore?.isCheapest).toBe(true);
      expect(farStore?.matchedOffer?.price).toBe(2100000);
    });

    it('8.2. matchStoresWithProductOffers: flags isClosest when nearest store has a legacy underscore offer', () => {
      const userCoords = { lat: 42.4620, lng: 59.6167 }; // Very close to store_near
      const offers: InventoryOffer[] = [
        { id: 'offer_store_near_prod_target', storeId: 'store_near', productId: 'prod_target', price: 2500000, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' },
        { id: 'offer_store_far_prod_target', storeId: 'store_far', productId: 'prod_target', price: 2500000, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' },
      ];

      const matched = matchStoresWithProductOffers(mockStores, offers, mockProduct, { userCoords });
      const nearStore = matched.find((s) => s.id === 'store_near');
      expect(nearStore?.isClosest).toBe(true);
    });

    it('8.3. matchStoresWithProductOffers: picks lower price if store has multiple legacy offers for same product', () => {
      const offers: InventoryOffer[] = [
        { id: 'legacy_1', storeId: 'store_near', productId: 'prod_target', price: 3000000, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' },
        { id: 'legacy_2', storeId: 'store_near', productId: 'prod_target', price: 2700000, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-02T00:00:00Z' },
      ];

      const matched = matchStoresWithProductOffers(mockStores, offers, mockProduct);
      const nearStore = matched.find((s) => s.id === 'store_near');
      expect(nearStore?.matchedOffer?.price).toBe(2700000);
    });

    it('8.4. matchStoresWithProductOffers: ignores offers with price <= 0 for cheapest calculation', () => {
      const offers: InventoryOffer[] = [
        { id: 'o_zero', storeId: 'store_far', productId: 'prod_target', price: 0, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' },
        { id: 'o_valid', storeId: 'store_near', productId: 'prod_target', price: 1000000, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' },
      ];

      const matched = matchStoresWithProductOffers(mockStores, offers, mockProduct);
      const nearStore = matched.find((s) => s.id === 'store_near');
      expect(nearStore?.isCheapest).toBe(true);
    });

    it('8.5. matchStoresWithProductOffers: filters only in-stock when onlyInStock is true', () => {
      const offers: InventoryOffer[] = [
        { id: 'o_out', storeId: 'store_near', productId: 'prod_target', price: 1000, currency: 'UZS', availability: 'out_of_stock', inStock: false, updatedAt: '2026-10-01T00:00:00Z' },
      ];

      const matched = matchStoresWithProductOffers(mockStores, offers, mockProduct, { onlyInStock: true });
      expect(matched).toHaveLength(0);
    });

    it('8.6. matchStoresWithProductOffers: calculates accurate distanceKm for verified store coordinates', () => {
      const userCoords = { lat: 42.4619, lng: 59.6166 };
      const offers: InventoryOffer[] = [
        { id: 'o_1', storeId: 'store_near', productId: 'prod_target', price: 1000, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' },
      ];

      const matched = matchStoresWithProductOffers(mockStores, offers, mockProduct, { userCoords });
      expect(matched[0].distanceKm).toBeDefined();
      expect(matched[0].distanceKm).toBeCloseTo(0, 1);
    });

    it('8.7. matchStoresWithProductOffers: excludes stores that have no offer for target product', () => {
      const offers: InventoryOffer[] = [
        { id: 'o_1', storeId: 'store_near', productId: 'prod_other', price: 1000, currency: 'UZS', availability: 'in_stock', updatedAt: '2026-10-01T00:00:00Z' },
      ];

      const matched = matchStoresWithProductOffers(mockStores, offers, mockProduct);
      expect(matched).toHaveLength(0);
    });

    it('8.8. matchStoresWithProductOffers: returns empty array when no stores or no offers provided', () => {
      expect(matchStoresWithProductOffers([], [])).toEqual([]);
      expect(matchStoresWithProductOffers(mockStores, [])).toEqual([]);
    });

    it('8.9. getStoreProductOffers: joins offers with store data in ascending price order', async () => {
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            id: 'leg_o2',
            data: () => ({ storeId: 'store_far', productId: 'prod_t', price: 200, currency: 'UZS', availability: 'in_stock' }),
          },
          {
            id: 'leg_o1',
            data: () => ({ storeId: 'store_near', productId: 'prod_t', price: 100, currency: 'UZS', availability: 'in_stock' }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        return {
          exists: () => true,
          id,
          data: () => ({ name: `Do‘kon ${id}`, city: 'Nukus', address: 'Ko‘cha' }),
        } as unknown as firestoreModule.DocumentSnapshot;
      });

      const res = await getStoreProductOffers('prod_t');
      expect(res.error).toBeNull();
      expect(res.data).toHaveLength(2);
      expect(res.data![0].price).toBe(100);
      expect(res.data![1].price).toBe(200);
    });

    it('8.10. getStoreProductOffers: returns empty array when product has no offers', async () => {
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({ empty: true, docs: [] } as unknown as firestoreModule.QuerySnapshot);

      const res = await getStoreProductOffers('prod_empty');
      expect(res.error).toBeNull();
      expect(res.data).toEqual([]);
    });
  });

  describe('9. Concurrency, Versioning, and Integrity Invariants', () => {
    it('9.1. Multiple sequential updates to legacy offer monotonically increment version (1 -> 2 -> 3)', async () => {
      const storeId = 'store_seq_1';
      const productId = 'prod_seq_1';
      const legacyId = 'legacy_offer_seq';

      let currentVersion = 1;
      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === storeId) {
          return { exists: () => true, id, data: () => ({ ownerId: 'merchant_uid_1' }) } as unknown as firestoreModule.DocumentSnapshot;
        }
        if (id === legacyId) {
          return {
            exists: () => true,
            id,
            data: () => ({
              storeId,
              productId,
              ownerId: 'merchant_uid_1',
              price: 1000,
              version: currentVersion,
              createdAt: '2026-01-01T00:00:00Z',
            }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      // Update 1: version 1 -> 2
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [{ id: legacyId, data: () => ({ storeId, productId, version: 1, ownerId: 'merchant_uid_1' }) }],
      } as unknown as firestoreModule.QuerySnapshot);

      const r1 = await createOffer({ storeId, productId, price: 1100 });
      expect(r1.data!.version).toBe(2);

      // Update 2: version 2 -> 3
      currentVersion = 2;
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [{ id: legacyId, data: () => ({ storeId, productId, version: 2, ownerId: 'merchant_uid_1' }) }],
      } as unknown as firestoreModule.QuerySnapshot);

      const r2 = await createOffer({ storeId, productId, price: 1200 });
      expect(r2.data!.version).toBe(3);
    });

    it('9.2. Consecutive createOffer calls with same store and product update the same document without split pricing', async () => {
      const storeId = 'store_dup_test';
      const productId = 'prod_dup_test';
      const canonicalId = getCanonicalOfferId(storeId, productId);

      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === storeId) {
          return { exists: () => true, id, data: () => ({ ownerId: 'merchant_uid_1' }) } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({ empty: true, docs: [] } as unknown as firestoreModule.QuerySnapshot);

      // Call 1: Creates new offer
      const firstRes = await createOffer({ storeId, productId, price: 100000 });
      expect(firstRes.data!.id).toBe(canonicalId);
      expect(firstRes.data!.version).toBe(1);

      // Mock finding this canonical offer on Call 2
      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        if (id === storeId) {
          return { exists: () => true, id, data: () => ({ ownerId: 'merchant_uid_1' }) } as unknown as firestoreModule.DocumentSnapshot;
        }
        if (id === canonicalId) {
          return {
            exists: () => true,
            id: canonicalId,
            data: () => ({ storeId, productId, ownerId: 'merchant_uid_1', price: 100000, version: 1 }),
          } as unknown as firestoreModule.DocumentSnapshot;
        }
        return { exists: () => false, id, data: () => ({}) } as unknown as firestoreModule.DocumentSnapshot;
      });

      // Call 2: Updates existing offer
      const secondRes = await createOffer({ storeId, productId, price: 105000 });
      expect(secondRes.data!.id).toBe(canonicalId);
      expect(secondRes.data!.version).toBe(2);
      expect(secondRes.data!.price).toBe(105000);
    });

    it('9.3. updateOffer: rejects when caller is not the owner and not admin', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'offer_foreign',
        data: () => ({ ownerId: 'other_user_uid', price: 50000 }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await updateOffer('offer_foreign', { price: 60000 });
      expect(res.data).toBeNull();
      expect(res.error).toContain('ruxsat');
    });

    it('9.4. updateOffer: succeeds when caller is admin even if not original owner', async () => {
      mockCurrentUser.getIdTokenResult.mockResolvedValue({ claims: { admin: true } });

      vi.mocked(firestoreModule.getDoc).mockImplementation(async (docRef) => {
        const id = (docRef as unknown as { id: string }).id;
        return {
          exists: () => true,
          id,
          data: () => ({ ownerId: 'other_user_uid', storeId: 's1', productId: 'p1', price: 50000 }),
        } as unknown as firestoreModule.DocumentSnapshot;
      });

      const res = await updateOffer('offer_foreign', { price: 45000 });
      expect(res.error).toBeNull();
      expect(firestoreModule.updateDoc).toHaveBeenCalled();
    });

    it('9.5. deleteOffer: deletes legacy offer document cleanly when caller is owner', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'legacy_offer_to_delete',
        data: () => ({ ownerId: 'merchant_uid_1' }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await deleteOffer('legacy_offer_to_delete');
      expect(res.error).toBeNull();
      expect(firestoreModule.deleteDoc).toHaveBeenCalled();
    });
  });
});
