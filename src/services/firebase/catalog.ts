import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  type DocumentData,
  type Timestamp,
  type QueryConstraint,
} from 'firebase/firestore';
import { firestoreDb, firebaseAuth, isFirebaseReady } from './firebase';
import { getFirebaseErrorMessage } from './errors';
import type {
  Store,
  StoreOwnershipStatus,
  CreateStoreInput,
  UpdateStoreInput,
  ProductItem,
  InventoryOffer,
  CreateOfferInput,
  UpdateOfferInput,
  StoreProductOffer,
  ServiceResult,
  CurrencyCode,
  OfferAvailability,
  Coordinates,
  OfferSubmission,
  OfferSubmissionStatus,
  CreateOfferSubmissionInput,
  ReviewOfferSubmissionInput,
  ProductSubmission,
  ProductSubmissionStatus,
  CreateProductSubmissionInput,
  ReviewProductSubmissionInput,
  StoreStatus,
} from '@/types';
import {
  DEMO_NUKUS_STORES,
  DEMO_NUKUS_PRODUCTS,
  DEMO_NUKUS_OFFERS,
} from '@/fixtures/nukusCatalogDemo';
import { KARAKALPAKSTAN_OSM_PLACES } from '@/fixtures/karakalpakstanOsmPlaces';
import {
  normalizeStoreCoordinates,
  calculateHaversineDistance,
  isValidCoordinates,
} from '@/utils/geo';
import {
  matchesSearchQuery,
  productMatchesQuery,
  normalizeSearchQuery,
} from '@/utils/textNormalization';
import {
  validateStoreInput,
  validateUpdateStoreInput,
  validateOfferInput,
  validateUpdateOfferInput,
  validateOfferSubmissionInput,
  validateProductSubmissionInput,
  validateReviewSubmissionInput,
  generateSearchKeywords,
  normalizeSearchTerm,
} from '@/utils/catalogValidation';
import {
  getCanonicalOfferId,
  getLegacyUnderscoreOfferId,
  isCanonicalOfferId,
  isLegacyUnderscoreOfferId,
  parseOfferId,
  deduplicateOffers,
  getOfferDedupeKey,
  isOfferActiveForCustomer,
  isStoreVisibleToCustomer,
  type ParsedOfferId,
} from '@/utils/canonicalOffer';

export const STORES_COLLECTION = 'stores';
export const PRODUCTS_COLLECTION = 'products';
export const OFFERS_COLLECTION = 'offers';
export const OFFER_SUBMISSIONS_COLLECTION = 'offerSubmissions';
export const PRODUCT_SUBMISSIONS_COLLECTION = 'productSubmissions';

export {
  getCanonicalOfferId,
  getLegacyUnderscoreOfferId,
  isCanonicalOfferId,
  isLegacyUnderscoreOfferId,
  parseOfferId,
  deduplicateOffers,
  getOfferDedupeKey,
  isOfferActiveForCustomer,
  isStoreVisibleToCustomer,
  type ParsedOfferId,
};

const FIRESTORE_TIMEOUT_MS = 2500;

/**
 * Wraps a Firestore Promise with a resilient timeout to prevent
 * UI lockups during network delays or unauthenticated permission blocks.
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms = FIRESTORE_TIMEOUT_MS,
  errorMsg = 'Firestore query timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms)),
  ]);
}

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
  if (typeof raw === 'string') {
    return raw;
  }
  return new Date().toISOString();
}

/**
 * Maps a Firestore document snapshot to a typed Store object.
 * Robustly normalizes coordinates from diverse schemas (location, coordinates, lat/lng).
 */
export function mapDocumentToStore(id: string, data: DocumentData): Store {
  const coords = normalizeStoreCoordinates(data as Record<string, unknown>);
  return {
    id,
    ownerId: data.ownerId !== undefined ? data.ownerId : undefined,
    ownershipStatus: (data.ownershipStatus as StoreOwnershipStatus) || (data.ownerId ? 'claimed' : 'unclaimed'),
    name: data.name || '',
    city: data.city || 'Nukus',
    district: data.district || undefined,
    address: data.address || '',
    coordinates: coords || { lat: 0, lng: 0 },
    category: data.category || 'general',
    phone: data.phone || '',
    openingHours: data.openingHours || '',
    isVerified: Boolean(data.isVerified),
    status: (data.status as 'active' | 'pending' | 'archived' | 'inactive' | 'suspended') || 'active',
    isDemo: Boolean(data.isDemo),
    sourceType: (data.sourceType as 'birqidir' | 'openstreetmap') || 'birqidir',
    osmId: data.osmId || undefined,
    website: data.website || undefined,
    placeType: data.placeType || undefined,
    description: data.description || undefined,
    metadata: data.metadata || undefined,
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
  };
}

/**
 * Maps a Firestore document snapshot to a typed ProductItem object
 */
export function mapDocumentToProduct(id: string, data: DocumentData): ProductItem {
  return {
    id,
    name: data.name || '',
    normalizedName: data.normalizedName || (data.name ? String(data.name).toLowerCase().trim() : ''),
    searchKeywords: Array.isArray(data.searchKeywords) ? data.searchKeywords : [],
    category: data.category || 'general',
    brand: data.brand || undefined,
    model: data.model || undefined,
    barcode: data.barcode || undefined,
    imageUrl: data.imageUrl || undefined,
    description: data.description || undefined,
    variant: data.variant || undefined,
    specifications: data.specifications || undefined,
    minPrice: typeof data.minPrice === 'number' ? data.minPrice : undefined,
    maxPrice: typeof data.maxPrice === 'number' ? data.maxPrice : undefined,
    sellerCount: typeof data.sellerCount === 'number' ? data.sellerCount : undefined,
    isDemo: Boolean(data.isDemo),
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
  };
}

/**
 * Maps a Firestore document snapshot to a typed InventoryOffer object
 */
export function mapDocumentToOffer(id: string, data: DocumentData): InventoryOffer {
  const availability = (data.availability as OfferAvailability) || 'in_stock';
  return {
    id,
    storeId: data.storeId || '',
    ownerId: data.ownerId || undefined,
    productId: data.productId || '',
    variantId: data.variantId || undefined,
    price: typeof data.price === 'number' ? data.price : 0,
    currency: (data.currency as CurrencyCode) || 'UZS',
    availability,
    inStock: data.inStock !== undefined ? Boolean(data.inStock) : availability === 'in_stock',
    warrantyMonths: typeof data.warrantyMonths === 'number' ? data.warrantyMonths : undefined,
    deliveryAvailable: typeof data.deliveryAvailable === 'boolean' ? data.deliveryAvailable : undefined,
    notes: data.notes || undefined,
    version: typeof data.version === 'number' ? data.version : 1, // Legacy offers default to version 1
    status:
      (data.status as 'active' | 'archived' | 'pending' | 'superseded') ||
      (data.isSuperseded ? 'superseded' : 'active'),
    isSuperseded: Boolean(data.isSuperseded || data.status === 'superseded'),
    legacyId: data.legacyId || (isCanonicalOfferId(id) ? undefined : id),
    isDemo: Boolean(data.isDemo),
    createdAt: data.createdAt ? normalizeDate(data.createdAt) : undefined,
    updatedAt: normalizeDate(data.updatedAt),
  };
}

/**
 * Maps a Firestore document snapshot to a typed OfferSubmission object
 */
export function mapDocumentToOfferSubmission(id: string, data: DocumentData): OfferSubmission {
  return {
    id,
    merchantUid: data.merchantUid || '',
    merchantEmail: data.merchantEmail || '',
    storeId: data.storeId || '',
    productId: data.productId || '',
    variantId: data.variantId || undefined,
    targetOfferId: data.targetOfferId || undefined,
    version: typeof data.version === 'number' ? data.version : undefined,
    price: typeof data.price === 'number' ? data.price : 0,
    currency: (data.currency as CurrencyCode) || 'UZS',
    availability: (data.availability as OfferAvailability) || 'in_stock',
    warrantyMonths: typeof data.warrantyMonths === 'number' ? data.warrantyMonths : undefined,
    deliveryAvailable: typeof data.deliveryAvailable === 'boolean' ? data.deliveryAvailable : undefined,
    notes: data.notes || undefined,
    status: (data.status as OfferSubmissionStatus) || 'pending',
    adminNotes: data.adminNotes || undefined,
    reviewedBy: data.reviewedBy || undefined,
    reviewedAt: data.reviewedAt ? normalizeDate(data.reviewedAt) : undefined,
    approvedOfferId: data.approvedOfferId || undefined,
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
  };
}

/**
 * Maps a Firestore document snapshot to a typed ProductSubmission object
 */
export function mapDocumentToProductSubmission(id: string, data: DocumentData): ProductSubmission {
  return {
    id,
    merchantUid: data.merchantUid || '',
    merchantEmail: data.merchantEmail || '',
    storeId: data.storeId || '',
    name: data.name || '',
    category: data.category || '',
    brand: data.brand || undefined,
    model: data.model || undefined,
    barcode: data.barcode || undefined,
    imageUrl: data.imageUrl || undefined,
    description: data.description || undefined,
    variant: data.variant || undefined,
    specifications: data.specifications || undefined,
    proposedPrice: typeof data.proposedPrice === 'number' ? data.proposedPrice : undefined,
    status: (data.status as ProductSubmissionStatus) || 'pending',
    adminNotes: data.adminNotes || undefined,
    reviewedBy: data.reviewedBy || undefined,
    reviewedAt: data.reviewedAt ? normalizeDate(data.reviewedAt) : undefined,
    approvedProductId: data.approvedProductId || undefined,
    createdAt: normalizeDate(data.createdAt),
    updatedAt: normalizeDate(data.updatedAt),
  };
}

// ============================================================================
// STORES SERVICE
// ============================================================================

export interface GetStoresFilter {
  city?: string;
  district?: string;
  category?: string;
  limitCount?: number;
  includeDemo?: boolean;
  includeOsm?: boolean;
  sourceType?: 'birqidir' | 'openstreetmap';
  searchQuery?: string;
  includeAllStatuses?: boolean;
}

/**
 * Fetches public stores catalog from Firestore and OpenStreetMap Karakalpakstan places.
 * Supports tolerant multilingual search, district filtering, and source type segregation.
 */
export async function getStores(filter: GetStoresFilter = {}): Promise<ServiceResult<Store[]>> {
  const includeOsm = filter.includeOsm ?? true;

  // Local filtering helper (search query, district, category, sourceType, limit)
  const applyFilters = (storeList: Store[]): Store[] => {
    let result = storeList;

    // Exclude archived and unverified pending stores from customer view (unless admin passes includeAllStatuses)
    if (!filter.includeAllStatuses) {
      result = result.filter((s) => isStoreVisibleToCustomer(s));
    }

    if (filter.sourceType) {
      result = result.filter((s) => (s.sourceType || 'birqidir') === filter.sourceType);
    }
    if (filter.city) {
      const targetCity = filter.city.toLowerCase();
      result = result.filter(
        (s) => s.city.toLowerCase() === targetCity || (s.district && s.district.toLowerCase().includes(targetCity))
      );
    }
    if (filter.district) {
      const targetDist = filter.district.toLowerCase();
      result = result.filter(
        (s) => (s.district && s.district.toLowerCase() === targetDist) || s.city.toLowerCase() === targetDist
      );
    }
    if (filter.category) {
      const targetCat = filter.category.toLowerCase();
      result = result.filter((s) => s.category.toLowerCase().includes(targetCat));
    }
    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.trim();
      result = result.filter((s) =>
        matchesSearchQuery(
          `${s.name} ${s.category} ${s.city} ${s.district || ''} ${s.address} ${s.description || ''}`,
          q
        )
      );
    }
    if (filter.limitCount && filter.limitCount > 0) {
      result = result.slice(0, filter.limitCount);
    }
    return result;
  };

  if (!isFirebaseReady || !firestoreDb) {
    let combined: Store[] = [];
    if (filter.includeDemo) {
      combined = [...DEMO_NUKUS_STORES];
    }
    if (includeOsm) {
      combined = [...combined, ...KARAKALPAKSTAN_OSM_PLACES];
    }
    return { data: applyFilters(combined), error: null };
  }

  try {
    const constraints: QueryConstraint[] = [];
    // Privacy and Rules invariant: For public customer queries, filter strictly for active stores
    // at the query level to prevent leaking pending merchant store applications.
    if (!filter.includeAllStatuses) {
      constraints.push(where('status', '==', 'active'));
      // Mandatory limit <= 25 for public customer queries to comply with Firestore list security rule
      const publicLimit = filter.limitCount && filter.limitCount > 0
        ? Math.min(filter.limitCount, 25)
        : 25;
      constraints.push(limit(publicLimit));
    } else if (filter.limitCount && filter.limitCount > 0) {
      constraints.push(limit(filter.limitCount));
    }
    if (filter.city) {
      constraints.push(where('city', '==', filter.city));
    }
    if (filter.category) {
      constraints.push(where('category', '==', filter.category));
    }

    const colRef = collection(firestoreDb, STORES_COLLECTION);
    const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
    const snap = await withTimeout(getDocs(q));

    let stores: Store[] = [];
    if (!snap.empty) {
      stores = snap.docs.map((docSnap) => mapDocumentToStore(docSnap.id, docSnap.data()));
    } else if (filter.includeDemo) {
      stores = [...DEMO_NUKUS_STORES];
    }

    if (includeOsm) {
      // Merge OSM places avoiding duplicates with existing stores (by id or osmId)
      const existingIds = new Set(stores.map((s) => s.id));
      const existingOsmIds = new Set(stores.map((s) => s.osmId).filter(Boolean));
      const nonDuplicateOsm = KARAKALPAKSTAN_OSM_PLACES.filter(
        (osm) => !existingIds.has(osm.id) && (!osm.osmId || !existingOsmIds.has(osm.osmId))
      );
      stores = [...stores, ...nonDuplicateOsm];
    }

    const filtered = applyFilters(stores);
    filtered.forEach((s) => storeCache.set(s.id, { store: s, timestamp: Date.now() }));
    return { data: filtered, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (filter.includeDemo) {
      console.warn(
        `[BirQidir Catalog] Firestore stores read failed (${code || 'unknown'}). Falling back to verified demo/OSM stores. Error details:`,
        err
      );
      let fallbackStores: Store[] = [...DEMO_NUKUS_STORES];
      if (includeOsm) {
        const existingIds = new Set(fallbackStores.map((s) => s.id));
        const nonDuplicateOsm = KARAKALPAKSTAN_OSM_PLACES.filter((osm) => !existingIds.has(osm.id));
        fallbackStores = [...fallbackStores, ...nonDuplicateOsm];
      }
      const filtered = applyFilters(fallbackStores);
      return { data: filtered, error: null };
    }
    console.warn(`[BirQidir Catalog] Firestore stores read failed (${code || 'unknown'}). Error details:`, err);
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

// In-memory cache for stores to prevent repetitive Firestore reads on Spark plan
const STORE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const storeCache = new Map<string, { store: Store; timestamp: number }>();

/**
 * Clears the in-memory store cache (useful in tests or when refreshing catalog data)
 */
export function clearStoreCache(): void {
  storeCache.clear();
}

/**
 * Specialized helper: Fetches verified stores specifically in Nukus.
 */
export async function getNukusStores(options: { category?: string; limitCount?: number; includeDemo?: boolean } = {}): Promise<ServiceResult<Store[]>> {
  return getStores({ city: 'Nukus', ...options });
}

/**
 * Fetches a single store by its unique identifier.
 * Checks in-memory cache first to conserve Firestore read quota on Spark plan.
 */
export async function getStoreById(
  storeId: string,
  options: { bypassCache?: boolean } = {}
): Promise<ServiceResult<Store>> {
  if (!storeId || !storeId.trim()) {
    return { data: null, error: 'Do‘kon identifikatori ko‘rsatilmadi.' };
  }

  const cleanId = storeId.trim();

  // Check cache first if not explicitly bypassed
  if (!options.bypassCache) {
    const cached = storeCache.get(cleanId);
    if (cached && Date.now() - cached.timestamp < STORE_CACHE_TTL_MS) {
      return { data: cached.store, error: null };
    }
  }

  if (!isFirebaseReady || !firestoreDb) {
    const demo = DEMO_NUKUS_STORES.find((s) => s.id === cleanId) ||
                 KARAKALPAKSTAN_OSM_PLACES.find((s) => s.id === cleanId || s.osmId === cleanId);
    if (demo) return { data: demo, error: null };
    return { data: null, error: 'Do‘kon topilmadi.' };
  }

  try {
    const docRef = doc(firestoreDb, STORES_COLLECTION, cleanId);
    const snap = await withTimeout(getDoc(docRef));

    if (!snap.exists()) {
      const demo = DEMO_NUKUS_STORES.find((s) => s.id === cleanId) ||
                   KARAKALPAKSTAN_OSM_PLACES.find((s) => s.id === cleanId || s.osmId === cleanId);
      if (demo) return { data: demo, error: null };
      return { data: null, error: 'Do‘kon topilmadi.' };
    }

    const store = mapDocumentToStore(snap.id, snap.data());
    storeCache.set(cleanId, { store, timestamp: Date.now() });
    return { data: store, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    const demo = DEMO_NUKUS_STORES.find((s) => s.id === cleanId) ||
                 KARAKALPAKSTAN_OSM_PLACES.find((s) => s.id === cleanId || s.osmId === cleanId);
    if (demo) {
      console.warn(`[BirQidir Catalog] getStoreById failed for '${cleanId}' (${code || 'unknown'}). Serving demo/OSM fallback. Error details:`, err);
      return { data: demo, error: null };
    }
    console.warn(`[BirQidir Catalog] getStoreById failed for '${cleanId}' (${code || 'unknown'}). Error details:`, err);
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

// ============================================================================
// PRODUCTS SERVICE
// ============================================================================

export interface GetProductsFilter {
  category?: string;
  limitCount?: number;
  includeDemo?: boolean;
}

/**
 * Fetches marketplace products catalog from Firestore.
 */
export async function getProducts(filter: GetProductsFilter = {}): Promise<ServiceResult<ProductItem[]>> {
  if (!isFirebaseReady || !firestoreDb) {
    if (filter.includeDemo) {
      let result = [...DEMO_NUKUS_PRODUCTS];
      if (filter.category) {
        result = result.filter((p) => p.category.toLowerCase() === filter.category!.toLowerCase());
      }
      if (filter.limitCount && filter.limitCount > 0) {
        result = result.slice(0, filter.limitCount);
      }
      return { data: result, error: null };
    }
    return { data: [], error: null };
  }

  try {
    const constraints: QueryConstraint[] = [];
    if (filter.category) {
      constraints.push(where('category', '==', filter.category));
    }
    if (filter.limitCount && filter.limitCount > 0) {
      constraints.push(limit(filter.limitCount));
    }

    const colRef = collection(firestoreDb, PRODUCTS_COLLECTION);
    const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
    const snap = await withTimeout(getDocs(q));

    if (snap.empty) {
      if (filter.includeDemo) {
        return { data: DEMO_NUKUS_PRODUCTS, error: null };
      }
      return { data: [], error: null };
    }

    const products = snap.docs.map((docSnap) => mapDocumentToProduct(docSnap.id, docSnap.data()));
    return { data: products, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (filter.includeDemo) {
      console.warn(
        `[BirQidir Catalog] Firestore products read failed (${code || 'unknown'}). Serving demo products fallback. Error details:`,
        err
      );
      let result = [...DEMO_NUKUS_PRODUCTS];
      if (filter.category) {
        result = result.filter((p) => p.category.toLowerCase() === filter.category!.toLowerCase());
      }
      if (filter.limitCount && filter.limitCount > 0) {
        result = result.slice(0, filter.limitCount);
      }
      return { data: result, error: null };
    }
    console.warn(`[BirQidir Catalog] Firestore products read failed (${code || 'unknown'}). Error details:`, err);
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Fetches a single product by its unique identifier.
 */
export async function getProductById(productId: string): Promise<ServiceResult<ProductItem>> {
  if (!productId || !productId.trim()) {
    return { data: null, error: 'Mahsulot identifikatori ko‘rsatilmadi.' };
  }

  const cleanId = productId.trim();

  if (!isFirebaseReady || !firestoreDb) {
    const demo = DEMO_NUKUS_PRODUCTS.find((p) => p.id === cleanId);
    if (demo) return { data: demo, error: null };
    return { data: null, error: 'Mahsulot topilmadi.' };
  }

  try {
    const docRef = doc(firestoreDb, PRODUCTS_COLLECTION, cleanId);
    const snap = await withTimeout(getDoc(docRef));

    if (!snap.exists()) {
      const demo = DEMO_NUKUS_PRODUCTS.find((p) => p.id === cleanId);
      if (demo) return { data: demo, error: null };
      return { data: null, error: 'Mahsulot topilmadi.' };
    }

    return { data: mapDocumentToProduct(snap.id, snap.data()), error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    const demo = DEMO_NUKUS_PRODUCTS.find((p) => p.id === cleanId);
    if (demo) {
      console.warn(`[BirQidir Catalog] getProductById failed for '${cleanId}' (${code || 'unknown'}). Serving demo product. Error details:`, err);
      return { data: demo, error: null };
    }
    console.warn(`[BirQidir Catalog] getProductById failed for '${cleanId}' (${code || 'unknown'}). Error details:`, err);
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

// In-memory cache for products to prevent repetitive Firestore reads on Spark plan
const PRODUCT_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
let allProductsCache: { products: ProductItem[]; timestamp: number } | null = null;

/**
 * Clears the in-memory product cache (useful in tests or when refreshing catalog data)
 */
export function clearProductCache(): void {
  allProductsCache = null;
}

/**
 * In-memory cached products retrieval helper
 */
export async function getAllProductsCached(includeDemo = true): Promise<ProductItem[]> {
  if (allProductsCache && Date.now() - allProductsCache.timestamp < PRODUCT_CACHE_TTL_MS) {
    return allProductsCache.products;
  }
  const res = await getProducts({ includeDemo });
  const items = res.data && res.data.length > 0 ? res.data : (includeDemo ? DEMO_NUKUS_PRODUCTS : []);
  allProductsCache = { products: items, timestamp: Date.now() };
  return items;
}

export interface BrandWithCount {
  name: string;
  count: number;
}

/**
 * Returns available brands with product counts, optionally scoped to a category
 */
export async function getAvailableBrands(category?: string): Promise<BrandWithCount[]> {
  const products = await getAllProductsCached(true);
  const filtered = category && category.trim()
    ? products.filter((p) => p.category.toLowerCase() === category.toLowerCase().trim())
    : products;

  const brandMap = new Map<string, number>();
  for (const p of filtered) {
    if (p.brand && p.brand.trim()) {
      const b = p.brand.trim();
      brandMap.set(b, (brandMap.get(b) || 0) + 1);
    }
  }

  return Array.from(brandMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

export interface SearchSuggestionItem {
  type: 'product' | 'brand' | 'category';
  id: string;
  title: string;
  subtitle?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  count?: number;
  imageUrl?: string;
  query: string;
}

export interface SearchSuggestionsResult {
  products: SearchSuggestionItem[];
  brands: SearchSuggestionItem[];
  categories: SearchSuggestionItem[];
  totalMatches: number;
}

export const CATEGORY_UZBEK_NAMES: Record<string, string> = {
  phones: 'Telefonlar',
  appliances: 'Maishiy texnika',
  computers: 'Kompyuterlar',
  construction: 'Qurilish mollari',
};

/**
 * Computes search suggestions across matching products, matching brands, and matching categories.
 * Uses cached product data to run in < 2ms without repeating Firestore reads on every keystroke.
 */
export async function getSearchSuggestions(
  rawQuery: string,
  options: { limit?: number; category?: string } = {}
): Promise<SearchSuggestionsResult> {
  const query = rawQuery.trim();
  const maxLimit = options.limit ?? 5;

  if (!query) {
    return {
      products: [],
      brands: [],
      categories: [],
      totalMatches: 0,
    };
  }

  const allProducts = await getAllProductsCached(true);
  let candidateProducts = allProducts;
  if (options.category && options.category.trim()) {
    candidateProducts = candidateProducts.filter(
      (p) => p.category.toLowerCase() === options.category!.toLowerCase().trim()
    );
  }

  // 1. Matching products
  const matchingProducts = candidateProducts.filter((p) => productMatchesQuery(p, query));
  const productSuggestions: SearchSuggestionItem[] = matchingProducts.slice(0, maxLimit).map((p) => {
    const catLabel = CATEGORY_UZBEK_NAMES[p.category] || p.category;
    const sub = p.brand ? `${p.brand} • ${catLabel}` : catLabel;
    return {
      type: 'product',
      id: p.id,
      title: p.name,
      subtitle: sub,
      category: p.category,
      brand: p.brand,
      minPrice: p.minPrice,
      imageUrl: p.imageUrl,
      query: p.name,
    };
  });

  // 2. Matching brands
  const brandCounts = new Map<string, number>();
  for (const p of candidateProducts) {
    if (p.brand && p.brand.trim()) {
      const b = p.brand.trim();
      brandCounts.set(b, (brandCounts.get(b) || 0) + 1);
    }
  }

  const brandSuggestions: SearchSuggestionItem[] = [];
  for (const [brandName, count] of brandCounts.entries()) {
    if (matchesSearchQuery(brandName, query)) {
      brandSuggestions.push({
        type: 'brand',
        id: `brand_${brandName.toLowerCase().replace(/\s+/g, '_')}`,
        title: brandName,
        subtitle: `${count} ta mahsulot`,
        brand: brandName,
        count,
        query: brandName,
      });
    }
  }
  brandSuggestions.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

  // 3. Matching categories
  const categoryCounts = new Map<string, number>();
  for (const p of allProducts) {
    categoryCounts.set(p.category, (categoryCounts.get(p.category) || 0) + 1);
  }

  const categorySuggestions: SearchSuggestionItem[] = [];
  for (const [catKey, label] of Object.entries(CATEGORY_UZBEK_NAMES)) {
    if (matchesSearchQuery(label, query) || matchesSearchQuery(catKey, query)) {
      const count = categoryCounts.get(catKey) || 0;
      categorySuggestions.push({
        type: 'category',
        id: `cat_${catKey}`,
        title: label,
        subtitle: `${count} ta mahsulot`,
        category: catKey,
        count,
        query: label,
      });
    }
  }

  return {
    products: productSuggestions,
    brands: brandSuggestions.slice(0, 3),
    categories: categorySuggestions.slice(0, 3),
    totalMatches: matchingProducts.length,
  };
}

export interface SearchProductsFilter {
  category?: string;
  brand?: string;
  brands?: string[]; // Multi-select brand filtering (OR logic across selected brands)
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price_asc' | 'price_desc' | 'name_asc';
  onlyInStock?: boolean;
  limitCount?: number;
  includeDemo?: boolean;
}

/**
 * Searches products by normalized keyword using Firestore queries and client-side tolerance:
 * 1. Checks `searchKeywords` array (`array-contains`)
 * 2. Prefix search on `normalizedName`
 * 3. Enforces strict `productMatchesQuery` filtering so non-matching items are never returned.
 * 4. Applies category, multi-brand OR logic, price range, stock availability, and sorting.
 */
export async function searchProductsByKeyword(
  rawKeyword: string,
  options: SearchProductsFilter = {}
): Promise<ServiceResult<ProductItem[]>> {
  const keyword = rawKeyword.trim();

  // Helper to post-filter and sort any candidate products array
  const applyProductFiltersAndSort = (items: ProductItem[]): ProductItem[] => {
    let result = items;

    // Strict search query match: if keyword exists, discard any non-matching product
    if (keyword) {
      result = result.filter((prod) => productMatchesQuery(prod, keyword));
    }

    // Category filter
    if (options.category && options.category.trim()) {
      const targetCat = options.category.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.category.toLowerCase() === targetCat ||
          p.category.toLowerCase().includes(targetCat)
      );
    }

    // Multi-select brands filter (OR logic across selected brands; single brand fallback)
    const activeBrands = (options.brands && options.brands.length > 0)
      ? options.brands.map((b) => b.toLowerCase().trim()).filter(Boolean)
      : options.brand && options.brand.trim()
        ? [options.brand.toLowerCase().trim()]
        : [];

    if (activeBrands.length > 0) {
      result = result.filter(
        (p) => p.brand && activeBrands.includes(p.brand.toLowerCase().trim())
      );
    }

    // In-stock filter
    if (options.onlyInStock) {
      result = result.filter(
        (p) => p.sellerCount === undefined || p.sellerCount > 0
      );
    }

    // Min price filter
    if (options.minPrice !== undefined && options.minPrice > 0) {
      result = result.filter(
        (p) => p.minPrice !== undefined && p.minPrice >= options.minPrice!
      );
    }

    // Max price filter
    if (options.maxPrice !== undefined && options.maxPrice > 0) {
      result = result.filter(
        (p) => p.minPrice !== undefined && p.minPrice <= options.maxPrice!
      );
    }

    // Sorting
    if (options.sortBy === 'price_asc') {
      result.sort((a, b) => (a.minPrice ?? Infinity) - (b.minPrice ?? Infinity));
    } else if (options.sortBy === 'price_desc') {
      result.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0));
    } else if (options.sortBy === 'name_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    // Limit count
    if (options.limitCount && options.limitCount > 0) {
      result = result.slice(0, options.limitCount);
    }

    return result;
  };

  if (!keyword) {
    const allProducts = await getProducts({
      category: options.category,
      limitCount: options.limitCount,
      includeDemo: options.includeDemo,
    });
    if (allProducts.error) return allProducts;
    return { data: applyProductFiltersAndSort(allProducts.data || []), error: null };
  }

  if (!isFirebaseReady || !firestoreDb) {
    const demoMatches = DEMO_NUKUS_PRODUCTS.filter((prod) =>
      productMatchesQuery(prod, keyword)
    );
    return { data: applyProductFiltersAndSort(demoMatches), error: null };
  }

  try {
    const colRef = collection(firestoreDb, PRODUCTS_COLLECTION);

    // Extract normalized tokens for querying
    const normalizedQuery = normalizeSearchQuery(keyword);
    const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
    const primaryToken = tokens[0] || normalizedQuery || keyword.toLowerCase();

    // Query 1: array-contains on searchKeywords
    // Query 2: prefix search on normalizedName
    const [keywordSnap, nameSnap] = await withTimeout(
      Promise.all([
        getDocs(query(colRef, where('searchKeywords', 'array-contains', primaryToken), limit(50))),
        getDocs(
          query(
            colRef,
            where('normalizedName', '>=', primaryToken),
            where('normalizedName', '<=', primaryToken + '\uf8ff'),
            limit(50)
          )
        ),
      ])
    );

    const productMap = new Map<string, ProductItem>();

    keywordSnap.docs.forEach((docSnap) => {
      productMap.set(docSnap.id, mapDocumentToProduct(docSnap.id, docSnap.data()));
    });

    nameSnap.docs.forEach((docSnap) => {
      productMap.set(docSnap.id, mapDocumentToProduct(docSnap.id, docSnap.data()));
    });

    let results = Array.from(productMap.values());

    // Discard any document from Firestore that doesn't actually match the multi-token query
    results = results.filter((prod) => productMatchesQuery(prod, keyword));

    if (results.length === 0 && options.includeDemo) {
      const matchedDemo = DEMO_NUKUS_PRODUCTS.filter((prod) =>
        productMatchesQuery(prod, keyword)
      );
      results = matchedDemo;
    }

    return { data: applyProductFiltersAndSort(results), error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    if (options.includeDemo) {
      console.warn(
        `[BirQidir Catalog] Firestore searchProducts failed (${code || 'unknown'}). Serving demo products fallback. Error details:`,
        err
      );
      const matchedDemo = DEMO_NUKUS_PRODUCTS.filter((prod) =>
        productMatchesQuery(prod, keyword)
      );
      return { data: applyProductFiltersAndSort(matchedDemo), error: null };
    }
    console.warn(`[BirQidir Catalog] Firestore searchProducts failed (${code || 'unknown'}). Error details:`, err);
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

// ============================================================================
// INVENTORY OFFERS & STORE-PRODUCT LINKING
// ============================================================================

/**
 * Fetches all inventory offers for a specific product, ordered by price ascending.
 */
export async function getOffersForProduct(productId: string): Promise<ServiceResult<InventoryOffer[]>> {
  if (!productId || !productId.trim()) {
    return { data: null, error: 'Mahsulot identifikatori ko‘rsatilmadi.' };
  }

  const cleanProductId = productId.trim();

  if (!isFirebaseReady || !firestoreDb) {
    const offers = DEMO_NUKUS_OFFERS.filter((o) => o.productId === cleanProductId).sort(
      (a, b) => a.price - b.price
    );
    return { data: offers, error: null };
  }

  try {
    const colRef = collection(firestoreDb, OFFERS_COLLECTION);
    const q = query(
      colRef,
      where('productId', '==', cleanProductId),
      orderBy('price', 'asc')
    );
    const snap = await withTimeout(getDocs(q));

    if (snap.empty) {
      return { data: [], error: null };
    }

    const rawOffers = snap.docs.map((docSnap) => mapDocumentToOffer(docSnap.id, docSnap.data()));
    // Deduplicate first so latest version/updatedAt wins
    const deduplicated = deduplicateOffers(rawOffers);
    // Filter out superseded, archived, pending, or non-positive price offers for customer view
    const offers = deduplicated
      .filter((o) => isOfferActiveForCustomer(o))
      .sort((a, b) => a.price - b.price);
    return { data: offers, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    const demoOffers = DEMO_NUKUS_OFFERS.filter(
      (o) => o.productId === cleanProductId && isOfferActiveForCustomer(o)
    ).sort((a, b) => a.price - b.price);
    if (demoOffers.length > 0) {
      console.warn(`[BirQidir Catalog] getOffersForProduct failed for '${cleanProductId}' (${code || 'unknown'}). Serving demo offers. Error details:`, err);
      return { data: demoOffers, error: null };
    }
    console.warn(`[BirQidir Catalog] getOffersForProduct failed for '${cleanProductId}' (${code || 'unknown'}). Error details:`, err);
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Fetches all inventory offers supplied by a specific store.
 */
export async function getOffersByStore(storeId: string): Promise<ServiceResult<InventoryOffer[]>> {
  if (!storeId || !storeId.trim()) {
    return { data: null, error: 'Do‘kon identifikatori ko‘rsatilmadi.' };
  }

  const cleanStoreId = storeId.trim();

  if (!isFirebaseReady || !firestoreDb) {
    const offers = DEMO_NUKUS_OFFERS.filter(
      (o) => o.storeId === cleanStoreId && isOfferActiveForCustomer(o)
    );
    return { data: offers, error: null };
  }

  try {
    const colRef = collection(firestoreDb, OFFERS_COLLECTION);
    const q = query(colRef, where('storeId', '==', cleanStoreId));
    const snap = await withTimeout(getDocs(q));

    if (snap.empty) {
      return { data: [], error: null };
    }

    const rawOffers = snap.docs.map((docSnap) => mapDocumentToOffer(docSnap.id, docSnap.data()));
    // Strictly isolate offers for this storeId (prevents negative matching leakage)
    const storeOffers = rawOffers.filter((o) => o.storeId.trim() === cleanStoreId);
    const deduplicated = deduplicateOffers(storeOffers);
    // Filter active and positive-priced offers
    const offers = deduplicated
      .filter((o) => isOfferActiveForCustomer(o))
      .sort((a, b) => a.price - b.price);
    return { data: offers, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

export interface StoreOfferProductItem extends InventoryOffer {
  product?: ProductItem;
  productName: string;
  productCategory: string;
  productBrand?: string;
  productModel?: string;
  productImage?: string;
}

/**
 * Fetches all active inventory offers for a specific store joined with product catalog metadata.
 * Uses cached product list to avoid N+1 queries on Spark plan.
 */
export async function getStoreOffersWithProducts(
  storeId: string
): Promise<ServiceResult<StoreOfferProductItem[]>> {
  if (!storeId || !storeId.trim()) {
    return { data: null, error: 'Do‘kon identifikatori ko‘rsatilmadi.' };
  }

  const cleanStoreId = storeId.trim();
  const offersRes = await getOffersByStore(cleanStoreId);
  if (offersRes.error) {
    return { data: null, error: offersRes.error };
  }

  const offers = offersRes.data || [];
  if (offers.length === 0) {
    return { data: [], error: null };
  }

  // Load cached products list (Spark TTL cache 2m)
  const allProducts = await getAllProductsCached(true);
  const productMap = new Map<string, ProductItem>();
  for (const prod of allProducts) {
    productMap.set(prod.id, prod);
  }

  const joined: StoreOfferProductItem[] = offers.map((offer) => {
    const product = productMap.get(offer.productId);
    return {
      ...offer,
      product,
      productName: product ? product.name : `Mahsulot (${offer.productId})`,
      productCategory: product ? product.category : 'general',
      productBrand: product?.brand,
      productModel: product?.model,
      productImage: product?.imageUrl,
    };
  });

  return { data: joined, error: null };
}

/**
 * Joins inventory offers for a product with store metadata to construct
 * a unified price-comparison dataset (`StoreProductOffer[]`).
 * Automatically sorts by price ascending (cheapest offer first).
 */
export async function getStoreProductOffers(
  productId: string,
  userCoords?: Coordinates | null
): Promise<ServiceResult<StoreProductOffer[]>> {
  const offersRes = await getOffersForProduct(productId);
  if (offersRes.error) {
    return { data: null, error: offersRes.error };
  }

  const rawOffers = offersRes.data || [];
  // Ensure offers are active for customer view
  const offers = rawOffers.filter((o) => isOfferActiveForCustomer(o));
  if (offers.length === 0) {
    return { data: [], error: null };
  }

  // Extract distinct store IDs
  const distinctStoreIds = Array.from(new Set(offers.map((o) => o.storeId)));

  // Fetch store records
  const storeMap = new Map<string, Store>();

  await Promise.all(
    distinctStoreIds.map(async (sId) => {
      const storeRes = await getStoreById(sId);
      if (storeRes.data) {
        storeMap.set(sId, storeRes.data);
      }
    })
  );

  // Link offers with store data and compute distance if coordinates are present
  // Filter out any offers whose store is not visible to customers (archived or unverified pending)
  const joinedOffers: StoreProductOffer[] = offers
    .filter((offer) => {
      const store = storeMap.get(offer.storeId);
      if (store && !isStoreVisibleToCustomer(store)) return false;
      return true;
    })
    .map((offer) => {
      const store = storeMap.get(offer.storeId);
      let distanceKm: number | undefined = undefined;
      if (userCoords && store?.coordinates && isValidCoordinates(store.coordinates)) {
        distanceKm = calculateHaversineDistance(userCoords, store.coordinates);
      }
      return {
        ...offer,
        storeName: store ? store.name : 'Noma‘lum do‘kon',
        storeCity: store ? store.city : 'Nukus',
        storeAddress: store ? store.address : '',
        storePhone: store?.phone,
        storeCoordinates: store?.coordinates,
        isStoreVerified: Boolean(store?.isVerified && !store?.isDemo),
        isDemo: Boolean(offer.isDemo || store?.isDemo),
        distanceKm,
      };
    });

  // Sort ascending by price by default
  joinedOffers.sort((a, b) => a.price - b.price);

  return { data: joinedOffers, error: null };
}

// ============================================================================
// STORE OWNER (MERCHANT) MANAGEMENT SERVICES
// ============================================================================

/**
 * Creates a new Store document in Firestore (/stores/{storeId})
 * 
 * SECURITY INVARIANTS:
 * 1. Requires active Firebase Auth session.
 * 2. Binds ownerId strictly to firebaseAuth.currentUser.uid (never trusts user-provided ownerId).
 * 3. Enforces isVerified: false and status: 'pending' (verification is reserved for administrators).
 * 4. Sets server timestamps for createdAt and updatedAt.
 * 
 * NOTE ON SECURITY RULES:
 * Client-side validation is a defence-in-depth measure. On live Cloud Firestore,
 * this operation will succeed once rules allowing store owners are deployed.
 */
export async function createStore(input: CreateStoreInput): Promise<ServiceResult<Store>> {
  if (!isFirebaseReady || !firestoreDb) {
    return { data: null, error: 'Firebase Firestore tizimi hali sozlanmagan.' };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return { data: null, error: 'Do‘kon yaratish uchun avval tizimga kirishingiz shart.' };
  }

  if (!currentUser.emailVerified) {
    return {
      data: null,
      error: 'Do‘kon arizasini yuborish uchun elektron pochtangiz tasdiqlangan bo‘lishi shart.',
    };
  }

  const validation = validateStoreInput(input);
  if (!validation.isValid) {
    return { data: null, error: validation.error || 'Do‘kon ma’lumotlari noto‘g‘ri kiritildi.' };
  }

  try {
    const colRef = collection(firestoreDb, STORES_COLLECTION);
    const newDocRef = doc(colRef);
    const nowIso = new Date().toISOString();

    const storePayload: Record<string, unknown> = {
      name: input.name.trim(),
      city: input.city.trim(),
      district: input.district?.trim() || null,
      address: input.address.trim(),
      coordinates: input.coordinates,
      category: input.category.trim(),
      phone: (input.phone || '').trim(),
      openingHours: (input.openingHours || '').trim(),
      description: input.description?.trim() || null,
      website: input.website?.trim() || null,
      placeType: input.placeType || 'store',
      ownerId: currentUser.uid,
      ownershipStatus: 'claimed',
      isVerified: false,
      status: 'pending',
      sourceType: 'birqidir',
      isDemo: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(newDocRef, storePayload);

    const createdStore: Store = {
      id: newDocRef.id,
      name: input.name.trim(),
      city: input.city.trim(),
      district: input.district?.trim() || undefined,
      address: input.address.trim(),
      coordinates: input.coordinates,
      category: input.category.trim(),
      phone: (input.phone || '').trim(),
      openingHours: (input.openingHours || '').trim(),
      description: input.description?.trim() || undefined,
      website: input.website?.trim() || undefined,
      placeType: input.placeType || 'store',
      ownerId: currentUser.uid,
      ownershipStatus: 'claimed',
      isVerified: false,
      status: 'pending',
      sourceType: 'birqidir',
      isDemo: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    storeCache.set(createdStore.id, { store: createdStore, timestamp: Date.now() });
    return { data: createdStore, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Updates an existing Store document in Firestore
 * 
 * SECURITY INVARIANTS:
 * 1. Checks that the caller is the authenticated store owner or administrator.
 * 2. Immutable protected fields: ownerId, isVerified, and createdAt CANNOT be altered.
 * 3. Enforces serverTimestamp() on updatedAt.
 */
export async function updateStore(
  storeId: string,
  input: UpdateStoreInput
): Promise<ServiceResult<Store>> {
  if (!storeId || !storeId.trim()) {
    return { data: null, error: 'Do‘kon identifikatori ko‘rsatilmadi.' };
  }

  if (!isFirebaseReady || !firestoreDb) {
    return { data: null, error: 'Firebase Firestore tizimi hali sozlanmagan.' };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return { data: null, error: 'Do‘konni tahrirlash uchun tizimga kirishingiz shart.' };
  }

  const validation = validateUpdateStoreInput(input);
  if (!validation.isValid) {
    return { data: null, error: validation.error || 'Do‘kon ma’lumotlari noto‘g‘ri kiritildi.' };
  }

  const cleanId = storeId.trim();

  try {
    const storeDocRef = doc(firestoreDb, STORES_COLLECTION, cleanId);
    const existingSnap = await getDoc(storeDocRef);

    if (!existingSnap.exists()) {
      return { data: null, error: 'Tahrirlanayotgan do‘kon topilmadi.' };
    }

    const existingData = existingSnap.data() as DocumentData;
    const isOwner = existingData.ownerId === currentUser.uid;

    let isAdmin = false;
    if (!isOwner) {
      const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
      isAdmin = Boolean(tokenResult?.claims?.admin);
    }

    if (!isOwner && !isAdmin) {
      return { data: null, error: 'Ushbu do‘konni tahrirlash uchun sizda yetarli ruxsat yo‘q.' };
    }

    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (input.name !== undefined) updatePayload.name = input.name.trim();
    if (input.city !== undefined) updatePayload.city = input.city.trim();
    if (input.district !== undefined) updatePayload.district = input.district?.trim() || null;
    if (input.address !== undefined) updatePayload.address = input.address.trim();
    if (input.coordinates !== undefined) updatePayload.coordinates = input.coordinates;
    if (input.category !== undefined) updatePayload.category = input.category.trim();
    if (input.phone !== undefined) updatePayload.phone = input.phone.trim();
    if (input.openingHours !== undefined) updatePayload.openingHours = input.openingHours.trim();
    if (input.description !== undefined) updatePayload.description = input.description?.trim() || null;
    if (input.website !== undefined) updatePayload.website = input.website?.trim() || null;
    if (input.status !== undefined) updatePayload.status = input.status;
    if (input.ownershipStatus !== undefined) updatePayload.ownershipStatus = input.ownershipStatus;

    await updateDoc(storeDocRef, updatePayload);
    storeCache.delete(cleanId);

    return await getStoreById(cleanId, { bypassCache: true });
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Creates a new Store directly as an Administrator.
 * 
 * BUSINESS INVARIANTS:
 * 1. Requires caller to have authenticated session with { admin: true } custom claim.
 * 2. Newly created stores are initial unclaimed stores:
 *    - ownerId: null
 *    - ownershipStatus: 'unclaimed'
 *    - isVerified: true (admin authorized)
 *    - status: 'active'
 * 3. Validates geographic coordinates and optional phone/openingHours.
 */
export async function createAdminStore(input: CreateStoreInput): Promise<ServiceResult<Store>> {
  if (!isFirebaseReady || !firestoreDb) {
    return { data: null, error: 'Firebase Firestore tizimi hali sozlanmagan.' };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return { data: null, error: 'Do‘kon yaratish uchun avval tizimga kirishingiz shart.' };
  }

  const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
  const isAdmin = Boolean(tokenResult?.claims?.admin);
  if (!isAdmin) {
    return { data: null, error: 'Do‘kon yaratish uchun faqat administrator ruxsatiga ega bo‘lishingiz lozim.' };
  }

  const validation = validateStoreInput(input, { allowOptionalContact: true });
  if (!validation.isValid) {
    return { data: null, error: validation.error || 'Do‘kon ma’lumotlari noto‘g‘ri kiritildi.' };
  }

  try {
    const colRef = collection(firestoreDb, STORES_COLLECTION);
    const newDocRef = doc(colRef);
    const nowIso = new Date().toISOString();

    const storePayload: Record<string, unknown> = {
      name: input.name.trim(),
      city: input.city.trim(),
      district: input.district?.trim() || null,
      address: input.address.trim(),
      coordinates: input.coordinates,
      category: input.category.trim(),
      phone: input.phone ? input.phone.trim() : '',
      openingHours: input.openingHours ? input.openingHours.trim() : '',
      description: input.description?.trim() || null,
      website: input.website?.trim() || null,
      placeType: input.placeType || 'store',
      ownerId: null,
      ownershipStatus: 'unclaimed',
      isVerified: true,
      status: 'active',
      sourceType: 'birqidir',
      isDemo: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(newDocRef, storePayload);

    const createdStore: Store = {
      id: newDocRef.id,
      name: input.name.trim(),
      city: input.city.trim(),
      district: input.district?.trim() || undefined,
      address: input.address.trim(),
      coordinates: input.coordinates,
      category: input.category.trim(),
      phone: input.phone ? input.phone.trim() : '',
      openingHours: input.openingHours ? input.openingHours.trim() : '',
      description: input.description?.trim() || undefined,
      website: input.website?.trim() || undefined,
      placeType: input.placeType || 'store',
      ownerId: null,
      ownershipStatus: 'unclaimed',
      isVerified: true,
      status: 'active',
      sourceType: 'birqidir',
      isDemo: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    storeCache.set(createdStore.id, { store: createdStore, timestamp: Date.now() });
    return { data: createdStore, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Deactivates an existing store (sets status to 'archived').
 */
export async function deactivateStore(storeId: string): Promise<ServiceResult<Store>> {
  return updateStore(storeId, { status: 'archived' });
}

/**
 * Reactivates an existing store (sets status to 'active').
 */
export async function reactivateStore(storeId: string): Promise<ServiceResult<Store>> {
  return updateStore(storeId, { status: 'active' });
}

/**
 * Resolves an offer across all supported ID formats and legacy schemas:
 * 1. New Canonical ID: `offer|s:...|p:...(|v:...)`
 * 2. Legacy Underscore ID: `offer_storeId_productId(_variantId)`
 * 3. Legacy Random ID: Firestore query where storeId == X and productId == Y, filtered by variantId.
 */
export async function findOfferForStoreProduct(
  storeId: string,
  productId: string,
  variantId?: string | null
): Promise<InventoryOffer | null> {
  if (!isFirebaseReady || !firestoreDb) {
    return null;
  }

  const cleanStoreId = (storeId || '').trim();
  const cleanProductId = (productId || '').trim();
  const cleanVariantId = variantId && variantId.trim() ? variantId.trim() : null;

  if (!cleanStoreId || !cleanProductId) {
    return null;
  }

  try {
    // 1. Try canonical ID (with strict component and variant validation)
    const canonicalId = getCanonicalOfferId(cleanStoreId, cleanProductId, cleanVariantId);
    const canonicalSnap = await getDoc(doc(firestoreDb, OFFERS_COLLECTION, canonicalId));
    if (canonicalSnap && typeof canonicalSnap.exists === 'function' && canonicalSnap.exists()) {
      const data = canonicalSnap.data() || {};
      const matchesStore = String(data.storeId || '').trim() === cleanStoreId;
      const matchesProduct = String(data.productId || '').trim() === cleanProductId;
      const matchesVariant = (String(data.variantId || '').trim() || null) === cleanVariantId;
      if (matchesStore && matchesProduct && matchesVariant) {
        return mapDocumentToOffer(canonicalSnap.id, data);
      }
    }

    // 2. Try legacy underscore ID (with strict component and variant validation)
    const legacyUnderscoreId = getLegacyUnderscoreOfferId(cleanStoreId, cleanProductId, cleanVariantId);
    const legacySnap = await getDoc(doc(firestoreDb, OFFERS_COLLECTION, legacyUnderscoreId));
    if (legacySnap && typeof legacySnap.exists === 'function' && legacySnap.exists()) {
      const data = legacySnap.data() || {};
      const matchesStore = String(data.storeId || '').trim() === cleanStoreId;
      const matchesProduct = String(data.productId || '').trim() === cleanProductId;
      const matchesVariant = (String(data.variantId || '').trim() || null) === cleanVariantId;
      if (matchesStore && matchesProduct && matchesVariant) {
        return mapDocumentToOffer(legacySnap.id, data);
      }
    }

    // 3. Fallback: Query by storeId and productId (locates legacy random IDs)
    const offersColRef = collection(firestoreDb, OFFERS_COLLECTION);
    const q = query(
      offersColRef,
      where('storeId', '==', cleanStoreId),
      where('productId', '==', cleanProductId)
    );
    const querySnap = await getDocs(q);

    if (querySnap && !querySnap.empty && Array.isArray(querySnap.docs)) {
      const matchingOffers = querySnap.docs.map((d) => mapDocumentToOffer(d.id, d.data()));
      const candidates = matchingOffers.filter((o) => {
        const matchesStore = o.storeId.trim() === cleanStoreId;
        const matchesProduct = o.productId.trim() === cleanProductId;
        const matchesVariant = (o.variantId?.trim() || null) === cleanVariantId;
        return matchesStore && matchesProduct && matchesVariant;
      });

      if (candidates.length > 0) {
        // If multiple legacy random documents exist for the same store-product-variant,
        // deduplicate cleanly to select the single authoritative winner
        const deduped = deduplicateOffers(candidates);
        return deduped[0] || null;
      }
    }

    return null;
  } catch (err) {
    console.warn('[OneShop Catalog] findOfferForStoreProduct query warning:', err);
    return null;
  }
}

/**
 * Fetches an InventoryOffer document by its Firestore document ID
 */
export async function getOfferById(offerId: string): Promise<ServiceResult<InventoryOffer>> {
  if (!offerId || !offerId.trim()) {
    return { data: null, error: 'Taklif identifikatori ko‘rsatilmadi.' };
  }

  if (!isFirebaseReady || !firestoreDb) {
    return { data: null, error: 'Firebase Firestore tizimi hali sozlanmagan.' };
  }

  try {
    const cleanId = offerId.trim();
    const snap = await getDoc(doc(firestoreDb, OFFERS_COLLECTION, cleanId));
    if (!snap.exists()) {
      return { data: null, error: 'Taklif topilmadi.' };
    }
    return { data: mapDocumentToOffer(snap.id, snap.data() || {}), error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Creates or updates an InventoryOffer in Firestore (/offers/{offerId})
 * 
 * SECURITY & COMPATIBILITY INVARIANTS:
 * 1. Checks that caller owns the referenced store or is administrator.
 * 2. Before creating a new document, checks whether an offer already exists for (store, product, variant).
 *    If an existing offer exists (even with a legacy random ID or legacy underscore ID):
 *    - Performs IN-PLACE UPDATE on the existing document.
 *    - Strictly prevents creating a duplicate second active document with the same semantics!
 *    - Preserves existing `createdAt` timestamp unchanged.
 *    - Monotonically increments `version` (legacy offers without version default to 1, transitioning to 2).
 * 3. If no existing offer exists:
 *    - Creates a new document using the new canonical ID format (`offer|s:...|p:...(|v:...)`).
 *    - Initializes `version: 1`, `createdAt: serverTimestamp()`.
 */
export async function createOffer(input: CreateOfferInput): Promise<ServiceResult<InventoryOffer>> {
  if (!isFirebaseReady || !firestoreDb) {
    return { data: null, error: 'Firebase Firestore tizimi hali sozlanmagan.' };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return { data: null, error: 'Mahsulot narxini qo‘shish uchun tizimga kirishingiz shart.' };
  }

  const validation = validateOfferInput(input);
  if (!validation.isValid) {
    return { data: null, error: validation.error || 'Taklif ma’lumotlari noto‘g‘ri kiritildi.' };
  }

  const cleanStoreId = input.storeId.trim();
  const cleanProductId = input.productId.trim();
  const cleanVariantId = input.variantId?.trim() || undefined;

  try {
    // Verify referenced store exists and caller owns it
    const storeDocRef = doc(firestoreDb, STORES_COLLECTION, cleanStoreId);
    const storeSnap = await getDoc(storeDocRef);

    if (!storeSnap.exists()) {
      return { data: null, error: 'Taklif biriktirilayotgan do‘kon topilmadi.' };
    }

    const storeData = storeSnap.data() as DocumentData;
    const isOwner = storeData.ownerId === currentUser.uid;

    let isAdmin = false;
    if (!isOwner) {
      const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
      isAdmin = Boolean(tokenResult?.claims?.admin);
    }

    if (!isOwner && !isAdmin) {
      return {
        data: null,
        error: 'Siz faqat o‘zingizga tegishli do‘konga mahsulot narxini biriktira olasiz.',
      };
    }

    // Check if an offer already exists (legacy random ID, underscore ID, or canonical ID)
    const existingOffer = await findOfferForStoreProduct(cleanStoreId, cleanProductId, cleanVariantId);
    const availability = input.availability || 'in_stock';
    const nowIso = new Date().toISOString();

    if (existingOffer) {
      // IN-PLACE UPDATE OF EXISTING OFFER:
      // Prevents creating a duplicate second document in Firestore!
      // Preserves existing original createdAt timestamp strictly.
      const existingVersion = typeof existingOffer.version === 'number' ? existingOffer.version : 1;
      const newVersion = existingVersion + 1;
      const existingDocRef = doc(firestoreDb, OFFERS_COLLECTION, existingOffer.id);

      const updatePayload: Record<string, unknown> = {
        price: input.price,
        currency: input.currency || existingOffer.currency || 'UZS',
        availability,
        inStock: availability === 'in_stock',
        warrantyMonths: input.warrantyMonths !== undefined ? input.warrantyMonths : (existingOffer.warrantyMonths ?? null),
        deliveryAvailable: input.deliveryAvailable !== undefined ? input.deliveryAvailable : (existingOffer.deliveryAvailable ?? null),
        notes: input.notes !== undefined ? (input.notes?.trim() || null) : (existingOffer.notes ?? null),
        variantId: cleanVariantId || existingOffer.variantId || null,
        version: newVersion,
        status: input.status || 'active',
        updatedAt: serverTimestamp(),
      };

      await updateDoc(existingDocRef, updatePayload);

      const updatedOffer: InventoryOffer = {
        id: existingOffer.id,
        storeId: cleanStoreId,
        productId: cleanProductId,
        variantId: cleanVariantId || existingOffer.variantId,
        ownerId: existingOffer.ownerId || currentUser.uid,
        price: input.price,
        currency: input.currency || existingOffer.currency || 'UZS',
        availability,
        inStock: availability === 'in_stock',
        warrantyMonths: input.warrantyMonths !== undefined ? input.warrantyMonths : existingOffer.warrantyMonths,
        deliveryAvailable: input.deliveryAvailable !== undefined ? input.deliveryAvailable : existingOffer.deliveryAvailable,
        notes: input.notes !== undefined ? (input.notes?.trim() || undefined) : existingOffer.notes,
        version: newVersion,
        status: input.status || 'active',
        legacyId: existingOffer.legacyId || (!isCanonicalOfferId(existingOffer.id) ? existingOffer.id : undefined),
        isDemo: false,
        createdAt: existingOffer.createdAt || nowIso,
        updatedAt: nowIso,
      };

      return { data: updatedOffer, error: null };
    }

    // No existing offer found: create brand new canonical offer
    const canonicalId = getCanonicalOfferId(cleanStoreId, cleanProductId, cleanVariantId);
    const newOfferRef = doc(firestoreDb, OFFERS_COLLECTION, canonicalId);

    const offerPayload: Record<string, unknown> = {
      storeId: cleanStoreId,
      productId: cleanProductId,
      variantId: cleanVariantId || null,
      ownerId: currentUser.uid,
      price: input.price,
      currency: input.currency || 'UZS',
      availability,
      inStock: availability === 'in_stock',
      warrantyMonths: input.warrantyMonths !== undefined ? input.warrantyMonths : null,
      deliveryAvailable: input.deliveryAvailable !== undefined ? input.deliveryAvailable : null,
      notes: input.notes?.trim() || null,
      version: 1,
      status: input.status || 'active',
      isDemo: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(newOfferRef, offerPayload);

    const createdOffer: InventoryOffer = {
      id: canonicalId,
      storeId: cleanStoreId,
      productId: cleanProductId,
      variantId: cleanVariantId,
      ownerId: currentUser.uid,
      price: input.price,
      currency: input.currency || 'UZS',
      availability,
      inStock: availability === 'in_stock',
      warrantyMonths: input.warrantyMonths,
      deliveryAvailable: input.deliveryAvailable,
      notes: input.notes?.trim() || undefined,
      version: 1,
      status: input.status || 'active',
      isDemo: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return { data: createdOffer, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Creates an Offer Submission by an authenticated merchant (/offerSubmissions/{subId}).
 *
 * Checks if target offer already exists to link targetOfferId and record the baseVersion
 * for safe optimistic concurrency & migration.
 */
export async function createOfferSubmission(
  input: CreateOfferSubmissionInput
): Promise<ServiceResult<OfferSubmission>> {
  if (!isFirebaseReady || !firestoreDb) {
    return { data: null, error: 'Firebase Firestore tizimi hali sozlanmagan.' };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return { data: null, error: 'Taklif arizasini yuborish uchun tizimga kirishingiz shart.' };
  }

  const validation = validateOfferSubmissionInput(input);
  if (!validation.isValid) {
    return { data: null, error: validation.error || 'Taklif arizasi ma’lumotlari noto‘g‘ri kiritildi.' };
  }

  const cleanStoreId = input.storeId.trim();
  const cleanProductId = input.productId.trim();
  const cleanVariantId = input.variantId?.trim() || undefined;

  try {
    const storeDocRef = doc(firestoreDb, STORES_COLLECTION, cleanStoreId);
    const storeSnap = await getDoc(storeDocRef);

    if (!storeSnap.exists()) {
      return { data: null, error: 'Taklif biriktirilayotgan do‘kon topilmadi.' };
    }

    const storeData = storeSnap.data() as DocumentData;
    const isOwner = storeData.ownerId === currentUser.uid;

    let isAdmin = false;
    if (!isOwner) {
      const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
      isAdmin = Boolean(tokenResult?.claims?.admin);
    }

    if (!isOwner && !isAdmin) {
      return {
        data: null,
        error: 'Siz faqat o‘zingizga tegishli do‘konga mahsulot narxi arizasini yubora olasiz.',
      };
    }

    const storeStatus = (storeData.status as StoreStatus) || 'active';
    if (storeStatus !== 'active') {
      return {
        data: null,
        error: 'Faqat faol va tasdiqlangan do‘konlar uchun mahsulot narxi arizasini yuborish mumkin.',
      };
    }

    // Check for duplicate pending submission for same (storeId, productId, variantId)
    const existingPendingQuery = query(
      collection(firestoreDb, OFFER_SUBMISSIONS_COLLECTION),
      where('storeId', '==', cleanStoreId),
      where('productId', '==', cleanProductId),
      where('status', '==', 'pending')
    );
    const pendingSnap = await getDocs(existingPendingQuery).catch(() => null);
    const hasDuplicatePending = pendingSnap?.docs
      ? pendingSnap.docs.some((docSnap) => {
          const d = docSnap.data();
          const docVariant = d.variantId ? String(d.variantId).trim() : null;
          const targetVariant = cleanVariantId || null;
          return docVariant === targetVariant;
        })
      : false;

    if (hasDuplicatePending) {
      return {
        data: null,
        error: 'Ushbu mahsulot uchun arizangiz allaqachon moderator tekshiruvida turibdi.',
      };
    }

    let existingOffer: InventoryOffer | null = null;
    if (input.targetOfferId && input.targetOfferId.trim()) {
      const targetSnap = await getDoc(doc(firestoreDb, OFFERS_COLLECTION, input.targetOfferId.trim()));
      if (targetSnap.exists()) {
        existingOffer = mapDocumentToOffer(targetSnap.id, targetSnap.data() || {});
      }
    }

    if (!existingOffer) {
      existingOffer = await findOfferForStoreProduct(cleanStoreId, cleanProductId, cleanVariantId);
    }

    let baseVersion: number;
    let targetOfferId: string | null = null;

    if (existingOffer) {
      targetOfferId = existingOffer.id;
      // Explicit version migration: legacy offers missing version default to 1
      baseVersion = typeof existingOffer.version === 'number' ? existingOffer.version : 1;
    } else {
      baseVersion = 0;
    }

    const subColRef = collection(firestoreDb, OFFER_SUBMISSIONS_COLLECTION);
    const newSubRef = doc(subColRef);
    const nowIso = new Date().toISOString();
    const availability = input.availability || 'in_stock';

    const submissionPayload: Record<string, unknown> = {
      merchantUid: currentUser.uid,
      merchantEmail: currentUser.email || '',
      storeId: cleanStoreId,
      productId: cleanProductId,
      variantId: cleanVariantId || null,
      targetOfferId,
      version: baseVersion,
      price: input.price,
      currency: input.currency || 'UZS',
      availability,
      warrantyMonths: input.warrantyMonths !== undefined ? input.warrantyMonths : null,
      deliveryAvailable: input.deliveryAvailable !== undefined ? input.deliveryAvailable : null,
      notes: input.notes?.trim() || null,
      status: 'pending',
      adminNotes: null,
      reviewedBy: null,
      reviewedAt: null,
      approvedOfferId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(newSubRef, submissionPayload);

    const createdSubmission: OfferSubmission = {
      id: newSubRef.id,
      merchantUid: currentUser.uid,
      merchantEmail: currentUser.email || '',
      storeId: cleanStoreId,
      productId: cleanProductId,
      variantId: cleanVariantId,
      targetOfferId,
      version: baseVersion,
      price: input.price,
      currency: input.currency || 'UZS',
      availability,
      warrantyMonths: input.warrantyMonths,
      deliveryAvailable: input.deliveryAvailable,
      notes: input.notes?.trim() || undefined,
      status: 'pending',
      adminNotes: null,
      reviewedBy: null,
      reviewedAt: null,
      approvedOfferId: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return { data: createdSubmission, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Reviews (approves or rejects) an Offer Submission by an administrator.
 *
 * BEHAVIOR:
 * - If rejected: sets status: 'rejected' and records admin notes/audit timestamp.
 * - If approved:
 *   1. Checks for target offer (by submission.targetOfferId or multi-tier store+product lookup).
 *   2. If existing offer exists (legacy random ID, underscore ID, or canonical ID):
 *      - Updates existing offer document in place.
 *      - STRICTLY PRESERVES existing `createdAt` timestamp.
 *      - Increments `version`: `(existing.version ?? 1) + 1`.
 *      - Marks approvedOfferId as existing offer document ID.
 *   3. If no existing offer exists:
 *      - Creates new offer document using the new canonical ID format.
 *      - Initializes `version: 1`, `createdAt: serverTimestamp()`.
 *      - Marks approvedOfferId as canonical ID.
 */
export async function reviewOfferSubmission(
  submissionId: string,
  input: ReviewOfferSubmissionInput
): Promise<ServiceResult<OfferSubmission>> {
  if (!submissionId || !submissionId.trim()) {
    return { data: null, error: 'Arizaning identifikatori ko‘rsatilmadi.' };
  }

  if (!isFirebaseReady || !firestoreDb) {
    return { data: null, error: 'Firebase Firestore tizimi hali sozlanmagan.' };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return { data: null, error: 'Arizani ko‘rib chiqish uchun tizimga kirishingiz shart.' };
  }

  const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
  const isAdmin = Boolean(tokenResult?.claims?.admin);
  if (!isAdmin) {
    return { data: null, error: 'Arizalarni tasdiqlash faqat administratorlar uchun ruxsat etilgan.' };
  }

  const validation = validateReviewSubmissionInput(input);
  if (!validation.isValid) {
    return { data: null, error: validation.error || 'Moderatsiya qarori noto‘g‘ri kiritildi.' };
  }

  const cleanSubId = submissionId.trim();

  try {
    const subDocRef = doc(firestoreDb, OFFER_SUBMISSIONS_COLLECTION, cleanSubId);
    const subSnap = await getDoc(subDocRef);

    if (!subSnap.exists()) {
      return { data: null, error: 'Ko‘rib chiqilayotgan taklif arizasi topilmadi.' };
    }

    const subData = subSnap.data() as DocumentData;

    const nowIso = new Date().toISOString();

    if (input.status === 'rejected') {
      const rejectPayload = {
        status: 'rejected',
        adminNotes: input.adminNotes?.trim() || null,
        reviewedBy: currentUser.uid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await updateDoc(subDocRef, rejectPayload);

      const rejectedSubmission: OfferSubmission = {
        id: cleanSubId,
        merchantUid: subData.merchantUid || '',
        merchantEmail: subData.merchantEmail || '',
        storeId: subData.storeId || '',
        productId: subData.productId || '',
        variantId: subData.variantId || undefined,
        targetOfferId: subData.targetOfferId || undefined,
        version: typeof subData.version === 'number' ? subData.version : undefined,
        price: typeof subData.price === 'number' ? subData.price : 0,
        currency: (subData.currency as CurrencyCode) || 'UZS',
        availability: (subData.availability as OfferAvailability) || 'in_stock',
        warrantyMonths: typeof subData.warrantyMonths === 'number' ? subData.warrantyMonths : undefined,
        deliveryAvailable: typeof subData.deliveryAvailable === 'boolean' ? subData.deliveryAvailable : undefined,
        notes: subData.notes || undefined,
        status: 'rejected',
        adminNotes: input.adminNotes?.trim() || null,
        reviewedBy: currentUser.uid,
        reviewedAt: nowIso,
        approvedOfferId: subData.approvedOfferId || undefined,
        createdAt: normalizeDate(subData.createdAt),
        updatedAt: nowIso,
      };

      return {
        data: rejectedSubmission,
        error: null,
      };
    }

    // Status is 'approved'
    let existingOffer: InventoryOffer | null = null;
    if (subData.targetOfferId && typeof subData.targetOfferId === 'string' && subData.targetOfferId.trim()) {
      const targetSnap = await getDoc(doc(firestoreDb, OFFERS_COLLECTION, subData.targetOfferId.trim()));
      if (targetSnap.exists()) {
        existingOffer = mapDocumentToOffer(targetSnap.id, targetSnap.data() || {});
      }
    }

    if (!existingOffer) {
      existingOffer = await findOfferForStoreProduct(
        subData.storeId,
        subData.productId,
        subData.variantId
      );
    }

    let approvedOfferId: string;
    const availability = (subData.availability as OfferAvailability) || 'in_stock';

    if (existingOffer) {
      // Existing offer found: update in place, preserving existing createdAt!
      approvedOfferId = existingOffer.id;
      const existingVersion = typeof existingOffer.version === 'number' ? existingOffer.version : 1;
      const nextVersion = existingVersion + 1;

      const offerDocRef = doc(firestoreDb, OFFERS_COLLECTION, existingOffer.id);
      const updatePayload: Record<string, unknown> = {
        price: subData.price,
        currency: subData.currency || existingOffer.currency || 'UZS',
        availability,
        inStock: availability === 'in_stock',
        warrantyMonths: subData.warrantyMonths !== undefined ? subData.warrantyMonths : (existingOffer.warrantyMonths ?? null),
        deliveryAvailable: subData.deliveryAvailable !== undefined ? subData.deliveryAvailable : (existingOffer.deliveryAvailable ?? null),
        notes: subData.notes?.trim() || existingOffer.notes || null,
        variantId: subData.variantId?.trim() || existingOffer.variantId || null,
        version: nextVersion,
        status: 'active',
        updatedAt: serverTimestamp(),
      };

      await updateDoc(offerDocRef, updatePayload);
    } else {
      // Brand new offer: generate new canonical ID
      const canonicalId = getCanonicalOfferId(
        subData.storeId,
        subData.productId,
        subData.variantId
      );
      approvedOfferId = canonicalId;

      const newOfferRef = doc(firestoreDb, OFFERS_COLLECTION, canonicalId);
      const offerPayload: Record<string, unknown> = {
        storeId: subData.storeId,
        productId: subData.productId,
        variantId: subData.variantId?.trim() || null,
        ownerId: subData.merchantUid,
        price: subData.price,
        currency: subData.currency || 'UZS',
        availability,
        inStock: availability === 'in_stock',
        warrantyMonths: subData.warrantyMonths !== undefined ? subData.warrantyMonths : null,
        deliveryAvailable: subData.deliveryAvailable !== undefined ? subData.deliveryAvailable : null,
        notes: subData.notes?.trim() || null,
        version: 1,
        status: 'active',
        isDemo: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(newOfferRef, offerPayload);
    }

    const approvePayload = {
      status: 'approved',
      approvedOfferId,
      adminNotes: input.adminNotes?.trim() || null,
      reviewedBy: currentUser.uid,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await updateDoc(subDocRef, approvePayload);

    const approvedSubmission: OfferSubmission = {
      id: cleanSubId,
      merchantUid: subData.merchantUid || '',
      merchantEmail: subData.merchantEmail || '',
      storeId: subData.storeId || '',
      productId: subData.productId || '',
      variantId: subData.variantId || undefined,
      targetOfferId: subData.targetOfferId || undefined,
      version: typeof subData.version === 'number' ? subData.version : undefined,
      price: typeof subData.price === 'number' ? subData.price : 0,
      currency: (subData.currency as CurrencyCode) || 'UZS',
      availability: (subData.availability as OfferAvailability) || 'in_stock',
      warrantyMonths: typeof subData.warrantyMonths === 'number' ? subData.warrantyMonths : undefined,
      deliveryAvailable: typeof subData.deliveryAvailable === 'boolean' ? subData.deliveryAvailable : undefined,
      notes: subData.notes || undefined,
      status: 'approved',
      adminNotes: input.adminNotes?.trim() || null,
      reviewedBy: currentUser.uid,
      reviewedAt: nowIso,
      approvedOfferId,
      createdAt: normalizeDate(subData.createdAt),
      updatedAt: nowIso,
    };

    return {
      data: approvedSubmission,
      error: null,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Fetches all offer submissions matching optional filters (used for moderation review)
 */
export async function getOfferSubmissions(
  filter: { storeId?: string; status?: OfferSubmissionStatus; merchantUid?: string; limitCount?: number } = {}
): Promise<ServiceResult<OfferSubmission[]>> {
  if (!isFirebaseReady || !firestoreDb) {
    return { data: [], error: null };
  }

  try {
    const colRef = collection(firestoreDb, OFFER_SUBMISSIONS_COLLECTION);
    const constraints: QueryConstraint[] = [];

    if (filter.storeId && filter.storeId.trim()) {
      constraints.push(where('storeId', '==', filter.storeId.trim()));
    }
    if (filter.status) {
      constraints.push(where('status', '==', filter.status));
    }
    if (filter.merchantUid && filter.merchantUid.trim()) {
      constraints.push(where('merchantUid', '==', filter.merchantUid.trim()));
    }
    // Enforce max limit of 25 to satisfy Firestore list security rules
    const effectiveLimit = filter.limitCount && filter.limitCount > 0
      ? Math.min(filter.limitCount, 25)
      : 25;
    constraints.push(limit(effectiveLimit));

    const q = query(colRef, ...constraints);
    const snap = await getDocs(q);

    const submissions = snap.docs.map((docSnap) =>
      mapDocumentToOfferSubmission(docSnap.id, docSnap.data())
    );
    return { data: submissions, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Creates a Product Submission by an authenticated merchant (/productSubmissions/{subId}).
 * Used when a merchant sells a product missing from the global catalog.
 */
export async function createProductSubmission(
  input: CreateProductSubmissionInput
): Promise<ServiceResult<ProductSubmission>> {
  if (!isFirebaseReady || !firestoreDb) {
    return { data: null, error: 'Firebase Firestore tizimi hali sozlanmagan.' };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return { data: null, error: 'Mahsulot arizasini yuborish uchun tizimga kirishingiz shart.' };
  }

  const validation = validateProductSubmissionInput(input);
  if (!validation.isValid) {
    return { data: null, error: validation.error || 'Mahsulot arizasi ma’lumotlari noto‘g‘ri kiritildi.' };
  }

  const cleanStoreId = input.storeId.trim();
  const cleanName = input.name.trim();

  try {
    const storeDocRef = doc(firestoreDb, STORES_COLLECTION, cleanStoreId);
    const storeSnap = await getDoc(storeDocRef);

    if (!storeSnap.exists()) {
      return { data: null, error: 'Mahsulot biriktirilayotgan do‘kon topilmadi.' };
    }

    const storeData = storeSnap.data() as DocumentData;
    const isOwner = storeData.ownerId === currentUser.uid;

    let isAdmin = false;
    if (!isOwner) {
      const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
      isAdmin = Boolean(tokenResult?.claims?.admin);
    }

    if (!isOwner && !isAdmin) {
      return {
        data: null,
        error: 'Siz faqat o‘zingizga tegishli do‘kon nomidan mahsulot arizasini yubora olasiz.',
      };
    }

    const storeStatus = (storeData.status as StoreStatus) || 'active';
    if (storeStatus !== 'active') {
      return {
        data: null,
        error: 'Faqat faol va tasdiqlangan do‘konlar uchun mahsulot arizasini yuborish mumkin.',
      };
    }

    // Check for duplicate pending submission with identical normalized name for this store
    const existingPendingQuery = query(
      collection(firestoreDb, PRODUCT_SUBMISSIONS_COLLECTION),
      where('storeId', '==', cleanStoreId),
      where('status', '==', 'pending')
    );
    const pendingSnap = await getDocs(existingPendingQuery).catch(() => null);
    const targetNormName = normalizeSearchTerm(cleanName);
    const hasDuplicate = pendingSnap?.docs
      ? pendingSnap.docs.some((docSnap) => {
          const d = docSnap.data();
          return normalizeSearchTerm(d.name || '') === targetNormName;
        })
      : false;

    if (hasDuplicate) {
      return {
        data: null,
        error: 'Ushbu mahsulot bo‘yicha arizangiz allaqachon moderator tekshiruvida turibdi.',
      };
    }

    const subColRef = collection(firestoreDb, PRODUCT_SUBMISSIONS_COLLECTION);
    const newSubRef = doc(subColRef);
    const nowIso = new Date().toISOString();

    const submissionPayload: Record<string, unknown> = {
      merchantUid: currentUser.uid,
      merchantEmail: currentUser.email || '',
      storeId: cleanStoreId,
      name: cleanName,
      category: input.category.trim(),
      brand: input.brand?.trim() || null,
      model: input.model?.trim() || null,
      barcode: input.barcode?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      description: input.description?.trim() || null,
      variant: input.variant || null,
      specifications: input.specifications || null,
      proposedPrice: typeof input.proposedPrice === 'number' ? input.proposedPrice : null,
      status: 'pending',
      adminNotes: null,
      reviewedBy: null,
      reviewedAt: null,
      approvedProductId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(newSubRef, submissionPayload);

    const createdSubmission: ProductSubmission = {
      id: newSubRef.id,
      merchantUid: currentUser.uid,
      merchantEmail: currentUser.email || '',
      storeId: cleanStoreId,
      name: cleanName,
      category: input.category.trim(),
      brand: input.brand?.trim() || undefined,
      model: input.model?.trim() || undefined,
      barcode: input.barcode?.trim() || undefined,
      imageUrl: input.imageUrl?.trim() || undefined,
      description: input.description?.trim() || undefined,
      variant: input.variant,
      specifications: input.specifications,
      proposedPrice: typeof input.proposedPrice === 'number' ? input.proposedPrice : undefined,
      status: 'pending',
      adminNotes: null,
      reviewedBy: null,
      reviewedAt: null,
      approvedProductId: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    return { data: createdSubmission, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Fetches all product submissions matching optional filters (used for moderation review and merchant history)
 */
export async function getProductSubmissions(
  filter: { storeId?: string; status?: ProductSubmissionStatus; merchantUid?: string; limitCount?: number } = {}
): Promise<ServiceResult<ProductSubmission[]>> {
  if (!isFirebaseReady || !firestoreDb) {
    return { data: [], error: null };
  }

  try {
    const colRef = collection(firestoreDb, PRODUCT_SUBMISSIONS_COLLECTION);
    const constraints: QueryConstraint[] = [];

    if (filter.storeId && filter.storeId.trim()) {
      constraints.push(where('storeId', '==', filter.storeId.trim()));
    }
    if (filter.status) {
      constraints.push(where('status', '==', filter.status));
    }
    if (filter.merchantUid && filter.merchantUid.trim()) {
      constraints.push(where('merchantUid', '==', filter.merchantUid.trim()));
    }
    // Enforce max limit of 25 to satisfy Firestore list security rules
    const effectiveLimit = filter.limitCount && filter.limitCount > 0
      ? Math.min(filter.limitCount, 25)
      : 25;
    constraints.push(limit(effectiveLimit));

    const q = query(colRef, ...constraints);
    const snap = await getDocs(q);

    const submissions = snap.docs.map((docSnap) =>
      mapDocumentToProductSubmission(docSnap.id, docSnap.data())
    );
    return { data: submissions, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Reviews (approves or rejects) a Product Submission by an administrator.
 *
 * BEHAVIOR:
 * - If rejected: sets status: 'rejected' and records adminNotes, audit timestamp.
 * - If approved:
 *   1. If approvedProductId is provided, links to that product.
 *   2. Otherwise, creates a new product document in /products with search keywords,
 *      normalized name, minPrice, sellerCount = 0.
 *   3. Sets status: 'approved' and links approvedProductId.
 */
export async function reviewProductSubmission(
  submissionId: string,
  input: ReviewProductSubmissionInput
): Promise<ServiceResult<ProductSubmission>> {
  if (!submissionId || !submissionId.trim()) {
    return { data: null, error: 'Arizaning identifikatori ko‘rsatilmadi.' };
  }

  if (!isFirebaseReady || !firestoreDb) {
    return { data: null, error: 'Firebase Firestore tizimi hali sozlanmagan.' };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return { data: null, error: 'Arizani ko‘rib chiqish uchun tizimga kirishingiz shart.' };
  }

  const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
  const isAdmin = Boolean(tokenResult?.claims?.admin);
  if (!isAdmin) {
    return { data: null, error: 'Arizalarni tasdiqlash faqat administratorlar uchun ruxsat etilgan.' };
  }

  const validation = validateReviewSubmissionInput(input);
  if (!validation.isValid) {
    return { data: null, error: validation.error || 'Moderatsiya qarori noto‘g‘ri kiritildi.' };
  }

  const cleanSubId = submissionId.trim();

  try {
    const subDocRef = doc(firestoreDb, PRODUCT_SUBMISSIONS_COLLECTION, cleanSubId);
    const subSnap = await getDoc(subDocRef);

    if (!subSnap.exists()) {
      return { data: null, error: 'Ko‘rib chiqilayotgan mahsulot arizasi topilmadi.' };
    }

    const subData = subSnap.data() as DocumentData;
    const nowIso = new Date().toISOString();

    if (input.status === 'rejected') {
      const rejectPayload = {
        status: 'rejected',
        adminNotes: input.adminNotes?.trim() || null,
        reviewedBy: currentUser.uid,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await updateDoc(subDocRef, rejectPayload);

      const rejectedSubmission: ProductSubmission = {
        id: cleanSubId,
        merchantUid: subData.merchantUid || '',
        merchantEmail: subData.merchantEmail || '',
        storeId: subData.storeId || '',
        name: subData.name || '',
        category: subData.category || '',
        brand: subData.brand || undefined,
        model: subData.model || undefined,
        barcode: subData.barcode || undefined,
        imageUrl: subData.imageUrl || undefined,
        description: subData.description || undefined,
        variant: subData.variant || undefined,
        specifications: subData.specifications || undefined,
        proposedPrice: typeof subData.proposedPrice === 'number' ? subData.proposedPrice : undefined,
        status: 'rejected',
        adminNotes: input.adminNotes?.trim() || null,
        reviewedBy: currentUser.uid,
        reviewedAt: nowIso,
        approvedProductId: subData.approvedProductId || undefined,
        createdAt: normalizeDate(subData.createdAt),
        updatedAt: nowIso,
      };

      return { data: rejectedSubmission, error: null };
    }

    // Status is 'approved'
    let approvedProductId = input.approvedProductId?.trim();

    if (!approvedProductId) {
      // Create new global product in /products
      const prodColRef = collection(firestoreDb, PRODUCTS_COLLECTION);
      const newProdRef = doc(prodColRef);
      approvedProductId = newProdRef.id;

      const keywords = generateSearchKeywords(
        subData.name || '',
        subData.category || '',
        subData.brand || '',
        subData.barcode || ''
      );

      const productPayload: Record<string, unknown> = {
        name: subData.name,
        category: subData.category,
        brand: subData.brand || null,
        model: subData.model || null,
        barcode: subData.barcode || null,
        imageUrl: subData.imageUrl || null,
        description: subData.description || null,
        searchKeywords: keywords,
        minPrice: typeof subData.proposedPrice === 'number' ? subData.proposedPrice : 0,
        sellerCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(newProdRef, productPayload);
    }

    const approvePayload = {
      status: 'approved',
      approvedProductId,
      adminNotes: input.adminNotes?.trim() || null,
      reviewedBy: currentUser.uid,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await updateDoc(subDocRef, approvePayload);

    const approvedSubmission: ProductSubmission = {
      id: cleanSubId,
      merchantUid: subData.merchantUid || '',
      merchantEmail: subData.merchantEmail || '',
      storeId: subData.storeId || '',
      name: subData.name || '',
      category: subData.category || '',
      brand: subData.brand || undefined,
      model: subData.model || undefined,
      barcode: subData.barcode || undefined,
      imageUrl: subData.imageUrl || undefined,
      description: subData.description || undefined,
      variant: subData.variant || undefined,
      specifications: subData.specifications || undefined,
      proposedPrice: typeof subData.proposedPrice === 'number' ? subData.proposedPrice : undefined,
      status: 'approved',
      adminNotes: input.adminNotes?.trim() || null,
      reviewedBy: currentUser.uid,
      reviewedAt: nowIso,
      approvedProductId,
      createdAt: normalizeDate(subData.createdAt),
      updatedAt: nowIso,
    };

    return { data: approvedSubmission, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Updates an existing InventoryOffer in Firestore
 * 
 * SECURITY INVARIANTS:
 * 1. Checks that caller is the owner of the offer or administrator.
 * 2. Immutable fields: storeId, productId, and ownerId CANNOT be modified.
 * 3. Enforces serverTimestamp() on updatedAt.
 */
export async function updateOffer(
  offerId: string,
  input: UpdateOfferInput
): Promise<ServiceResult<InventoryOffer>> {
  if (!offerId || !offerId.trim()) {
    return { data: null, error: 'Taklif identifikatori ko‘rsatilmadi.' };
  }

  if (!isFirebaseReady || !firestoreDb) {
    return { data: null, error: 'Firebase Firestore tizimi hali sozlanmagan.' };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return { data: null, error: 'Taklifni yangilash uchun tizimga kirishingiz shart.' };
  }

  const validation = validateUpdateOfferInput(input);
  if (!validation.isValid) {
    return { data: null, error: validation.error || 'Taklif ma’lumotlari noto‘g‘ri kiritildi.' };
  }

  const cleanOfferId = offerId.trim();

  try {
    const offerDocRef = doc(firestoreDb, OFFERS_COLLECTION, cleanOfferId);
    const existingSnap = await getDoc(offerDocRef);

    if (!existingSnap.exists()) {
      return { data: null, error: 'Yangilanayotgan taklif topilmadi.' };
    }

    const existingData = existingSnap.data() as DocumentData;
    const isOwner = existingData.ownerId === currentUser.uid;

    let isAdmin = false;
    if (!isOwner) {
      const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
      isAdmin = Boolean(tokenResult?.claims?.admin);
    }

    if (!isOwner && !isAdmin) {
      return { data: null, error: 'Ushbu taklifni o‘zgartirish uchun sizda yetarli ruxsat yo‘q.' };
    }

    const updatePayload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (input.price !== undefined) {
      updatePayload.price = input.price;
    }
    if (input.currency !== undefined) {
      updatePayload.currency = input.currency;
    }
    if (input.availability !== undefined) {
      updatePayload.availability = input.availability;
      updatePayload.inStock = input.availability === 'in_stock';
    }
    if (input.warrantyMonths !== undefined) {
      updatePayload.warrantyMonths = input.warrantyMonths;
    }
    if (input.deliveryAvailable !== undefined) {
      updatePayload.deliveryAvailable = input.deliveryAvailable;
    }
    if (input.notes !== undefined) {
      updatePayload.notes = input.notes?.trim() || null;
    }

    await updateDoc(offerDocRef, updatePayload);

    // Re-fetch updated offer
    const refreshedSnap = await getDoc(offerDocRef);
    return {
      data: mapDocumentToOffer(refreshedSnap.id, refreshedSnap.data() || {}),
      error: null,
    };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Deletes an InventoryOffer document from Firestore
 * 
 * SECURITY INVARIANTS:
 * 1. Requires caller to be the offer's owner or administrator.
 */
export async function deleteOffer(offerId: string): Promise<ServiceResult<void>> {
  if (!offerId || !offerId.trim()) {
    return { data: null, error: 'Taklif identifikatori ko‘rsatilmadi.' };
  }

  if (!isFirebaseReady || !firestoreDb) {
    return { data: null, error: 'Firebase Firestore tizimi hali sozlanmagan.' };
  }

  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    return { data: null, error: 'Taklifni o‘chirish uchun tizimga kirishingiz shart.' };
  }

  const cleanOfferId = offerId.trim();

  try {
    const offerDocRef = doc(firestoreDb, OFFERS_COLLECTION, cleanOfferId);
    const existingSnap = await getDoc(offerDocRef);

    if (!existingSnap.exists()) {
      return { data: undefined, error: null };
    }

    const existingData = existingSnap.data() as DocumentData;
    const isOwner = existingData.ownerId === currentUser.uid;

    let isAdmin = false;
    if (!isOwner) {
      const tokenResult = await currentUser.getIdTokenResult().catch(() => null);
      isAdmin = Boolean(tokenResult?.claims?.admin);
    }

    if (!isOwner && !isAdmin) {
      return { data: null, error: 'Ushbu taklifni o‘chirish uchun sizda yetarli ruxsat yo‘q.' };
    }

    await deleteDoc(offerDocRef);
    return { data: undefined, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}

/**
 * Fetches all stores owned by a specific user UID (used in Merchant Dashboard)
 */
export async function getStoresByOwner(ownerId: string): Promise<ServiceResult<Store[]>> {
  if (!ownerId || !ownerId.trim()) {
    return { data: [], error: null };
  }

  if (!isFirebaseReady || !firestoreDb) {
    return { data: [], error: null };
  }

  try {
    const colRef = collection(firestoreDb, STORES_COLLECTION);
    const q = query(colRef, where('ownerId', '==', ownerId.trim()), limit(25));
    const snap = await getDocs(q);

    const stores = snap.docs.map((docSnap) => mapDocumentToStore(docSnap.id, docSnap.data()));
    return { data: stores, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
}
