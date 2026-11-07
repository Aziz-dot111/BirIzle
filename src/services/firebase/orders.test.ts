import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestoreModule from 'firebase/firestore';
import type {
  Firestore,
  CollectionReference,
  Query,
  DocumentData,
} from 'firebase/firestore';
import {
  createOrder,
  getCustomerOrders,
  getStoreOrders,
  getOrderById,
  updateOrderStatus,
  mapDocumentToOrder,
} from './orders';
import type { CreateOrderInput } from '@/types/order';

const mockCurrentUser: {
  uid: string;
  email: string;
  emailVerified: boolean;
  getIdTokenResult: ReturnType<typeof vi.fn>;
} = {
  uid: 'customer_uid_1',
  email: 'customer@oneshop.uz',
  emailVerified: true,
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
    doc: vi.fn((_db: Firestore, _col: string | CollectionReference<DocumentData>, id?: string) => ({
      id: id || 'auto_order_id',
    })),
    query: vi.fn((col: Query<DocumentData>) => col),
    where: vi.fn(),
    limit: vi.fn(),
    getDocs: vi.fn(async () => ({ docs: [], empty: true })),
    getDoc: vi.fn(),
    setDoc: vi.fn().mockResolvedValue(undefined),
    updateDoc: vi.fn().mockResolvedValue(undefined),
    serverTimestamp: vi.fn(() => '2026-11-06T12:00:00.000Z'),
  };
});

describe('Firestore Orders Service Layer', () => {
  const validStoreDoc = {
    exists: () => true,
    id: 'store_1',
    data: () => ({
      name: 'Media Park Nukus',
      city: 'Nukus',
      address: 'A. Dosnazarov 45',
      ownerId: 'merchant_owner_99',
      ownershipStatus: 'verified',
      status: 'active',
      isVerified: true,
      isDemo: false,
      sourceType: 'birqidir',
    }),
  };

  const validOfferDoc = {
    exists: () => true,
    id: 'offer_1',
    data: () => ({
      storeId: 'store_1',
      productId: 'prod_1',
      price: 3200000,
      currency: 'UZS',
      availability: 'in_stock',
      status: 'active',
      isSuperseded: false,
    }),
  };

  const validProductDoc = {
    exists: () => true,
    id: 'prod_1',
    data: () => ({
      name: 'Samsung Galaxy A55',
      category: 'phones',
    }),
  };

  const validOrderInput: CreateOrderInput = {
    storeId: 'store_1',
    productId: 'prod_1',
    offerId: 'offer_1',
    quantity: 2,
    customerName: 'Jalgas Orazov',
    customerPhone: '+998901234567',
    customerNote: 'Tezroq yetkazib bering',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser.uid = 'customer_uid_1';
    mockCurrentUser.email = 'customer@oneshop.uz';
    mockCurrentUser.emailVerified = true;
    mockCurrentUser.getIdTokenResult.mockResolvedValue({ claims: {} });
  });

  describe('createOrder - Security & Snapshot Invariants', () => {
    it('fails when user email is not verified', async () => {
      mockCurrentUser.emailVerified = false;

      const res = await createOrder(validOrderInput);
      expect(res.data).toBeNull();
      expect(res.error).toContain('elektron pochtangiz tasdiqlangan bo‘lishi shart');
    });

    it('fails when store does not exist', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => false,
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await createOrder(validOrderInput);
      expect(res.data).toBeNull();
      expect(res.error).toContain('do‘kon topilmadi');
    });

    it('fails when store is pending or archived or inactive', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'store_1',
        data: () => ({
          status: 'pending',
          isVerified: false,
          ownerId: 'merchant_1',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await createOrder(validOrderInput);
      expect(res.data).toBeNull();
      expect(res.error).toContain('faol emas');
    });

    it('fails when store is a demo store or OpenStreetMap navigation point', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'store_1',
        data: () => ({
          status: 'active',
          isDemo: true,
          ownerId: 'merchant_1',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await createOrder(validOrderInput);
      expect(res.data).toBeNull();
      expect(res.error).toContain('real sotuvchi emas');
    });

    it('fails when store is unclaimed or has no ownerId', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'store_1',
        data: () => ({
          status: 'active',
          isVerified: true,
          ownershipStatus: 'unclaimed',
          ownerId: null,
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await createOrder(validOrderInput);
      expect(res.data).toBeNull();
      expect(res.error).toContain('biriktirilgan faol sotuvchi topilmadi');
    });

    it('fails when offer does not exist', async () => {
      vi.mocked(firestoreModule.getDoc)
        .mockResolvedValueOnce(validStoreDoc as unknown as firestoreModule.DocumentSnapshot)
        .mockResolvedValueOnce({ exists: () => false } as unknown as firestoreModule.DocumentSnapshot);

      const res = await createOrder(validOrderInput);
      expect(res.data).toBeNull();
      expect(res.error).toContain('narx taklifi topilmadi');
    });

    it('fails when offer belongs to a different storeId or different productId', async () => {
      vi.mocked(firestoreModule.getDoc)
        .mockResolvedValueOnce(validStoreDoc as unknown as firestoreModule.DocumentSnapshot)
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'offer_1',
          data: () => ({
            storeId: 'store_DIFFERENT',
            productId: 'prod_1',
            price: 100000,
          }),
        } as unknown as firestoreModule.DocumentSnapshot);

      const res = await createOrder(validOrderInput);
      expect(res.data).toBeNull();
      expect(res.error).toContain('ushbu do‘konga tegishli emas');
    });

    it('fails when offer is not active for customer (e.g. superseded or price <= 0)', async () => {
      vi.mocked(firestoreModule.getDoc)
        .mockResolvedValueOnce(validStoreDoc as unknown as firestoreModule.DocumentSnapshot)
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'offer_1',
          data: () => ({
            storeId: 'store_1',
            productId: 'prod_1',
            price: 0, // Ineligible zero price
            status: 'active',
          }),
        } as unknown as firestoreModule.DocumentSnapshot);

      const res = await createOrder(validOrderInput);
      expect(res.data).toBeNull();
      expect(res.error).toContain('faol emas');
    });

    it('succeeds, derives server snapshots (price, storeOwnerId, storeName, productName), ignores client manipulation', async () => {
      vi.mocked(firestoreModule.getDoc)
        .mockResolvedValueOnce(validStoreDoc as unknown as firestoreModule.DocumentSnapshot)
        .mockResolvedValueOnce(validOfferDoc as unknown as firestoreModule.DocumentSnapshot)
        .mockResolvedValueOnce(validProductDoc as unknown as firestoreModule.DocumentSnapshot);

      const res = await createOrder(validOrderInput);

      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.customerUid).toBe('customer_uid_1');
      expect(res.data!.customerEmail).toBe('customer@oneshop.uz');
      expect(res.data!.storeOwnerId).toBe('merchant_owner_99'); // Captured from store document!
      expect(res.data!.storeName).toBe('Media Park Nukus'); // Captured from store document!
      expect(res.data!.productName).toBe('Samsung Galaxy A55'); // Captured from product document!
      expect(res.data!.price).toBe(3200000); // Captured from offer document!
      expect(res.data!.totalAmount).toBe(6400000); // 3200000 * 2
      expect(res.data!.status).toBe('pending');
      expect(firestoreModule.setDoc).toHaveBeenCalled();
    });
  });

  describe('getCustomerOrders & getStoreOrders', () => {
    it('getCustomerOrders: rejects caller trying to view another customer’s orders without admin role', async () => {
      const res = await getCustomerOrders('other_customer_99');
      expect(res.data).toBeNull();
      expect(res.error).toContain('o‘zingizga tegishli');
    });

    it('getCustomerOrders: succeeds when customer views their own orders and enforces max limit 25', async () => {
      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        docs: [
          {
            id: 'order_1',
            data: () => ({
              customerUid: 'customer_uid_1',
              storeOwnerId: 'merchant_1',
              price: 150000,
              quantity: 1,
              status: 'pending',
            }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await getCustomerOrders('customer_uid_1', { limitCount: 50 }); // Requested 50
      expect(res.error).toBeNull();
      expect(res.data).toHaveLength(1);
      // Verify limit constraint was called with ceiling 25
      expect(firestoreModule.limit).toHaveBeenCalledWith(25);
    });

    it('getStoreOrders: rejects caller trying to view another store’s orders without admin role', async () => {
      const res = await getStoreOrders('other_merchant_owner');
      expect(res.data).toBeNull();
      expect(res.error).toContain('o‘z do‘koningizga kelgan');
    });

    it('getStoreOrders: succeeds when merchant views their own store orders', async () => {
      mockCurrentUser.uid = 'merchant_owner_99';

      vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
        docs: [
          {
            id: 'order_10',
            data: () => ({
              customerUid: 'customer_uid_1',
              storeOwnerId: 'merchant_owner_99',
              price: 500000,
              quantity: 1,
              status: 'pending',
            }),
          },
        ],
      } as unknown as firestoreModule.QuerySnapshot);

      const res = await getStoreOrders('merchant_owner_99');
      expect(res.error).toBeNull();
      expect(res.data).toHaveLength(1);
      expect(res.data![0].storeOwnerId).toBe('merchant_owner_99');
    });
  });

  describe('getOrderById', () => {
    it('rejects access to stranger caller', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'order_1',
        data: () => ({
          customerUid: 'customer_secret',
          storeOwnerId: 'merchant_secret',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await getOrderById('order_1');
      expect(res.data).toBeNull();
      expect(res.error).toContain('ruxsat yo‘q');
    });

    it('allows customer to view their own order', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'order_1',
        data: () => ({
          customerUid: 'customer_uid_1',
          storeOwnerId: 'merchant_other',
          price: 200000,
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await getOrderById('order_1');
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data!.customerUid).toBe('customer_uid_1');
    });
  });

  describe('updateOrderStatus - State Machine & Access Control', () => {
    it('allows customer to cancel their own pending order', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'order_1',
        data: () => ({
          customerUid: 'customer_uid_1',
          storeOwnerId: 'merchant_owner_99',
          status: 'pending',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await updateOrderStatus('order_1', { status: 'cancelled' });
      expect(res.error).toBeNull();
      expect(res.data?.status).toBe('cancelled');
      expect(firestoreModule.updateDoc).toHaveBeenCalled();
    });

    it('disallows customer from accepting their own order', async () => {
      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'order_1',
        data: () => ({
          customerUid: 'customer_uid_1',
          storeOwnerId: 'merchant_owner_99',
          status: 'pending',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await updateOrderStatus('order_1', { status: 'accepted' });
      expect(res.data).toBeNull();
      expect(res.error).toContain('Faqat do‘kon egasi yoki admin');
    });

    it('allows merchant to accept pending order', async () => {
      mockCurrentUser.uid = 'merchant_owner_99';

      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'order_1',
        data: () => ({
          customerUid: 'customer_uid_1',
          storeOwnerId: 'merchant_owner_99',
          status: 'pending',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await updateOrderStatus('order_1', { status: 'accepted' });
      expect(res.error).toBeNull();
      expect(res.data?.status).toBe('accepted');
    });

    it('allows merchant to reject pending order with merchantNotes', async () => {
      mockCurrentUser.uid = 'merchant_owner_99';

      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'order_1',
        data: () => ({
          customerUid: 'customer_uid_1',
          storeOwnerId: 'merchant_owner_99',
          status: 'pending',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await updateOrderStatus('order_1', {
        status: 'rejected',
        merchantNotes: 'Ushbu tovar hozirda tugagan.',
      });
      expect(res.error).toBeNull();
      expect(res.data?.status).toBe('rejected');
      expect(res.data?.merchantNotes).toBe('Ushbu tovar hozirda tugagan.');
    });

    it('allows merchant to complete accepted order', async () => {
      mockCurrentUser.uid = 'merchant_owner_99';

      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'order_1',
        data: () => ({
          customerUid: 'customer_uid_1',
          storeOwnerId: 'merchant_owner_99',
          status: 'accepted',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await updateOrderStatus('order_1', { status: 'completed' });
      expect(res.error).toBeNull();
      expect(res.data?.status).toBe('completed');
    });

    it('disallows transitions from completed or cancelled (terminal states)', async () => {
      mockCurrentUser.uid = 'merchant_owner_99';

      vi.mocked(firestoreModule.getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'order_1',
        data: () => ({
          customerUid: 'customer_uid_1',
          storeOwnerId: 'merchant_owner_99',
          status: 'completed',
        }),
      } as unknown as firestoreModule.DocumentSnapshot);

      const res = await updateOrderStatus('order_1', { status: 'pending' });
      expect(res.data).toBeNull();
      expect(res.error).toContain('qayta o‘zgartirib bo‘lmaydi');
    });
  });

  describe('mapDocumentToOrder', () => {
    it('properly maps raw document fields with default fallbacks and calculated totalAmount', () => {
      const raw = {
        customerUid: 'cust_1',
        customerName: 'Alisher',
        storeId: 'store_1',
        price: 500000,
        quantity: 3,
        status: 'pending',
      };

      const mapped = mapDocumentToOrder('order_doc_1', raw);
      expect(mapped.id).toBe('order_doc_1');
      expect(mapped.customerUid).toBe('cust_1');
      expect(mapped.price).toBe(500000);
      expect(mapped.quantity).toBe(3);
      expect(mapped.totalAmount).toBe(1500000); // 500000 * 3
      expect(mapped.status).toBe('pending');
      expect(mapped.currency).toBe('UZS');
    });
  });
});
