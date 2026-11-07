import type { Coordinates, StoreOperationalStatus } from './store';
import type { ProductVariantInfo, CurrencyCode, OfferAvailability } from './product';

/**
 * Universal approval moderation status for merchant submissions
 */
export type SubmissionApprovalStatus = 'pending' | 'approved' | 'rejected';

export type StoreApplicationStatus = 'pending' | 'approved' | 'rejected';
export type ProductSubmissionStatus = 'pending' | 'approved' | 'rejected';
export type OfferSubmissionStatus = 'pending' | 'approved' | 'rejected';

/**
 * Store Application entity (/storeApplications/{appId})
 * Submitted by authenticated merchants to open a new store on BirQidir.
 * Upon approval by an administrator, an active store is published to /stores.
 */
export interface StoreApplication {
  id: string;
  applicantUid: string; // Authenticated Merchant UID
  applicantEmail: string; // Authenticated Merchant Email
  name: string;
  city: string; // e.g., 'Nukus', 'Xo‘jayli', 'Qo‘ng‘irot'
  district?: string;
  address: string;
  coordinates: Coordinates;
  category: string;
  phone: string;
  openingHours: string;
  description?: string;
  website?: string;
  placeType?: 'store' | 'service' | 'pharmacy' | 'workshop' | 'market';
  // Moderation lifecycle fields
  status: StoreApplicationStatus;
  adminNotes?: string | null; // Reason for rejection or admin instruction
  reviewedBy?: string | null; // Admin UID who approved/rejected
  reviewedAt?: string | null; // ISO 8601 timestamp
  approvedStoreId?: string | null; // Resulting /stores/{id} document ID if approved
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

/**
 * Input for creating a new store application by a merchant
 */
export interface CreateStoreApplicationInput {
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
 * Admin input for reviewing/approving/rejecting a store application
 */
export interface ReviewStoreApplicationInput {
  status: 'approved' | 'rejected';
  adminNotes?: string;
}

/**
 * Product Submission entity (/productSubmissions/{subId})
 * Submitted by merchants when a product they sell is missing from the global catalog.
 * Upon approval by an administrator, the item is created in /products.
 */
export interface ProductSubmission {
  id: string;
  merchantUid: string; // Merchant UID requesting catalog addition
  merchantEmail: string;
  storeId: string; // Merchant store associated with this product
  name: string;
  category: string;
  brand?: string;
  model?: string;
  barcode?: string;
  imageUrl?: string;
  description?: string;
  variant?: ProductVariantInfo; // Standardized variant info (storage, ram, color, size)
  specifications?: Record<string, string>; // Technical specs dictionary
  proposedPrice?: number; // Optional initial price context for admin review
  // Moderation lifecycle fields
  status: ProductSubmissionStatus;
  adminNotes?: string | null;
  reviewedBy?: string | null; // Admin UID
  reviewedAt?: string | null; // ISO 8601 timestamp
  approvedProductId?: string | null; // Resulting /products/{id} document ID if approved
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

/**
 * Input for submitting a new product suggestion by a merchant
 */
export interface CreateProductSubmissionInput {
  storeId: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  barcode?: string;
  imageUrl?: string;
  description?: string;
  variant?: ProductVariantInfo;
  specifications?: Record<string, string>;
  proposedPrice?: number;
}

/**
 * Admin input for reviewing a product submission
 */
export interface ReviewProductSubmissionInput {
  status: 'approved' | 'rejected';
  adminNotes?: string;
  approvedProductId?: string; // Can link to existing product or newly created product ID
}

/**
 * Inventory Offer Submission entity (/offerSubmissions/{subId})
 * Submitted by merchants to link a specific product with their verified store at a price.
 * Upon approval by an administrator, it is published to the live /offers collection.
 */
export interface OfferSubmission {
  id: string;
  merchantUid: string;
  merchantEmail: string;
  storeId: string; // Must belong to authenticated merchant
  productId: string; // Target approved /products/{id}
  variantId?: string; // Optional variant identifier
  targetOfferId?: string | null; // Points to existing offer if updating
  version?: number; // Base version of the existing offer being modified (legacy defaults to 1)
  price: number; // Non-negative amount (price >= 0)
  currency: CurrencyCode; // 'UZS' | 'USD'
  availability: OfferAvailability; // 'in_stock' | 'out_of_stock' | 'pre_order' | 'on_demand'
  warrantyMonths?: number;
  deliveryAvailable?: boolean;
  notes?: string;
  // Moderation lifecycle fields
  status: OfferSubmissionStatus;
  adminNotes?: string | null;
  reviewedBy?: string | null; // Admin UID
  reviewedAt?: string | null; // ISO 8601 timestamp
  approvedOfferId?: string | null; // Resulting /offers/{id} document ID if approved
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
}

/**
 * Input for submitting a new inventory offer by a merchant
 */
export interface CreateOfferSubmissionInput {
  storeId: string;
  productId: string;
  variantId?: string;
  targetOfferId?: string;
  version?: number;
  price: number;
  currency?: CurrencyCode;
  availability?: OfferAvailability;
  warrantyMonths?: number;
  deliveryAvailable?: boolean;
  notes?: string;
}

/**
 * Admin input for reviewing an inventory offer submission
 */
export interface ReviewOfferSubmissionInput {
  status: 'approved' | 'rejected';
  adminNotes?: string;
  approvedOfferId?: string;
}

export type { StoreOperationalStatus };

