/**
 * Availability state of an inventory offer in store
 */
export type OfferAvailability = 'in_stock' | 'out_of_stock' | 'pre_order' | 'on_demand';

/**
 * Currency types supported in the marketplace
 */
export type CurrencyCode = 'UZS' | 'USD';

/**
 * Product variant specifications (storage, RAM, color, size, etc.)
 */
export interface ProductVariantInfo {
  storage?: string; // e.g. "128GB", "256GB"
  ram?: string; // e.g. "6GB", "8GB"
  color?: string; // e.g. "Qora", "Kumushrang", "Ko'k"
  size?: string; // e.g. "15.6 dyuym", "12-talik", "50kg"
}

/**
 * Inventory Offer entity linking a Store with a ProductItem at a specific price point
 */
export interface InventoryOffer {
  id: string;
  storeId: string;
  ownerId?: string; // Firebase Auth UID of store owner (absent on demo fixtures)
  productId: string;
  variantId?: string; // Optional variant identifier (e.g. 'black-128gb')
  price: number; // Non-negative amount (price >= 0)
  currency: CurrencyCode;
  availability: OfferAvailability;
  inStock?: boolean;
  warrantyMonths?: number;
  deliveryAvailable?: boolean;
  notes?: string;
  version?: number; // Monotonically increasing version counter (legacy offers default to 1)
  status?: 'active' | 'archived' | 'pending' | 'superseded'; // Lifecycle status of offer
  isSuperseded?: boolean; // Flag marking superseded offer version
  legacyId?: string; // Reference to original legacy document ID when deduplicated/migrated
  isDemo?: boolean; // Clearly marks test/demo fixtures
  createdAt?: string;
  updatedAt: string;
}

/**
 * Product Item catalog entity
 */
export interface ProductItem {
  id: string;
  name: string;
  normalizedName: string; // Lowercase, trimmed, punctuation-stripped for search matching
  searchKeywords: string[]; // Tokenized search keywords for array-contains queries
  category: string;
  brand?: string;
  model?: string; // Standard model code or identifier (e.g. "Galaxy A24", "HP 15")
  barcode?: string;
  imageUrl?: string;
  description?: string;
  variant?: ProductVariantInfo; // Specific variant specs to prevent incorrect product merging
  specifications?: Record<string, string>; // Technical specifications dictionary
  // Denormalized/cached aggregations for instant catalog sorting:
  minPrice?: number;
  maxPrice?: number;
  sellerCount?: number;
  isDemo?: boolean; // Clearly marks test/demo fixtures
  createdAt: string;
  updatedAt: string;
}

/**
 * Enriched offer view joined with Store metadata for UI comparison displays
 */
export interface StoreProductOffer extends InventoryOffer {
  storeName: string;
  storeCity: string;
  storeAddress: string;
  storePhone?: string;
  storeCoordinates?: {
    lat: number;
    lng: number;
  };
  isStoreVerified?: boolean;
  isDemo?: boolean;
  distanceKm?: number;
}

/**
 * Input for creating a new product catalog document
 */
export interface CreateProductInput {
  name: string;
  category: string;
  brand?: string;
  barcode?: string;
  imageUrl?: string;
  description?: string;
}

/**
 * Input for updating an existing product document
 */
export interface UpdateProductInput {
  name?: string;
  category?: string;
  brand?: string;
  barcode?: string;
  imageUrl?: string;
  description?: string;
  minPrice?: number;
  maxPrice?: number;
  sellerCount?: number;
}

/**
 * Input for creating an inventory offer for a store
 */
export interface CreateOfferInput {
  storeId: string;
  productId: string;
  variantId?: string;
  ownerId?: string; // Automatically bound from authenticated user UID
  price: number;
  currency?: CurrencyCode;
  availability?: OfferAvailability;
  warrantyMonths?: number;
  deliveryAvailable?: boolean;
  notes?: string;
  status?: 'active' | 'archived' | 'pending' | 'superseded';
  isSuperseded?: boolean;
  version?: number;
}

/**
 * Input for updating an existing inventory offer
 * Note: storeId, productId, and ownerId are immutable.
 */
export interface UpdateOfferInput {
  price?: number;
  currency?: CurrencyCode;
  availability?: OfferAvailability;
  warrantyMonths?: number;
  deliveryAvailable?: boolean;
  notes?: string;
  variantId?: string;
  status?: 'active' | 'archived' | 'pending' | 'superseded';
  isSuperseded?: boolean;
  version?: number;
}
