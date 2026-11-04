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
} from '@/utils/catalogValidation';

export const STORES_COLLECTION = 'stores';
export const PRODUCTS_COLLECTION = 'products';
export const OFFERS_COLLECTION = 'offers';

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
    status: (data.status as 'active' | 'pending' | 'archived') || (data.isVerified ? 'active' : 'pending'),
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
    price: typeof data.price === 'number' ? data.price : 0,
    currency: (data.currency as CurrencyCode) || 'UZS',
    availability,
    inStock: data.inStock !== undefined ? Boolean(data.inStock) : availability === 'in_stock',
    warrantyMonths: typeof data.warrantyMonths === 'number' ? data.warrantyMonths : undefined,
    deliveryAvailable: typeof data.deliveryAvailable === 'boolean' ? data.deliveryAvailable : undefined,
    notes: data.notes || undefined,
    isDemo: Boolean(data.isDemo),
    createdAt: data.createdAt ? normalizeDate(data.createdAt) : undefined,
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
    if (filter.city) {
      constraints.push(where('city', '==', filter.city));
    }
    if (filter.category) {
      constraints.push(where('category', '==', filter.category));
    }
    if (filter.limitCount && filter.limitCount > 0) {
      constraints.push(limit(filter.limitCount));
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

    const offers = snap.docs.map((docSnap) => mapDocumentToOffer(docSnap.id, docSnap.data()));
    return { data: offers, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    const demoOffers = DEMO_NUKUS_OFFERS.filter((o) => o.productId === cleanProductId).sort(
      (a, b) => a.price - b.price
    );
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
    const offers = DEMO_NUKUS_OFFERS.filter((o) => o.storeId === cleanStoreId);
    return { data: offers, error: null };
  }

  try {
    const colRef = collection(firestoreDb, OFFERS_COLLECTION);
    const q = query(colRef, where('storeId', '==', cleanStoreId));
    const snap = await withTimeout(getDocs(q));

    if (snap.empty) {
      return { data: [], error: null };
    }

    const offers = snap.docs.map((docSnap) => mapDocumentToOffer(docSnap.id, docSnap.data()));
    return { data: offers, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    return { data: null, error: getFirebaseErrorMessage(code) };
  }
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
  // Filter out offers with non-positive or missing prices
  const offers = rawOffers.filter((o) => typeof o.price === 'number' && o.price > 0);
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
  const joinedOffers: StoreProductOffer[] = offers.map((offer) => {
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
      isStoreVerified: store?.isVerified ?? false,
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
 * Creates a new InventoryOffer in Firestore (/offers/{offerId})
 * 
 * SECURITY INVARIANTS:
 * 1. Checks that caller owns the referenced store (store.ownerId === currentUser.uid).
 * 2. Binds offer.ownerId to current authenticated user.
 * 3. Enforces non-negative price, valid currency, and valid availability state.
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

    const offersColRef = collection(firestoreDb, OFFERS_COLLECTION);
    const newOfferRef = doc(offersColRef);
    const nowIso = new Date().toISOString();
    const availability = input.availability || 'in_stock';

    const offerPayload: Record<string, unknown> = {
      storeId: cleanStoreId,
      productId: cleanProductId,
      ownerId: currentUser.uid,
      price: input.price,
      currency: input.currency || 'UZS',
      availability,
      inStock: availability === 'in_stock',
      warrantyMonths: input.warrantyMonths !== undefined ? input.warrantyMonths : null,
      deliveryAvailable: input.deliveryAvailable !== undefined ? input.deliveryAvailable : null,
      notes: input.notes?.trim() || null,
      isDemo: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(newOfferRef, offerPayload);

    const createdOffer: InventoryOffer = {
      id: newOfferRef.id,
      storeId: cleanStoreId,
      productId: cleanProductId,
      ownerId: currentUser.uid,
      price: input.price,
      currency: input.currency || 'UZS',
      availability,
      inStock: availability === 'in_stock',
      warrantyMonths: input.warrantyMonths,
      deliveryAvailable: input.deliveryAvailable,
      notes: input.notes?.trim() || undefined,
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
