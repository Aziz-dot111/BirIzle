import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  limit,
  type DocumentData,
  type Timestamp,
  type QueryConstraint,
} from 'firebase/firestore';
import { firestoreDb, firebaseAuth, isFirebaseReady } from './firebase';
import { getFirebaseErrorMessage } from './errors';
import {
  STORES_COLLECTION,
  PRODUCTS_COLLECTION,
  OFFERS_COLLECTION,
  mapDocumentToOffer,
} from './catalog';
import { isOfferActiveForCustomer } from '@/utils/canonicalOffer';
import {
  validateCreateOrderInput,
  validateUpdateOrderStatusInput,
  validateOrderStatusTransition,
} from '@/utils/orderValidation';
import type {
  Order,
  OrderStatus,
  CreateOrderInput,
  UpdateOrderStatusInput,
  OrderFilterOptions,
  ServiceResult,
  CurrencyCode,
} from '@/types';

export const ORDERS_COLLECTION = 'orders';

/**
 * Normalizes Firestore timestamp, object, or string into an ISO 8601 string.
 */
function normalizeDate(raw: unknown): string {
  if (!raw) return new Date().toISOString();
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'toDate' in raw &&
    typeof (raw as Timestamp).toDate === 'function'
  ) {
    return (raw as Timestamp).toDate().toISOString();
  }
  if (typeof raw === 'string') return raw;
  return new Date().toISOString();
}

/**
 * Maps a Firestore document snapshot to a typed Order object
 */
export function mapDocumentToOrder(id: string, data: DocumentData): Order {
  const price = typeof data.price === 'number' ? data.price : 0;
  const quantity = typeof data.quantity === 'number' ? data.quantity : 1;
  const totalAmount =
    typeof data.totalAmount === 'number' ? data.totalAmount : price * quantity;

  return {
    id,
    customerUid: data.customerUid || '',
    customerEmail: data.customerEmail || '',
    customerName: data.customerName || '',
    customerPhone: data.customerPhone || '',
    storeId: data.storeId || '',
    storeOwnerId: data.storeOwnerId || '',
    storeName: data.storeName || '',
    productId: data.productId || '',
    productName: data.productName || '',
    offerId: data.offerId || '',
    variantId: data.variantId || undefined,
    price,
    currency: (data.currency as CurrencyCode) || 'UZS',
    quantity,
    totalAmount,
    customerNote: data.customerNote || undefined,
    merchantNotes: data.merchantNotes || undefined,
    status: (data.status as OrderStatus) || 'pending',
    statusChangedAt: normalizeDate(data.statusChangedAt),
    statusChangedBy: data.statusChangedBy || '',
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
  };
}

/**
 * Creates a new customer order / lead in /orders/{orderId}.
 *
 * CRITICAL SECURITY INVARIANTS:
 * 1. Customer must be authenticated and email-verified.
 * 2. Input validation guarantees quantity 1..99, phone, name format, and note length.
 * 3. Verified Store, Offer, and Product documents are loaded from Firestore.
 * 4. Critical snapshot fields (storeOwnerId, storeName, productName, price, currency)
 *    are STRICTLY derived from database documents — NEVER trusted from client input!
 * 5. Orders cannot be created for demo stores, OSM points, inactive/pending/archived stores,
 *    or inactive/superseded/zero-price offers.
 */
export async function createOrder(
  input: CreateOrderInput
): Promise<ServiceResult<Order>> {
  if (!isFirebaseReady || !firestoreDb) {
    return { data: null, error: 'Firebase Firestore tizimi hali sozlanmagan.' };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return {
      data: null,
      error: 'Do‘konga buyurtma yuborish uchun tizimga kirishingiz shart.',
    };
  }

  if (!currentUser.emailVerified) {
    return {
      data: null,
      error:
        'Buyurtma berish uchun elektron pochtangiz tasdiqlangan bo‘lishi shart. Iltimos, profilingizda pochtangizni tasdiqlang.',
    };
  }

  const validation = validateCreateOrderInput(input);
  if (!validation.isValid) {
    return { data: null, error: validation.error || 'Buyurtma ma’lumotlari noto‘g‘ri kiritildi.' };
  }

  const cleanStoreId = input.storeId.trim();
  const cleanProductId = input.productId.trim();
  const cleanOfferId = input.offerId.trim();
  const cleanVariantId = input.variantId?.trim() || undefined;

  try {
    // 1. Fetch and verify target Store document
    const storeDocRef = doc(firestoreDb, STORES_COLLECTION, cleanStoreId);
    const storeSnap = await getDoc(storeDocRef);

    if (!storeSnap.exists()) {
      return { data: null, error: 'Buyurtma berilayotgan do‘kon topilmadi.' };
    }

    const storeData = storeSnap.data() as DocumentData;
    const storeStatus = storeData.status || (storeData.isVerified ? 'active' : 'pending');

    if (storeStatus !== 'active') {
      return {
        data: null,
        error: 'Ushbu do‘kon hozirda faol emas yoki tasdiqlanmagan.',
      };
    }

    if (storeData.isDemo || storeData.sourceType === 'openstreetmap') {
      return {
        data: null,
        error:
          'Ushbu savdo nuqtasi real sotuvchi emas (demo yoki xarita obyekti bo‘lgani sababli buyurtma qabul qilinmaydi).',
      };
    }

    const storeOwnerId = typeof storeData.ownerId === 'string' ? storeData.ownerId.trim() : '';
    if (!storeOwnerId || storeData.ownershipStatus === 'unclaimed') {
      return {
        data: null,
        error: 'Ushbu do‘konga biriktirilgan faol sotuvchi topilmadi.',
      };
    }

    // 2. Fetch and verify target Offer document
    const offerDocRef = doc(firestoreDb, OFFERS_COLLECTION, cleanOfferId);
    const offerSnap = await getDoc(offerDocRef);

    if (!offerSnap.exists()) {
      return { data: null, error: 'Tanlangan narx taklifi topilmadi.' };
    }

    const offerData = offerSnap.data() as DocumentData;
    const typedOffer = mapDocumentToOffer(offerSnap.id, offerData);

    if (typedOffer.storeId !== cleanStoreId) {
      return {
        data: null,
        error: 'Tanlangan taklif ushbu do‘konga tegishli emas.',
      };
    }

    if (typedOffer.productId !== cleanProductId) {
      return {
        data: null,
        error: 'Tanlangan taklif ushbu mahsulotga tegishli emas.',
      };
    }

    if (cleanVariantId && typedOffer.variantId && cleanVariantId !== typedOffer.variantId) {
      return {
        data: null,
        error: 'Mahsulot varianti taklif varianti bilan mos kelmadi.',
      };
    }

    if (!isOfferActiveForCustomer(typedOffer)) {
      return {
        data: null,
        error:
          'Ushbu narx taklifi hozirda faol emas yoki sotuvdan olingan.',
      };
    }

    // 3. Fetch and verify Product document
    const productDocRef = doc(firestoreDb, PRODUCTS_COLLECTION, cleanProductId);
    const productSnap = await getDoc(productDocRef);

    if (!productSnap.exists()) {
      return { data: null, error: 'Tanlangan mahsulot katalogda topilmadi.' };
    }

    const productData = productSnap.data() as DocumentData;

    // 4. Construct trusted server snapshots
    const storeName = String(storeData.name || 'Noma’lum do‘kon');
    const productName = String(productData.name || 'Noma’lum mahsulot');
    const price = typedOffer.price;
    const currency = typedOffer.currency || 'UZS';
    const totalAmount = price * input.quantity;

    const ordersColRef = collection(firestoreDb, ORDERS_COLLECTION);
    const newOrderRef = doc(ordersColRef);
    const nowIso = new Date().toISOString();

    const orderPayload: Record<string, unknown> = {
      customerUid: currentUser.uid,
      customerEmail: currentUser.email || '',
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      storeId: cleanStoreId,
      storeOwnerId,
      storeName,
      productId: cleanProductId,
      productName,
      offerId: cleanOfferId,
      variantId: cleanVariantId || typedOffer.variantId || null,
      price,
      currency,
      quantity: input.quantity,
      totalAmount,
      customerNote: input.customerNote?.trim() || null,
      merchantNotes: null,
      status: 'pending',
      statusChangedAt: serverTimestamp(),
      statusChangedBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(newOrderRef, orderPayload);

    const createdOrder: Order = {
      id: newOrderRef.id,
      customerUid: currentUser.uid,
      customerEmail: currentUser.email || '',
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      storeId: cleanStoreId,
      storeOwnerId,
      storeName,
      productId: cleanProductId,
      productName,
      offerId: cleanOfferId,
      variantId: cleanVariantId || typedOffer.variantId,
      price,
      currency,
      quantity: input.quantity,
      totalAmount,
      customerNote: input.customerNote?.trim() || undefined,
      merchantNotes: undefined,
      status: 'pending',
      statusChangedAt: nowIso,
      statusChangedBy: currentUser.uid,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return { data: createdOrder, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Fetches orders placed by a specific customer.
 * Enforces pagination ceiling: default 20, max 25 (Spark plan optimization).
 */
export async function getCustomerOrders(
  customerUid: string,
  options: OrderFilterOptions = {}
): Promise<ServiceResult<Order[]>> {
  if (!customerUid || !customerUid.trim()) {
    return { data: null, error: 'Xaridor identifikatori ko‘rsatilmadi.' };
  }

  if (!isFirebaseReady || !firestoreDb) {
    return { data: [], error: null };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return { data: null, error: 'Buyurtmalarni ko‘rish uchun tizimga kirishingiz shart.' };
  }

  const cleanCustomerUid = customerUid.trim();

  // Security check: caller can only query their own orders unless admin
  let isAdmin = false;
  if (currentUser.uid !== cleanCustomerUid) {
    const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
    isAdmin = Boolean(tokenResult?.claims?.admin);
    if (!isAdmin) {
      return {
        data: null,
        error: 'Siz faqat o‘zingizga tegishli buyurtmalarni ko‘ra olasiz.',
      };
    }
  }

  try {
    const colRef = collection(firestoreDb, ORDERS_COLLECTION);
    const safeLimit = Math.min(Math.max(options.limitCount || 20, 1), 25);

    const constraints: QueryConstraint[] = [
      where('customerUid', '==', cleanCustomerUid),
    ];

    if (options.status) {
      constraints.push(where('status', '==', options.status));
    }

    constraints.push(limit(safeLimit));

    const q = query(colRef, ...constraints);
    const snap = await getDocs(q);

    const orders = snap.docs.map((docSnap) =>
      mapDocumentToOrder(docSnap.id, docSnap.data())
    );

    return { data: orders, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Fetches orders received by a specific store owner.
 * Enforces pagination ceiling: default 20, max 25 (Spark plan optimization).
 */
export async function getStoreOrders(
  storeOwnerId: string,
  options: OrderFilterOptions = {}
): Promise<ServiceResult<Order[]>> {
  if (!storeOwnerId || !storeOwnerId.trim()) {
    return { data: null, error: 'Do‘kon egasi identifikatori ko‘rsatilmadi.' };
  }

  if (!isFirebaseReady || !firestoreDb) {
    return { data: [], error: null };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return { data: null, error: 'Buyurtmalarni ko‘rish uchun tizimga kirishingiz shart.' };
  }

  const cleanStoreOwnerId = storeOwnerId.trim();

  // Security check: caller can only query their own store orders unless admin
  let isAdmin = false;
  if (currentUser.uid !== cleanStoreOwnerId) {
    const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
    isAdmin = Boolean(tokenResult?.claims?.admin);
    if (!isAdmin) {
      return {
        data: null,
        error: 'Siz faqat o‘z do‘koningizga kelgan buyurtmalarni ko‘ra olasiz.',
      };
    }
  }

  try {
    const colRef = collection(firestoreDb, ORDERS_COLLECTION);
    const safeLimit = Math.min(Math.max(options.limitCount || 20, 1), 25);

    const constraints: QueryConstraint[] = [
      where('storeOwnerId', '==', cleanStoreOwnerId),
    ];

    if (options.status) {
      constraints.push(where('status', '==', options.status));
    }

    constraints.push(limit(safeLimit));

    const q = query(colRef, ...constraints);
    const snap = await getDocs(q);

    const orders = snap.docs.map((docSnap) =>
      mapDocumentToOrder(docSnap.id, docSnap.data())
    );

    return { data: orders, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Fetches a single order by document ID with access control
 */
export async function getOrderById(orderId: string): Promise<ServiceResult<Order>> {
  if (!orderId || !orderId.trim()) {
    return { data: null, error: 'Buyurtma identifikatori ko‘rsatilmadi.' };
  }

  if (!isFirebaseReady || !firestoreDb) {
    return { data: null, error: 'Firebase Firestore tizimi hali sozlanmagan.' };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return { data: null, error: 'Buyurtmani ko‘rish uchun tizimga kirishingiz shart.' };
  }

  const cleanOrderId = orderId.trim();

  try {
    const docRef = doc(firestoreDb, ORDERS_COLLECTION, cleanOrderId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { data: null, error: 'Buyurtma topilmadi.' };
    }

    const orderData = snap.data() as DocumentData;
    const isCustomer = currentUser.uid === orderData.customerUid;
    const isMerchant = currentUser.uid === orderData.storeOwnerId;

    let isAdmin = false;
    if (!isCustomer && !isMerchant) {
      const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
      isAdmin = Boolean(tokenResult?.claims?.admin);
    }

    if (!isCustomer && !isMerchant && !isAdmin) {
      return {
        data: null,
        error: 'Ushbu buyurtmani ko‘rish uchun sizda ruxsat yo‘q.',
      };
    }

    return {
      data: mapDocumentToOrder(snap.id, orderData),
      error: null,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Updates an order status following the strict state machine rules.
 *
 * PERMITTED TRANSITIONS:
 * - pending -> accepted   (Store Owner or Admin)
 * - pending -> rejected   (Store Owner or Admin, optional/recommended merchantNotes)
 * - pending -> cancelled  (Customer or Admin)
 * - accepted -> completed (Store Owner or Admin)
 *
 * Immutability: customerUid, storeOwnerId, storeId, productId, offerId, price,
 * currency, quantity, and createdAt cannot be changed.
 */
export async function updateOrderStatus(
  orderId: string,
  input: UpdateOrderStatusInput
): Promise<ServiceResult<Order>> {
  if (!orderId || !orderId.trim()) {
    return { data: null, error: 'Buyurtma identifikatori ko‘rsatilmadi.' };
  }

  if (!isFirebaseReady || !firestoreDb) {
    return { data: null, error: 'Firebase Firestore tizimi hali sozlanmagan.' };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return { data: null, error: 'Buyurtma holatini yangilash uchun tizimga kirishingiz shart.' };
  }

  const validation = validateUpdateOrderStatusInput(input);
  if (!validation.isValid) {
    return { data: null, error: validation.error || 'Noto‘g‘ri ma’lumot kiritildi.' };
  }

  const cleanOrderId = orderId.trim();

  try {
    const docRef = doc(firestoreDb, ORDERS_COLLECTION, cleanOrderId);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { data: null, error: 'Buyurtma topilmadi.' };
    }

    const orderData = snap.data() as DocumentData;
    const currentStatus = (orderData.status as OrderStatus) || 'pending';

    const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
    const isAdmin = Boolean(tokenResult?.claims?.admin);

    const actor = {
      uid: currentUser.uid,
      customerUid: String(orderData.customerUid || ''),
      storeOwnerId: String(orderData.storeOwnerId || ''),
      isAdmin,
    };

    const transitionCheck = validateOrderStatusTransition(
      currentStatus,
      input.status,
      actor
    );

    if (!transitionCheck.isValid) {
      return { data: null, error: transitionCheck.error || 'Ruxsat etilmagan holat o‘zgarishi.' };
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      status: input.status,
      statusChangedAt: serverTimestamp(),
      statusChangedBy: currentUser.uid,
      updatedAt: serverTimestamp(),
    };

    if (input.merchantNotes !== undefined) {
      updatePayload.merchantNotes = input.merchantNotes.trim() || null;
    }

    await updateDoc(docRef, updatePayload);

    const updatedOrder: Order = {
      ...mapDocumentToOrder(snap.id, orderData),
      status: input.status,
      statusChangedAt: nowIso,
      statusChangedBy: currentUser.uid,
      updatedAt: nowIso,
      merchantNotes:
        input.merchantNotes !== undefined
          ? input.merchantNotes.trim() || undefined
          : orderData.merchantNotes || undefined,
    };

    return { data: updatedOrder, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

