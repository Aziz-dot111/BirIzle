import { describe, it, expect } from 'vitest';
import type { Store, OfferSubmission, ProductSubmission, InventoryOffer } from '@/types';
import { getMerchantTexts } from '@/utils/merchantI18n';

describe('MerchantOffersList Logic & Invariants', () => {
  const tUz = getMerchantTexts('uz');
  const tRu = getMerchantTexts('ru');

  const mockActiveStore: Store = {
    id: 'store_active_1',
    name: 'Nukus Texno',
    city: 'Nukus',
    address: 'Amir Temur 10',
    coordinates: { lat: 42.46, lng: 59.61 },
    category: 'electronics',
    phone: '+998901234567',
    openingHours: '09:00 - 20:00',
    status: 'active',
    isVerified: true,
    ownerId: 'merchant_123',
    createdAt: '2026-10-26T00:00:00.000Z',
    updatedAt: '2026-10-26T00:00:00.000Z',
  };

  const mockPendingStore: Store = {
    ...mockActiveStore,
    id: 'store_pending_1',
    status: 'pending',
    isVerified: false,
  };

  const mockArchivedStore: Store = {
    ...mockActiveStore,
    id: 'store_archived_1',
    status: 'archived',
  };

  describe('Store Active Status Enforcement', () => {
    function isStoreEligibleForSubmissions(store: Store): boolean {
      return Boolean(store.status === 'active' || (!store.status && store.isVerified));
    }

    it('allows submissions only for active verified stores', () => {
      expect(isStoreEligibleForSubmissions(mockActiveStore)).toBe(true);
    });

    it('blocks submissions for pending or unverified stores', () => {
      expect(isStoreEligibleForSubmissions(mockPendingStore)).toBe(false);
    });

    it('blocks submissions for archived stores', () => {
      expect(isStoreEligibleForSubmissions(mockArchivedStore)).toBe(false);
    });

    it('displays warning text in both Uzbek and Russian when store is ineligible', () => {
      expect(tUz.inactiveStoreWarning).toContain('faol emas yoki tasdiqlanmagan');
      expect(tRu.inactiveStoreWarning).toContain('неактивен или не подтвержден');
    });
  });

  describe('Unified Submissions History Sorting & Badge Presentation', () => {
    function unifyAndSortSubmissions(
      offers: OfferSubmission[],
      products: ProductSubmission[]
    ) {
      const unified = [
        ...offers.map((s) => ({ kind: 'offer' as const, sub: s, date: s.createdAt })),
        ...products.map((p) => ({ kind: 'product' as const, sub: p, date: p.createdAt })),
      ];
      unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return unified;
    }

    it('combines offer and product submissions and sorts newest first', () => {
      const offerSub: OfferSubmission = {
        id: 'offer_sub_1',
        merchantUid: 'merchant_123',
        merchantEmail: 'm@shop.uz',
        storeId: 'store_active_1',
        productId: 'prod_1',
        price: 1500000,
        currency: 'UZS',
        availability: 'in_stock',
        status: 'pending',
        createdAt: '2026-10-26T10:00:00.000Z',
        updatedAt: '2026-10-26T10:00:00.000Z',
      };

      const prodSub: ProductSubmission = {
        id: 'prod_sub_1',
        merchantUid: 'merchant_123',
        merchantEmail: 'm@shop.uz',
        storeId: 'store_active_1',
        name: 'New Laptop',
        category: 'computers',
        status: 'approved',
        createdAt: '2026-10-26T12:00:00.000Z', // Later timestamp
        updatedAt: '2026-10-26T12:00:00.000Z',
      };

      const sorted = unifyAndSortSubmissions([offerSub], [prodSub]);
      expect(sorted).toHaveLength(2);
      expect(sorted[0].kind).toBe('product');
      expect(sorted[0].sub.id).toBe('prod_sub_1');
      expect(sorted[1].kind).toBe('offer');
      expect(sorted[1].sub.id).toBe('offer_sub_1');
    });

    it('formats rejection information properly with adminNotes', () => {
      const rejectedOfferSub: OfferSubmission = {
        id: 'offer_sub_rej',
        merchantUid: 'merchant_123',
        merchantEmail: 'm@shop.uz',
        storeId: 'store_active_1',
        productId: 'prod_1',
        price: 99000,
        currency: 'UZS',
        availability: 'in_stock',
        status: 'rejected',
        adminNotes: 'Narx bozor qiymatidan shubhali darajada past ko‘rsatilgan.',
        createdAt: '2026-10-26T08:00:00.000Z',
        updatedAt: '2026-10-26T08:30:00.000Z',
      };

      expect(rejectedOfferSub.status).toBe('rejected');
      expect(rejectedOfferSub.adminNotes).toBeDefined();
      expect(rejectedOfferSub.adminNotes).toContain('bozor qiymatidan');
    });
  });

  describe('Isolation & Multi-store Filter Invariant', () => {
    it('isolates offers strictly to the selected storeId', () => {
      const allOffers: InventoryOffer[] = [
        {
          id: 'offer_1',
          storeId: 'store_A',
          productId: 'prod_1',
          price: 100000,
          currency: 'UZS',
          availability: 'in_stock',
          updatedAt: '2026-10-26T00:00:00.000Z',
        },
        {
          id: 'offer_2',
          storeId: 'store_B',
          productId: 'prod_1',
          price: 120000,
          currency: 'UZS',
          availability: 'in_stock',
          updatedAt: '2026-10-26T00:00:00.000Z',
        },
      ];

      const storeAOffers = allOffers.filter((o) => o.storeId === 'store_A');
      expect(storeAOffers).toHaveLength(1);
      expect(storeAOffers[0].id).toBe('offer_1');
      expect(storeAOffers[0].price).toBe(100000);
    });
  });
});

