import type { Store, InventoryOffer, ProductItem, Coordinates, StoreProductOfferMatch } from '@/types';
import { calculateHaversineDistance, isValidCoordinates } from './geo';

export interface MatchStoresOptions {
  userCoords?: Coordinates | null;
  onlyInStock?: boolean;
}

/**
 * Matches stores with product inventory offers and enriches each matching store with:
 * - `matchedOffer`: specific pricing, currency, availability, warranty, delivery
 * - `distanceKm`: accurate Haversine distance from userCoords (undefined if coords missing/invalid)
 * - `isCheapest`: flags the store(s) with the absolute lowest verified price for this product
 * - `isClosest`: flags the nearest store that has verified coordinates and is in stock (or offers the product)
 * - `isDemo`: explicitly preserves whether the store or offer is a demo fixture vs real verified partner
 * 
 * Invariants:
 * 1. Excludes stores that have NO valid offer for the specified product.
 * 2. Never guesses or assumes prices (offers with missing, NaN or <= 0 prices are ignored for cheapest calculation).
 * 3. Never guesses distances (missing or (0,0) coordinates produce distanceKm = undefined and cannot be marked isClosest).
 * 4. Preserves demo tagging cleanly.
 */
export function matchStoresWithProductOffers(
  stores: Store[],
  offers: InventoryOffer[],
  product?: ProductItem | null,
  options: MatchStoresOptions = {}
): Store[] {
  const { userCoords, onlyInStock = false } = options;

  if (!stores || stores.length === 0 || !offers || offers.length === 0) {
    return [];
  }

  // Filter offers for the specific product (if product is specified)
  const targetOffers = product
    ? offers.filter((o) => o.productId === product.id)
    : offers;

  if (targetOffers.length === 0) {
    return [];
  }

  // Index offers by storeId. If a store has multiple offers for the same product, pick the lowest priced in-stock one.
  const offersByStoreId = new Map<string, InventoryOffer>();

  for (const offer of targetOffers) {
    if (onlyInStock && !offer.inStock && offer.availability !== 'in_stock') {
      continue;
    }

    const existing = offersByStoreId.get(offer.storeId);
    if (!existing) {
      offersByStoreId.set(offer.storeId, offer);
    } else {
      // Pick lower price if available
      if (typeof offer.price === 'number' && offer.price > 0) {
        if (typeof existing.price !== 'number' || existing.price <= 0 || offer.price < existing.price) {
          offersByStoreId.set(offer.storeId, offer);
        }
      }
    }
  }

  // Build matched stores
  const matchedStores: Store[] = [];

  for (const store of stores) {
    const offer = offersByStoreId.get(store.id);
    if (!offer) {
      continue; // Strictly exclude stores without an offer
    }

    const hasValidStoreCoords = isValidCoordinates(store.coordinates);
    const hasValidUserCoords = isValidCoordinates(userCoords);

    let distanceKm: number | undefined = undefined;
    if (hasValidStoreCoords && hasValidUserCoords) {
      distanceKm = calculateHaversineDistance(userCoords, store.coordinates);
    }

    const matchInfo: StoreProductOfferMatch = {
      productId: offer.productId,
      productName: product ? product.name : (store.name ? `${store.name} taklifi` : ''),
      price: typeof offer.price === 'number' && offer.price > 0 ? offer.price : 0,
      currency: offer.currency || 'UZS',
      availability: offer.availability || 'in_stock',
      inStock: offer.inStock !== undefined ? Boolean(offer.inStock) : offer.availability === 'in_stock',
      warrantyMonths: offer.warrantyMonths,
      deliveryAvailable: offer.deliveryAvailable,
      isDemo: Boolean(offer.isDemo || store.isDemo),
    };

    matchedStores.push({
      ...store,
      distanceKm,
      isDemo: Boolean(store.isDemo || offer.isDemo),
      matchedOffer: matchInfo,
      isCheapest: false,
      isClosest: false,
    });
  }

  if (matchedStores.length === 0) {
    return [];
  }

  // Identify lowest positive verified price
  let minPrice = Infinity;
  for (const s of matchedStores) {
    const p = s.matchedOffer?.price;
    if (typeof p === 'number' && p > 0 && p < minPrice) {
      minPrice = p;
    }
  }

  // Identify closest distance with valid coordinates
  let minDistance = Infinity;
  for (const s of matchedStores) {
    if (s.distanceKm !== undefined && s.distanceKm < minDistance) {
      minDistance = s.distanceKm;
    }
  }

  // Assign isCheapest and isClosest badges
  return matchedStores.map((s) => {
    const isCheapest =
      minPrice !== Infinity &&
      s.matchedOffer?.price !== undefined &&
      s.matchedOffer.price === minPrice;

    const isClosest =
      minDistance !== Infinity &&
      s.distanceKm !== undefined &&
      s.distanceKm === minDistance;

    return {
      ...s,
      isCheapest,
      isClosest,
    };
  });
}

/**
 * Filters stores by category (case-insensitive substring match).
 * If category is empty or 'all', returns original list.
 */
export function filterStoresByCategory(stores: Store[], category?: string): Store[] {
  if (!category || category === 'all' || category.trim() === '') {
    return stores;
  }
  const cat = category.toLowerCase().trim();
  return stores.filter((s) => s.category && s.category.toLowerCase().includes(cat));
}

/**
 * Filters stores by in-stock status (only relevant if store has a matchedOffer).
 */
export function filterStoresByInStock(stores: Store[], onlyInStock: boolean): Store[] {
  if (!onlyInStock) {
    return stores;
  }
  return stores.filter((s) => {
    if (!s.matchedOffer) return false;
    return s.matchedOffer.inStock;
  });
}

/**
 * Sorts stores by multiple criteria:
 * - 'distance': closest first (stores with unknown distance pushed to the end)
 * - 'price_asc': cheapest offer first (stores without price pushed to the end)
 * - 'price_desc': most expensive first (stores without price pushed to the end)
 * - 'name': alphabetical order
 */
export function sortStoresAdvanced(
  stores: Store[],
  sortBy: 'distance' | 'price_asc' | 'price_desc' | 'name',
  lang: 'uz' | 'ru' = 'uz'
): Store[] {
  return [...stores].sort((a, b) => {
    if (sortBy === 'distance') {
      if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
      if (a.distanceKm === undefined) return 1;
      if (b.distanceKm === undefined) return -1;
      return a.distanceKm - b.distanceKm;
    }

    if (sortBy === 'price_asc') {
      const priceA = a.matchedOffer?.price;
      const priceB = b.matchedOffer?.price;
      const hasPriceA = typeof priceA === 'number' && priceA > 0;
      const hasPriceB = typeof priceB === 'number' && priceB > 0;
      if (!hasPriceA && !hasPriceB) return 0;
      if (!hasPriceA) return 1;
      if (!hasPriceB) return -1;
      return (priceA as number) - (priceB as number);
    }

    if (sortBy === 'price_desc') {
      const priceA = a.matchedOffer?.price;
      const priceB = b.matchedOffer?.price;
      const hasPriceA = typeof priceA === 'number' && priceA > 0;
      const hasPriceB = typeof priceB === 'number' && priceB > 0;
      if (!hasPriceA && !hasPriceB) return 0;
      if (!hasPriceA) return 1;
      if (!hasPriceB) return -1;
      return (priceB as number) - (priceA as number);
    }

    // Default: name sort
    return a.name.localeCompare(b.name, lang === 'ru' ? 'ru' : 'uz');
  });
}

