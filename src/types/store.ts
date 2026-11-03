/**
 * Geographic coordinates representation
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Origin source of the place/store
 */
export type PlaceSourceType = 'birqidir' | 'openstreetmap';

export type StoreStatus = 'active' | 'pending' | 'archived';

export type GeolocationErrorType =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NOT_SUPPORTED'
  | 'INSECURE_CONTEXT';

export type StoreType = Store;

/**
 * Store entity in BirQidir marketplace
 */
export interface Store {
  id: string;
  ownerId?: string; // Firebase Auth UID of store owner (absent on demo & OSM fixtures)
  name: string;
  city: string; // e.g., 'Nukus', 'Xo‘jayli', 'Qo‘ng‘irot'
  district?: string; // e.g., 'Nukus shahri', 'Xo‘jayli tumani', 'Beruniy tumani'
  address: string;
  coordinates: Coordinates;
  category: string;
  phone: string;
  openingHours: string;
  isVerified?: boolean;
  status?: StoreStatus; // 'active' | 'pending' | 'archived'
  isDemo?: boolean;
  sourceType?: PlaceSourceType; // 'birqidir' | 'openstreetmap'
  osmId?: string; // Unique OSM Node/Way/Relation ID for deduplication
  website?: string;
  placeType?: 'store' | 'service' | 'pharmacy' | 'workshop' | 'market';
  description?: string;
  metadata?: {
    importedAt?: string;
    osmLicense?: string;
    osmTags?: Record<string, string>;
  };
  createdAt: string;
  updatedAt: string;
  distanceKm?: number;
  // Product search matching metadata:
  matchedOffer?: StoreProductOfferMatch;
  isCheapest?: boolean;
  isClosest?: boolean;
}

/**
 * Product offer match details attached to a Store when searching by product
 */
export interface StoreProductOfferMatch {
  productId: string;
  productName: string;
  price: number;
  currency: string;
  availability: string;
  inStock: boolean;
  warrantyMonths?: number;
  deliveryAvailable?: boolean;
  isDemo?: boolean;
}

/**
 * Input for creating a new store document
 * Note: ownerId is automatically bound to the authenticated user's UID on write.
 * isVerified is intentionally excluded (can only be granted by administrators).
 */
export interface CreateStoreInput {
  name: string;
  city: string;
  district?: string;
  address: string;
  coordinates: Coordinates;
  category: string;
  phone: string;
  openingHours: string;
  description?: string;
  website?: string;
  placeType?: 'store' | 'service' | 'pharmacy' | 'workshop' | 'market';
}

/**
 * Input for updating an existing store document
 * Note: isVerified, ownerId, and createdAt are protected and immutable.
 */
export interface UpdateStoreInput {
  name?: string;
  city?: string;
  district?: string;
  address?: string;
  coordinates?: Coordinates;
  category?: string;
  phone?: string;
  openingHours?: string;
  description?: string;
  website?: string;
  status?: StoreStatus;
}
